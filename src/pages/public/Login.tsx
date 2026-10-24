import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useRef } from 'react';
import { getUserProfile, getStoredCreatorProfile, uploadFileToSupabase, notifyAdmins, invalidateCreatorStorageAssets } from '../../lib/db';
import { buildAdminKycSubmissionNotification, isCreatorProfileComplete } from '../../lib/verification';
import { hasUploadedProfilePhoto, hasUploadedCoverPhoto } from '../../lib/avatar';
import { isSelectedVerifiedCreator } from '../../lib/creatorDirectory';
import { supabase } from '../../lib/supabase';
import { 
  Eye, 
  EyeOff, 
  Camera, 
  UploadCloud, 
  ImagePlus, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Loader2,
  User as UserIcon,
  Sparkles
} from 'lucide-react';

const Login = () => {
  const { user, signInWithGoogle, signInWithFacebook, signInWithEmail, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [infoNotice, setInfoNotice] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  // Mandatory Creator Update State
  const [needsCreatorUpdate, setNeedsCreatorUpdate] = useState(false);
  const [creatorUser, setCreatorUser] = useState<any>(null);
  const [updatingCreator, setUpdatingCreator] = useState(false);

  // Photos & KYC state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');

  const [legalName, setLegalName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dob, setDob] = useState('');
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string>('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'account_suspended') {
      setError('This account has been suspended or deleted by the platform administrator.');
    }
    if (params.get('upload_photos') === 'required') {
      setInfoNotice('Please sign in to upload your creator profile photo and cover photo to complete your account setup.');
    }
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  useEffect(() => {
    const handleNavigation = async () => {
      if (!user) {
        setIsCheckingProfile(false);
        setNeedsCreatorUpdate(false);
        return;
      }

      if (needsCreatorUpdate) {
        return;
      }

      setIsCheckingProfile(true);
      try {
        const profile = await getUserProfile(user.id);
        const role = profile?.role || user.user_metadata?.role;
        
        if (role === 'admin') {
          navigate('/admin', { replace: true });
          return;
        } 

        const isTargetCreator = isSelectedVerifiedCreator(
          profile?.name || user.user_metadata?.name || user.user_metadata?.full_name,
          user.email,
          user.id
        );
        
        if ((role === 'subscriber' || role === 'fan') && !isTargetCreator) {
          navigate('/user', { replace: true });
          return;
        }

        // Creator / Pending Creator / Escort
        const { data: creatorProfile } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const storedLocal = getStoredCreatorProfile(user.id);
        const isCreatorRole = isTargetCreator ||
          role === 'creator' || 
          role === 'pending_creator' || 
          role === 'escort' || 
          Boolean(creatorProfile) ||
          user.user_metadata?.accountType === 'creator' ||
          Boolean(storedLocal);

        if (isCreatorRole) {
          const existingAvatar = profile?.avatar || creatorProfile?.avatar || creatorProfile?.avatar_url || storedLocal?.avatar || storedLocal?.avatar_url;
          const existingCover = creatorProfile?.cover_image || profile?.cover_image || storedLocal?.cover_image;
          const hasPhoto = Boolean(existingAvatar && hasUploadedProfilePhoto(existingAvatar));
          const hasCover = Boolean(existingCover && hasUploadedCoverPhoto(existingCover));

          // If pre-verified target creator, verify profile and cover photos before entering dashboard
          if (isTargetCreator) {
            if (hasPhoto && hasCover) {
              navigate('/dashboard', { replace: true });
              return;
            }

            setCreatorUser({ ...profile, name: profile?.name || user.user_metadata?.name || 'Creator' });
            if (hasPhoto) setAvatarPreview(existingAvatar);
            if (hasCover) setCoverPreview(existingCover);
            setNeedsCreatorUpdate(true);
            setIsCheckingProfile(false);
            return;
          }

          const isComplete = isCreatorProfileComplete(profile, creatorProfile, storedLocal);

          // If creator has completed all required photos and KYC, allow entering dashboard
          if (isComplete) {
            navigate('/dashboard', { replace: true });
            return;
          }

          // Creator is missing required details or identity proofs -> require completion on login
          setCreatorUser({ ...profile, name: profile?.name || user.user_metadata?.name || 'Creator' });
          const existingLegal = profile?.legal_name || creatorProfile?.legal_name || storedLocal?.legalName;
          const existingNatId = profile?.national_id_number || creatorProfile?.national_id_number || storedLocal?.nationalId;
          const existingDobVal = profile?.dob || creatorProfile?.dob || storedLocal?.dob;
          const existingId = profile?.kyc_id_url || creatorProfile?.kyc_id_url || storedLocal?.kyc_id_url;
          const existingSelf = profile?.kyc_selfie_url || creatorProfile?.kyc_selfie_url || storedLocal?.kyc_selfie_url;

          if (hasPhoto) setAvatarPreview(existingAvatar);
          if (hasCover) setCoverPreview(existingCover);
          if (existingLegal) setLegalName(existingLegal);
          if (existingNatId) setNationalId(existingNatId);
          if (existingDobVal) setDob(existingDobVal);
          if (existingId) setIdDocPreview(existingId);
          if (existingSelf) setSelfiePreview(existingSelf);

          setNeedsCreatorUpdate(true);
          setIsCheckingProfile(false);
          return;
        }

        // Generic fallback
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error("Error fetching role for navigation", err);
        navigate('/dashboard', { replace: true });
      } finally {
        setIsCheckingProfile(false);
      }
    };

    handleNavigation();
  }, [user, navigate, needsCreatorUpdate]);

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err?.message || 'Failed to sign in with Google. Please ensure Google provider is enabled in Supabase.');
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      setError('');
      await signInWithFacebook();
    } catch (err: any) {
      console.error("Facebook sign in error:", err);
      setError(err?.message || 'Failed to sign in with Facebook');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      setError('');
      setLoginLoading(true);
      await signInWithEmail(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials and try again.');
      setLoginLoading(false);
    }
  };

  // Image Selection Handlers
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file for your profile photo.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Profile photo exceeds 15MB. Please choose a smaller image.');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file for your cover photo.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Cover photo exceeds 15MB. Please choose a smaller image.');
      return;
    }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleIdDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdDocFile(file);
    const reader = new FileReader();
    reader.onload = () => setIdDocPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    const reader = new FileReader();
    reader.onload = () => setSelfiePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Submission handler for missing creator details
  const handleCreatorDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const isPreVerified = isSelectedVerifiedCreator(
      creatorUser?.name || user.user_metadata?.name || user.user_metadata?.full_name,
      user.email,
      user.id
    );

    // Validation
    if (!avatarPreview && !avatarFile) {
      setError('Please upload your creator profile photo.');
      return;
    }
    if (!coverPreview && !coverFile) {
      setError('Please upload your creator cover photo.');
      return;
    }
    if (!isPreVerified) {
      if (!legalName.trim()) {
        setError('Please provide your full legal name as it appears on your government ID.');
        return;
      }
      if (!nationalId.trim()) {
        setError('Please provide your National ID or Passport number.');
        return;
      }
      if (!dob) {
        setError('Please provide your Date of Birth (must be 18+).');
        return;
      }
      if (!idDocPreview && !idDocFile) {
        setError('Please upload a clear photo of your National ID or Passport.');
        return;
      }
      if (!selfiePreview && !selfieFile) {
        setError('Please upload a verification selfie holding your ID next to your face.');
        return;
      }
    }

    try {
      setError('');
      setUpdatingCreator(true);

      // 1. Upload Avatar
      let finalAvatarUrl = avatarPreview;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const avatarPath = `avatars/${user.id}_avatar_${Date.now()}.${ext}`;
        const uploaded = await uploadFileToSupabase(avatarFile, 'avatars', avatarPath);
        if (uploaded) finalAvatarUrl = uploaded;
      }

      // 2. Upload Cover (using 'covers' bucket)
      let finalCoverUrl = coverPreview;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const coverPath = `covers/${user.id}_cover_${Date.now()}.${coverExt}`;
        const uploadedCover = await uploadFileToSupabase(coverFile, 'covers', coverPath);
        if (uploadedCover) finalCoverUrl = uploadedCover;
      }

      // 3. Upload ID Document
      let finalIdDocUrl = idDocPreview;
      if (idDocFile) {
        const docExt = idDocFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const docPath = `kyc-documents/${user.id}_id_${Date.now()}.${docExt}`;
        const uploadedDoc = await uploadFileToSupabase(idDocFile, 'kyc-documents', docPath);
        if (uploadedDoc) finalIdDocUrl = uploadedDoc;
      }

      // 4. Upload Selfie
      let finalSelfieUrl = selfiePreview;
      if (selfieFile) {
        const selfieExt = selfieFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const selfiePath = `kyc-documents/${user.id}_selfie_${Date.now()}.${selfieExt}`;
        const uploadedSelfie = await uploadFileToSupabase(selfieFile, 'kyc-documents', selfiePath);
        if (uploadedSelfie) finalSelfieUrl = uploadedSelfie;
      }

      const creatorName = creatorUser?.name || user.user_metadata?.name || user.user_metadata?.full_name || 'Creator';

      // 5. Update users table with profile photo, cover photo, creator role and KYC details
      const userUpdatePayload: Record<string, any> = {
        avatar: finalAvatarUrl,
        avatar_url: finalAvatarUrl,
        cover_image: finalCoverUrl,
        role: 'creator',
      };

      if (isPreVerified) {
        userUpdatePayload.is_verified = true;
        userUpdatePayload.kyc_status = 'verified';
        userUpdatePayload.payout_kyc_required = true;
        if (legalName.trim()) userUpdatePayload.legal_name = legalName.trim();
        if (nationalId.trim()) userUpdatePayload.national_id_number = nationalId.trim();
        if (dob) userUpdatePayload.dob = dob;
        if (finalIdDocUrl) userUpdatePayload.kyc_id_url = finalIdDocUrl;
        if (finalSelfieUrl) userUpdatePayload.kyc_selfie_url = finalSelfieUrl;
      } else {
        userUpdatePayload.legal_name = legalName.trim();
        userUpdatePayload.national_id_number = nationalId.trim();
        userUpdatePayload.dob = dob;
        userUpdatePayload.kyc_id_url = finalIdDocUrl;
        userUpdatePayload.kyc_selfie_url = finalSelfieUrl;
        userUpdatePayload.kyc_status = 'pending';
      }

      const { error: userUpdateError } = await supabase.from('users').update(userUpdatePayload).eq('uid', user.id);

      if (userUpdateError) {
        console.warn('Notice updating users table:', userUpdateError.message);
        // Fallback without extended KYC columns
        await supabase.from('users').update({
          avatar: finalAvatarUrl,
          avatar_url: finalAvatarUrl,
          cover_image: finalCoverUrl,
          role: 'creator',
          ...(isPreVerified ? { is_verified: true, kyc_status: 'verified' } : {})
        }).eq('uid', user.id);
      }

      // 6. Update creator_profiles table
      const creatorProfilePayload: Record<string, any> = {
        user_id: user.id,
        avatar: finalAvatarUrl,
        avatar_url: finalAvatarUrl,
        cover_image: finalCoverUrl,
        display_name: creatorName,
        is_active: true,
      };

      if (isPreVerified) {
        creatorProfilePayload.is_verified = true;
        creatorProfilePayload.kyc_status = 'verified';
      }

      const { error: creatorUpdateError } = await supabase.from('creator_profiles').upsert(creatorProfilePayload, { onConflict: 'user_id' });

      if (creatorUpdateError) {
        console.warn('Notice updating creator_profiles table:', creatorUpdateError.message);
        await supabase.from('creator_profiles').update(creatorProfilePayload).eq('user_id', user.id);
      }

      invalidateCreatorStorageAssets(user.id);

      // 7. Update local cache & dispatch profile update
      localStorage.setItem(`tgd_user_avatar_${user.id}`, finalAvatarUrl);
      const local = getStoredCreatorProfile(user.id) || {};
      const updatedProfilePayload = {
        ...local,
        user_id: user.id,
        uid: user.id,
        name: creatorName,
        display_name: creatorName,
        avatar: finalAvatarUrl,
        avatar_url: finalAvatarUrl,
        cover_image: finalCoverUrl,
        role: 'creator',
        status: 'active',
        legalName: legalName.trim(),
        nationalId: nationalId.trim(),
        dob: dob,
        kyc_id_url: finalIdDocUrl,
        kyc_selfie_url: finalSelfieUrl,
        kyc_status: isPreVerified ? 'verified' : 'pending',
        is_verified: isPreVerified ? true : false,
      };
      localStorage.setItem(`tgd_creator_profile_${user.id}`, JSON.stringify(updatedProfilePayload));
      localStorage.setItem('creator_profile_data', JSON.stringify(updatedProfilePayload));

      // Broadcast updates so Discover page & Creator feeds immediately reflect the new card
      window.dispatchEvent(new CustomEvent('profile_updated', {
        detail: updatedProfilePayload
      }));
      window.dispatchEvent(new CustomEvent('creators_updated'));
      window.dispatchEvent(new CustomEvent('posts_updated'));

      // 8. Dispatch notification directly to Platform Admins for KYC review (if not pre-verified)
      if (!isPreVerified) {
        notifyAdmins(buildAdminKycSubmissionNotification({
          name: creatorName,
          nationalId: nationalId.trim(),
          avatar: finalAvatarUrl
        })).catch(() => {});
      }

      // Success -> navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error submitting creator update:', err);
      setError(err?.message || 'Failed to update details. Please check your connection and try again.');
    } finally {
      setUpdatingCreator(false);
    }
  };

  const isTargetCreatorForm = isSelectedVerifiedCreator(
    creatorUser?.name || user?.user_metadata?.name || user?.user_metadata?.full_name,
    user?.email,
    user?.id
  );

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-4 py-12 lg:py-16 order-2 lg:order-1">
        {/* Loading state when verifying account details */}
        {isCheckingProfile ? (
          <div className="w-full max-w-md bg-card/60 border border-border p-8 rounded-3xl shadow-2xl text-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <h3 className="text-lg font-bold">Verifying Creator Status...</h3>
            <p className="text-sm text-muted-foreground">Checking your profile and identity verification details.</p>
          </div>
        ) : needsCreatorUpdate ? (
          /* Mandatory Creator Profile & KYC Form */
          <div className={`w-full max-w-lg bg-card/95 border ${isTargetCreatorForm ? 'border-emerald-500/30' : 'border-red-500/30'} p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10 backdrop-blur-xl animate-in fade-in duration-300`}>
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2 mb-4">
              {isTargetCreatorForm ? (
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Pre-Approved Verified Creator
                </span>
              ) : (
                <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-500" /> Action Required
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  setNeedsCreatorUpdate(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>

            <div className="text-left mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {isTargetCreatorForm ? 'Upload Creator Profile & Cover Photo' : 'Complete Creator Verification'}
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1 leading-relaxed">
                {isTargetCreatorForm ? (
                  <>
                    Welcome, <strong className="text-foreground">{creatorUser?.name || 'Creator'}</strong>! You have been granted a <strong>Verified Creator Badge</strong>. Please upload your Profile Photo and Cover Photo below to complete your setup and appear on Discover.
                  </>
                ) : (
                  <>
                    Welcome back, <strong className="text-foreground">{creatorUser?.name || 'Creator'}</strong>! The platform now requires all creators to attach their profile photos and identity documents before accessing their dashboard.
                  </>
                )}
              </p>
            </div>

            {isTargetCreatorForm && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs p-3.5 rounded-2xl mb-5 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>Photo Setup Required:</strong> Your profile photo and cover photo are required so fans can discover and subscribe to you. National ID & selfie documents can be submitted later before payout withdrawal.
                </span>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-xs sm:text-sm font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreatorDetailsSubmit} className="space-y-5">
              {/* Profile Photo Uploader */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/30 border border-border/80">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-700 hover:border-red-500 overflow-hidden bg-zinc-900/60 flex items-center justify-center transition-colors">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Creator Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-9 h-9 text-zinc-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-110 cursor-pointer"
                    aria-label="Upload profile photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>

                <div className="text-center mt-2.5">
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-foreground">
                    <span>Profile Photo</span>
                    <span className="text-red-500">*</span>
                    {avatarPreview && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 ml-1">
                        <CheckCircle2 className="w-3 h-3" /> Attached
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {avatarPreview ? (
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Change photo
                      </button>
                    ) : (
                      'Upload your creator avatar (shown on feeds & page)'
                    )}
                  </p>
                </div>
              </div>

              {/* Creator Cover Photo */}
              <div className="flex flex-col gap-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Creator Cover Photo <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className={`relative h-32 sm:h-36 w-full overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center ${
                    coverPreview ? 'border-red-500 bg-black/40' : 'border-zinc-700 hover:border-red-500/70 bg-zinc-900/30'
                  }`}
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover Preview" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-zinc-400">
                      <ImagePlus className="w-7 h-7 text-zinc-400" />
                      <span className="text-xs font-bold text-foreground">Upload a cover photo</span>
                    </span>
                  )}
                  {coverPreview && (
                    <span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                      Change cover
                    </span>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                />
                <span className="text-[11px] text-muted-foreground">
                  {coverPreview ? 'Cover photo attached' : 'Choose a photo to display at the top of your creator page.'}
                </span>
              </div>

              {/* Legal Name & National ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-black uppercase text-muted-foreground mb-1.5">
                    Legal Full Name {isTargetCreatorForm ? <span className="text-[10px] text-muted-foreground font-normal">(Optional until payout)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={!isTargetCreatorForm}
                    value={legalName}
                    onChange={e => setLegalName(e.target.value)}
                    placeholder="As shown on ID document"
                    className="w-full bg-input/40 border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:outline-none text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-muted-foreground mb-1.5">
                    ID / Passport Number {isTargetCreatorForm ? <span className="text-[10px] text-muted-foreground font-normal">(Optional until payout)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={!isTargetCreatorForm}
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="e.g. 12345678"
                    className="w-full bg-input/40 border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:outline-none text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-muted-foreground mb-1.5">
                  Date of Birth {isTargetCreatorForm ? <span className="text-[10px] text-muted-foreground font-normal">(Optional until payout)</span> : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  required={!isTargetCreatorForm}
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full bg-input/40 border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:outline-none text-xs sm:text-sm"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">You must be 18+ to operate as a creator</span>
              </div>

              {/* Upload ID Document & Selfie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. National ID Upload */}
                <div
                  onClick={() => idDocInputRef.current?.click()}
                  className="border border-dashed border-zinc-700 hover:border-red-500/70 rounded-2xl p-4 bg-zinc-900/30 relative flex flex-col items-center justify-center text-center transition-all group overflow-hidden min-h-[140px] cursor-pointer"
                >
                  <input
                    ref={idDocInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleIdDocSelect}
                    className="hidden"
                  />
                  {idDocPreview ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <img src={idDocPreview} alt="ID preview" className="w-full h-24 object-cover rounded-xl mb-1.5" />
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ID Attached
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">Click to replace</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-foreground mb-0.5">
                        Upload ID Document {isTargetCreatorForm ? <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span> : <span className="text-red-500">*</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Front & Back of National ID or Passport</div>
                    </>
                  )}
                </div>

                {/* 2. Selfie Upload */}
                <div
                  onClick={() => selfieInputRef.current?.click()}
                  className="border border-dashed border-zinc-700 hover:border-red-500/70 rounded-2xl p-4 bg-zinc-900/30 relative flex flex-col items-center justify-center text-center transition-all group overflow-hidden min-h-[140px] cursor-pointer"
                >
                  <input
                    ref={selfieInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleSelfieSelect}
                    className="hidden"
                  />
                  {selfiePreview ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <img src={selfiePreview} alt="Selfie preview" className="w-full h-24 object-cover rounded-xl mb-1.5" />
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selfie Attached
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">Click to replace</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-foreground mb-0.5">
                        Upload Selfie with ID {isTargetCreatorForm ? <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span> : <span className="text-red-500">*</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Holding ID next to your face clearly</div>
                    </>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={updatingCreator}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl py-3.5 mt-2 transition-all shadow-lg shadow-red-600/30 border border-red-500 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {updatingCreator ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Creator Profile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isTargetCreatorForm ? 'Save & Activate Creator Profile' : 'Save & Submit Verification'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Standard Login Form */
          <div className="w-full max-w-md bg-input/10 border border-border p-8 pb-10 rounded-3xl shadow-2xl relative z-10 backdrop-blur-xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mt-6 mb-2 text-foreground">Welcome Back</h2>
              <p className="text-muted-foreground text-sm">Enter your credentials to access your account</p>
            </div>
            
            {infoNotice && (
              <div className="text-emerald-400 text-xs sm:text-sm font-semibold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center mb-4 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{infoNotice}</span>
              </div>
            )}

            {error && <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-lg text-center mb-4">{error}</div>}

            <div className="grid grid-cols-2 gap-3 mb-6">
               <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 border border-border bg-background py-3 rounded-xl hover:bg-muted font-bold shadow-sm transition-colors text-sm cursor-pointer">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.993 10.993 0 0012 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <span>Google</span>
               </button>
               <button onClick={handleFacebookSignIn} className="w-full flex items-center justify-center gap-2 border border-[#1877F2]/20 bg-[#1877F2]/10 text-[#1877F2] py-3 rounded-xl hover:bg-[#1877F2]/20 font-bold shadow-sm transition-colors text-sm cursor-pointer">
                  <img src="https://i.pinimg.com/736x/98/39/6a/98396a0075923b69838d31ba316051e2.jpg" alt="Facebook" className="w-5 h-5 flex-shrink-0 rounded-full object-cover" />
                  <span>Facebook</span>
               </button>
            </div>

            <div className="relative mb-6">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
               <div className="relative flex justify-center text-sm"><span className="bg-input/10 px-2 text-muted-foreground">or</span></div>
            </div>
            
            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-11 focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <button disabled={loginLoading} className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 mt-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20 cursor-pointer flex items-center justify-center gap-2">
                {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </button>
            </form>
            
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account? <Link to="/signup" className="text-primary font-bold hover:underline">Sign up</Link>
            </div>
          </div>
        )}
      </div>
      
      {/* Creative Image Section */}
      <div className="flex w-full min-h-[65vh] lg:min-h-0 lg:w-[45%] xl:w-[50%] relative items-end p-8 pt-48 lg:p-16 border-t lg:border-t-0 lg:border-l border-border bg-black overflow-hidden order-1 lg:order-2">
        <img 
          src="/pic2.webp" 
          alt="Creative Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 object-top"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
        <div className="relative z-10 max-w-md">
          <div className="w-12 h-1 bg-primary mb-6 rounded-full"></div>
          <p className="text-lg text-muted-foreground">Continue building, growing, and experiencing the finest creative work from the continent.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
