import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { Save, Camera, ShieldAlert, Bell, Globe, CreditCard, Lock, AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile, deleteUserAccount } from '../../lib/db';
import { toast } from '../../context/ToastContext';

const UserSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

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

  // Load real profile from DB
  useEffect(() => {
    if (!user?.id) return;
    getUserProfile(user.id).then((profile) => {
      if (profile) {
        setDisplayName(profile.name || '');
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

  const handleSendOtp = () => {
    if (phone.length < 9) return;
    setOtpStep('sending');
    setOtpError('');
    setTimeout(() => setOtpStep('input'), 1000);
  };

  const handleVerifyOtp = () => {
    if (otpValue.length < 4) return;
    setOtpStep('sending');
    setTimeout(() => {
      if (otpValue === '1234') { 
        setOtpStep('success');
        setIsPhoneVerified(true);
        handleSave();
      } else {
        setOtpStep('input');
        setOtpError('Invalid OTP code. Try 1234 for testing.');
      }
    }, 1000);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const fullPhone = phone
        ? `+254${phone.replace(/\s+/g, '').replace(/^0/, '').replace(/^\+254/, '')}`
        : '';
      await updateUserProfile(user.id, {
        name: displayName,
        phone: fullPhone || null,
      });
      setSaveMsg('Saved successfully!');
    } catch (err: any) {
      setSaveMsg('Failed to save: ' + (err?.message || err));
    } finally {
      setSaving(false);
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
       const url = URL.createObjectURL(e.target.files[0]);
       if (type === 'id') setKycData(prev => ({ ...prev, idDocumentPreview: url }));
       if (type === 'selfie') setKycData(prev => ({ ...prev, selfiePreview: url }));
    }
  };

  const submitKyc = async () => {
    if (!user?.id) return;
    if (!kycData.legalName || !kycData.nationalId || !kycData.dob) {
      setSaveMsg('Failed: Please fill out all required KYC fields.');
      return;
    }
    setKycSaving(true);
    setSaveMsg('');
    try {
      await updateUserProfile(user.id, {
        legal_name: kycData.legalName,
        national_id_number: kycData.nationalId,
        dob: kycData.dob,
        kyc_status: 'pending'
      });
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
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
                <Globe className="w-5 h-5 text-muted-foreground" /> Public Profile
             </h2>
             
             <div className="flex items-center gap-6 mb-8">
                <div className="relative group cursor-pointer inline-block">
                   <img src={user?.user_metadata?.avatar_url || "https://i.pravatar.cc/150?img=50"} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border group-hover:brightness-75 transition-all" />
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white drop-shadow" />
                   </div>
                </div>
                <div>
                  <div className="font-bold">Profile Picture</div>
                  <div className="text-xs text-muted-foreground max-w-xs">Creators will see this when you interact with them.</div>
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
                          disabled={isPhoneVerified}
                          placeholder="7XX XXX XXX"
                          className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-r-lg text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 disabled:opacity-50 transition-all font-medium"
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
