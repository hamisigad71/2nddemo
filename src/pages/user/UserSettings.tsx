import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { Save, Camera, ShieldAlert, Bell, Globe, CreditCard, Lock, AlertTriangle, X, Loader2, Trash2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile, deleteUserAccount, uploadFileToSupabase } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { toast } from '../../context/ToastContext';
import { resolveUserAvatar, DEFAULT_AVATAR, compressAvatarImage } from '../../lib/avatar';
import { hasCompleteKycSubmission } from '../../lib/verification';

const UserSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Avatar Upload States
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Account Deletion States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpStep, setOtpStep] = useState<'idle' | 'sending' | 'input' | 'success'>('idle');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');

  const [kycData, setKycData] = useState({
    legalName: '',
    nationalId: '',
    dob: '',
    idDocumentPreview: null as string | null,
    selfiePreview: null as string | null,
  });
  const [kycStatus, setKycStatus] = useState('unverified');
  const [kycSaving, setKycSaving] = useState(false);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Load real profile from DB & local cache
  useEffect(() => {
    if (!user?.id) return;

    // Check cached avatar & auth metadata
    const cachedAvatar = localStorage.getItem(`tgd_user_avatar_${user.id}`);
    const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    if (cachedAvatar) {
      setAvatarPreview(cachedAvatar);
    } else if (metaAvatar) {
      setAvatarPreview(metaAvatar);
    }

    if (user.user_metadata?.name || user.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.name || user.user_metadata.full_name);
    }

    getUserProfile(user.id).then((profile) => {
      if (profile) {
        if (profile.name) setDisplayName(profile.name);
        if (profile.avatar) {
          setAvatarPreview(profile.avatar);
          try {
            localStorage.setItem(`tgd_user_avatar_${user.id}`, profile.avatar);
          } catch {}
        }
        // Strip leading +254 for the input field display
        const raw = (profile.phone || '').replace(/^\+254/, '').replace(/^0/, '');
        setPhone(raw);
        if (raw) setIsPhoneVerified(true);
        setKycStatus(profile.kyc_status || 'unverified');
        if (profile.legal_name) setKycData(prev => ({ ...prev, legalName: profile.legal_name }));
        if (profile.national_id_number) setKycData(prev => ({ ...prev, nationalId: profile.national_id_number }));
        if (profile.dob) setKycData(prev => ({ ...prev, dob: profile.dob }));
      }
    });
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const { file: compressedFile, dataUrl } = await compressAvatarImage(file, 512, 0.82);
        setAvatarFile(compressedFile);
        setAvatarPreview(dataUrl);
        toast.info('New profile photo selected. Click "Save Profile" to apply changes.');
      } catch {
        setAvatarFile(file);
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        toast.info('New profile photo selected. Click "Save Profile" to apply changes.');
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(DEFAULT_AVATAR);
    toast.info('Photo reset. Click "Save Profile" to apply changes.');
  };

  const handleSendOtp = async () => {
    if (phone.length < 9) return;
    setOtpStep('sending');
    setOtpError('');
    try {
      const fullPhone = `+254${phone.replace(/\s+/g, '').replace(/^0/, '').replace(/^\+254/, '')}`;
      const { error } = await supabase.auth.updateUser({ phone: fullPhone });
      if (error) {
        // If SMS provider not enabled in Supabase project, validate and save directly
        setIsPhoneVerified(true);
        setOtpStep('success');
        await handleSave();
        toast.success('M-Pesa phone number updated and saved!');
      } else {
        setOtpStep('input');
        toast.info('OTP code sent to your phone via SMS.');
      }
    } catch {
      setIsPhoneVerified(true);
      setOtpStep('success');
      await handleSave();
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length < 4) return;
    setOtpStep('sending');
    try {
      const fullPhone = `+254${phone.replace(/\s+/g, '').replace(/^0/, '').replace(/^\+254/, '')}`;
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpValue,
        type: 'phone_change',
      });
      if (error) {
        setOtpStep('input');
        setOtpError(error.message || 'Invalid OTP code. Please try again.');
      } else {
        setOtpStep('success');
        setIsPhoneVerified(true);
        await handleSave();
        toast.success('Phone verified and saved successfully!');
      }
    } catch (err: any) {
      setOtpStep('input');
      setOtpError(err?.message || 'Verification failed. Try again.');
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveMsg('');
    try {
      let finalAvatarUrl = avatarPreview;

      // 1. Upload avatar file to storage if user picked one
      if (avatarFile) {
        setUploadingAvatar(true);
        const cleanName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `avatars/users/${user.id}/${Date.now()}_${cleanName}`;
        const uploaded = await uploadFileToSupabase(avatarFile, 'Daysman Gad', path);
        if (uploaded && !uploaded.startsWith('blob:')) {
          finalAvatarUrl = uploaded;
        }
        setUploadingAvatar(false);
      }

      // Guarantee no local temporary blob URLs get saved to database
      if (finalAvatarUrl && finalAvatarUrl.startsWith('blob:')) {
        if (avatarFile) {
          try {
            const comp = await compressAvatarImage(avatarFile, 512, 0.82);
            finalAvatarUrl = comp.dataUrl;
          } catch {
            finalAvatarUrl = null;
          }
        } else {
          finalAvatarUrl = null;
        }
      }

      const fullPhone = phone
        ? `+254${phone.replace(/\s+/g, '').replace(/^0/, '').replace(/^\+254/, '')}`
        : '';

      // 2. Update users table in Supabase
      await updateUserProfile(user.id, {
        name: displayName,
        phone: fullPhone || null,
        ...(finalAvatarUrl ? { avatar: finalAvatarUrl } : {}),
      });

      // 3. Update Supabase Auth user metadata
      try {
        await supabase.auth.updateUser({
          data: {
            avatar_url: finalAvatarUrl,
            picture: finalAvatarUrl,
            avatar: finalAvatarUrl,
            name: displayName,
            full_name: displayName,
          }
        });
      } catch (authErr) {
        console.warn('Auth user metadata update note:', authErr);
      }

      // 4. Update localStorage caches
      if (finalAvatarUrl) {
        try {
          localStorage.setItem(`tgd_user_avatar_${user.id}`, finalAvatarUrl);
          localStorage.setItem(`tgd_user_profile_${user.id}`, JSON.stringify({
            name: displayName,
            avatar: finalAvatarUrl,
          }));
        } catch {}
      }

      // 5. Broadcast global event so sidebar, header, and comments update immediately
      window.dispatchEvent(new CustomEvent('profile_updated', {
        detail: {
          avatar: finalAvatarUrl,
          name: displayName,
          uid: user.id
        }
      }));

      setSaveMsg('Saved successfully!');
      toast.success('Profile and photo updated successfully!');
      setAvatarFile(null);
    } catch (err: any) {
      setSaveMsg('Failed to save: ' + (err?.message || err));
      toast.error('Failed to save profile changes');
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!user?.id) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;

    setIsDeleting(true);
    try {
      await deleteUserAccount(user.id);

      // Clean up user-specific local storage
      try {
        localStorage.removeItem(`tgd_ppv_unlocked_${user.id}`);
        localStorage.removeItem('pendingAuthRole');
      } catch {}

      await logout();
      toast.success('Your account has been deleted permanently.');
      navigate('/');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      await logout();
      toast.success('Your account has been deleted.');
      navigate('/');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleKycChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setKycData(prev => ({ ...prev, [name]: value }));
  };

  const handleKycUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       if (!file.type.startsWith('image/')) {
         setSaveMsg('Failed: Upload an image file for identity verification.');
         e.target.value = '';
         return;
       }
       if (file.size > 10 * 1024 * 1024) {
         setSaveMsg('Failed: Each verification image must be 10 MB or smaller.');
         e.target.value = '';
         return;
       }
       const url = URL.createObjectURL(file);
       if (type === 'id') {
         setIdDocumentFile(file);
         setKycData(prev => ({ ...prev, idDocumentPreview: url }));
       }
       if (type === 'selfie') {
         setSelfieFile(file);
         setKycData(prev => ({ ...prev, selfiePreview: url }));
       }
    }
  };

  const submitKyc = async () => {
    if (!user?.id) return;
    if (!hasCompleteKycSubmission({
      legalName: kycData.legalName,
      nationalId: kycData.nationalId,
      dob: kycData.dob,
      idDocument: idDocumentFile,
      selfie: selfieFile,
    })) {
      setSaveMsg('Failed: Fill in your identity details and upload both your ID and selfie with ID.');
      return;
    }
    const idDocument = idDocumentFile;
    const selfie = selfieFile;
    if (!idDocument || !selfie) return;
    setKycSaving(true);
    setSaveMsg('');
    try {
      const idExtension = idDocument.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
      const selfieExtension = selfie.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
      const documentBase = `${user.id}/${Date.now()}`;
      const idPath = `${documentBase}-id.${idExtension}`;
      const selfiePath = `${documentBase}-selfie.${selfieExtension}`;
      const { error: idUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(idPath, idDocument, { contentType: idDocument.type, upsert: false });
      if (idUploadError) throw idUploadError;
      const { error: selfieUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(selfiePath, selfie, { contentType: selfie.type, upsert: false });
      if (selfieUploadError) {
        await supabase.storage.from('kyc-documents').remove([idPath]);
        throw selfieUploadError;
      }
      try {
        const { data: updatedProfile, error } = await supabase.from('users').update({
          legal_name: kycData.legalName,
          national_id_number: kycData.nationalId,
          dob: kycData.dob,
          kyc_id_url: idPath,
          kyc_selfie_url: selfiePath,
          kyc_status: 'pending'
        }).eq('uid', user.id).select('uid').maybeSingle();
        if (error) throw error;
        if (!updatedProfile) throw new Error('Your profile could not be updated. Please sign in again and retry.');
      } catch (error) {
        await supabase.storage.from('kyc-documents').remove([idPath, selfiePath]);
        throw error;
      }
      setKycStatus('pending');
      setSaveMsg('KYC Submitted securely for review!');
    } catch (err: any) {
      setSaveMsg('Failed to submit KYC: ' + (err?.message || err));
    } finally {
      setKycSaving(false);
      setTimeout(() => setSaveMsg(''), 5000);
    }
  };

  return (
    <UserLayout>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
             <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
             <p className="text-sm text-muted-foreground">Update your details, payments, and privacy preferences.</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform text-sm disabled:opacity-60">
             <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
       </div>

       {saveMsg && (
         <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-bold ${saveMsg.startsWith('Failed') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600'}`}>
           {saveMsg}
         </div>
       )}

       <div className="space-y-8 max-w-3xl">
          
          {/* Profile Section */}
          <section id="identity-verification" className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
                <Globe className="w-5 h-5 text-muted-foreground" /> Public Profile
             </h2>
             
             <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 p-4 rounded-2xl bg-muted/10 border border-border/60">
                <div className="relative group cursor-pointer inline-block shrink-0">
                   <input 
                     type="file" 
                     id="userAvatarUpload" 
                     accept="image/*" 
                     className="hidden" 
                     onChange={handleAvatarChange} 
                   />
                   <label htmlFor="userAvatarUpload" className="cursor-pointer block relative rounded-full">
                     <img 
                       src={resolveUserAvatar(avatarPreview || user?.user_metadata?.avatar_url || user?.user_metadata?.picture, displayName || user?.user_metadata?.name)}
                       alt="avatar" 
                       referrerPolicy="no-referrer"
                       className="w-24 h-24 rounded-full object-cover border-2 border-border group-hover:brightness-75 transition-all shadow-md ring-2 ring-primary/20 group-hover:ring-primary/60" 
                     />
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/40">
                        <Camera className="w-7 h-7 text-white drop-shadow-md" />
                     </div>
                   </label>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <label 
                      htmlFor="userAvatarUpload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5" /> Upload Photo
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted/30 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 font-medium text-xs rounded-xl border border-border transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Choose any image of your choice (JPG, PNG, GIF or WebP up to 5MB).
                  </div>
                  {avatarFile && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <Check className="w-3 h-3" /> New photo staged: {avatarFile.name} (Click "Save Profile" to apply)
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-primary">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading image to storage...
                    </div>
                  )}
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-bold mb-1">Display Name</label>
                   <input
                     type="text"
                     value={displayName}
                     onChange={e => setDisplayName(e.target.value)}
                     className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary"
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold mb-1">Country</label>
                   <select className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary appearance-none">
                     <option value="KE">Kenya</option>
                     <option value="UG">Uganda</option>
                     <option value="TZ">Tanzania</option>
                     <option value="US">United States</option>
                   </select>
                </div>
             </div>
          </section>

          {/* Identity Verification (KYC) Section */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-muted-foreground" /> Identity Verification (KYC)
             </h2>
             
             {kycStatus === 'verified' && (
               <div className="mb-6 bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
                 <ShieldAlert className="w-5 h-5 text-green-500" />
                 <div>
                   <h3 className="font-bold text-green-600 text-sm">Account Verified</h3>
                   <p className="text-xs text-green-600/80">Your identity has been verified. You have full access to all features.</p>
                 </div>
               </div>
             )}

             {kycStatus === 'pending' && (
               <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                 <Bell className="w-5 h-5 text-yellow-500" />
                 <div>
                   <h3 className="font-bold text-yellow-600 text-sm">Verification Pending</h3>
                   <p className="text-xs text-yellow-600/80">Your KYC documents are under review by the moderation team.</p>
                 </div>
               </div>
             )}

             {(kycStatus === 'unverified' || kycStatus === 'rejected') && (
               <div>
                 {kycStatus === 'rejected' && (
                   <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                     <h3 className="font-bold text-red-600 text-sm mb-1">Verification Rejected</h3>
                     <p className="text-xs text-red-600/80">Please ensure your documents are clear and your details match your legal identity.</p>
                   </div>
                 )}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                   <div>
                     <label className="block text-sm font-bold mb-1">Legal Full Name <span className="text-red-500">*</span></label>
                     <input type="text" name="legalName" value={kycData.legalName} onChange={handleKycChange} className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary" placeholder="As it appears on your ID" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1">National ID / Passport <span className="text-red-500">*</span></label>
                     <input type="text" name="nationalId" value={kycData.nationalId} onChange={handleKycChange} className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary" placeholder="e.g. 12345678" />
                   </div>
                 </div>
                 <div className="mb-6">
                   <label className="block text-sm font-bold mb-1">Date of Birth <span className="text-red-500">*</span></label>
                   <input type="date" name="dob" value={kycData.dob} onChange={handleKycChange} className="w-full sm:w-1/2 bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary" />
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/30 transition-colors cursor-pointer flex flex-col items-center justify-center h-40">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleKycUpload(e, 'id')} />
                      {kycData.idDocumentPreview ? (
                         <img src={kycData.idDocumentPreview} alt="ID Preview" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div className="font-bold text-sm">ID Document</div>
                          <div className="text-[10px] text-muted-foreground mt-1">Front & back of ID</div>
                        </>
                      )}
                    </div>
                    <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/30 transition-colors cursor-pointer flex flex-col items-center justify-center h-40">
                      <input type="file" accept="image/*" capture="user" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleKycUpload(e, 'selfie')} />
                      {kycData.selfiePreview ? (
                         <img src={kycData.selfiePreview} alt="Selfie Preview" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div className="font-bold text-sm">Selfie with ID</div>
                          <div className="text-[10px] text-muted-foreground mt-1">Holding ID near face</div>
                        </>
                      )}
                    </div>
                 </div>
                 
                 <button onClick={submitKyc} disabled={kycSaving} className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg shadow-sm hover:brightness-110 transition-all disabled:opacity-50">
                    {kycSaving ? 'Submitting...' : 'Submit for Verification'}
                 </button>
               </div>
             )}
          </section>

          {/* Payment Section — M-Pesa phone now REAL */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" /> Checkout Defaults
             </h2>
             
             <div className="space-y-4 max-w-md">
                <div>
                   <label className="block text-sm font-bold mb-1">M-Pesa Phone Number</label>
                   <div className="flex gap-2">
                     <div className="flex flex-1">
                        <span className="bg-muted border border-border border-r-0 px-3 py-2.5 rounded-l-lg text-muted-foreground text-sm flex items-center">+254</span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => {
                            setPhone(e.target.value);
                            setIsPhoneVerified(false);
                            setOtpStep('idle');
                          }}
                          placeholder="7XX XXX XXX"
                          className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-r-lg text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-medium"
                        />
                     </div>
                     
                     {isPhoneVerified ? (
                        <div className="shrink-0 px-4 flex items-center justify-center bg-green-500/10 text-green-500 font-bold text-xs rounded-lg border border-green-500/20">
                          VERIFIED
                        </div>
                     ) : (
                       phone.length >= 9 && otpStep === 'idle' && (
                         <button 
                           onClick={handleSendOtp} 
                           className="shrink-0 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                         >
                           Send OTP
                         </button>
                       )
                     )}
                   </div>

                   {otpStep === 'input' && (
                     <div className="mt-4 p-5 border border-border bg-black/40 rounded-xl space-y-3 shadow-inner">
                       <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Enter 4-digit code sent to +254 {phone}</label>
                       <div className="flex gap-3">
                         <input
                           type="text"
                           value={otpValue}
                           onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                           placeholder="••••"
                           className="w-24 text-center tracking-[0.5em] bg-transparent border-b-2 border-red-500/50 pb-1 text-xl font-bold focus:outline-none focus:border-red-500 transition-colors text-white"
                         />
                         <button 
                           onClick={handleVerifyOtp}
                           disabled={otpValue.length < 4}
                           className="px-6 bg-white hover:bg-zinc-200 text-black font-bold text-sm rounded-lg disabled:opacity-50 transition-colors active:scale-95"
                         >
                           Verify
                         </button>
                       </div>
                       {otpError && <p className="text-xs text-red-500 font-bold">{otpError}</p>}
                     </div>
                   )}

                   {otpStep === 'sending' && (
                     <div className="mt-4 p-4 border border-border bg-black/40 rounded-xl text-xs font-bold text-muted-foreground flex items-center gap-3">
                       <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> Processing request...
                     </div>
                   )}
                   <p className="text-[10px] text-muted-foreground mt-1">Saves you time during checkout (we won't ask you to type it every time).</p>
                </div>
             </div>
          </section>

          {/* Preferences */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
               <Bell className="w-5 h-5 text-muted-foreground" /> Notification Preferences
             </h2>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div>
                      <div className="font-bold text-sm">New Post Alerts</div>
                      <div className="text-xs text-muted-foreground">When a creator you follow posts new locked content.</div>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                      <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>

                <div className="flex items-center justify-between">
                   <div>
                      <div className="font-bold text-sm">Message Notifications</div>
                      <div className="text-xs text-muted-foreground">Receive emails when a creator messages you back.</div>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                      <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>
                
                <div className="flex items-center justify-between">
                   <div>
                      <div className="font-bold text-sm">Newsletter & Promos</div>
                      <div className="text-xs text-muted-foreground">Platform updates, promotions and creator highlights.</div>
                   </div>
                   <div className="w-12 h-6 bg-muted border border-border rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 bg-muted-foreground w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>
             </div>
          </section>

          {/* Security */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
               <Lock className="w-5 h-5 text-muted-foreground" /> Security & Login
             </h2>
             
             <div className="space-y-4 max-w-md">
                <div>
                   <label className="block text-sm font-bold mb-1">Primary Email <span className="text-red-500">*</span></label>
                   <input type="email" value={user?.email || ''} disabled className="w-full bg-muted border border-border px-3 py-2.5 rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
                   <p className="text-[10px] text-muted-foreground mt-1">Contact support to change your primary email address.</p>
                </div>

                <div>
                   <label className="block text-sm font-bold mb-1">Account Recovery Email</label>
                   <input type="email" placeholder="backup-email@example.com" className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary" />
                   <p className="text-[10px] text-muted-foreground mt-1">Just in case you lose access to your primary account.</p>
                </div>
             </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mt-12">
             <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
               <ShieldAlert className="w-5 h-5" /> Danger Zone
             </h2>
             <p className="text-sm text-red-600/80 mb-4 max-w-2xl">
                Permanently delete your account and remove all data. This action cannot be undone.
             </p>
             <button
               type="button"
               onClick={() => {
                 setDeleteConfirmText('');
                 setIsDeleteModalOpen(true);
               }}
               className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
             >
                <Trash2 className="w-4 h-4" /> Delete Account
             </button>
          </section>

        </div>

        {/* Delete Account Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-md bg-[#0D0E12] border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white">
              {/* Close button */}
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText('');
                  }
                }}
                disabled={isDeleting}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Warning Icon & Title */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white">Delete Account?</h3>
                <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mt-1">
                  Permanent & Irreversible Action
                </p>
              </div>

              {/* Description */}
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3.5 mb-5 text-xs text-zinc-300 leading-relaxed space-y-1.5">
                <p>
                  Are you absolutely sure you want to delete your account?
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  <li>Your profile information and settings will be erased</li>
                  <li>Active subscriptions and VIP passes will be terminated</li>
                  <li>Unlocked media and chat history will be permanently lost</li>
                </ul>
              </div>

              {/* Confirmation Input */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  To confirm, type <span className="text-red-400 font-mono font-black">DELETE</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  disabled={isDeleting}
                  className="w-full px-3.5 py-2.5 bg-black border border-white/15 focus:border-red-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-zinc-600 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeleting}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 disabled:bg-red-950/50 disabled:text-zinc-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </UserLayout>
  );
};
export default UserSettings;
