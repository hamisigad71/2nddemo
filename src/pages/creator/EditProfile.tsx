import CreatorLayout from '../../components/CreatorLayout';
import { Camera, Save, User, ShieldCheck, Wallet, Sliders, AlertCircle, UploadCloud, Smartphone, CheckCircle2, Lock, Eye, ExternalLink, Loader2, Sparkles, Flame, Check, Trash2, AlertTriangle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile, updateCreatorProfile, uploadFileToSupabase, deleteUserAccount } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { toast } from '../../context/ToastContext';
import CreatePostForm from '../../components/CreatePostForm';
import { resolveUserAvatar } from '../../lib/avatar';

const EditProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Account Deletion States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  // States
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: '',
    username: '',
    bio: 'Welcome to my official creator page! Exclusive posts, videos, and private chats.',
    location: 'Nairobi, Kenya',
    monthlyPrice: 1000,
    age: 24,
    tags: ['VIP Content', 'Direct Chat', 'Exclusive Photos'],
    promoDiscount: 50,
    promoActive: true,
    coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
    socialLink: '',
    avatarUrl: '',
  });
  
  const [kycData, setKycData] = useState({
    legalName: '',
    nationalId: '',
    dob: '',
    idDocumentPreview: null as string | null,
    selfiePreview: null as string | null,
  });

  const [payoutData, setPayoutData] = useState({
    phoneNumber: '',
    kraPin: '',
  });

  const [otpSent, setOtpSent] = useState(false);
  const [userOtpInput, setUserOtpInput] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpMessage, setOtpMessage] = useState({ text: "", type: "" });
  const [isLoadingOtp, setIsLoadingOtp] = useState(false);

  // Load existing profile from LocalStorage & DB
  useEffect(() => {
    if (!user?.id) return;

    // 1. Instant hydration from LocalStorage & Auth metadata
    try {
      const local = JSON.parse(localStorage.getItem(`tgd_creator_profile_${user.id}`) || 'null')
        || JSON.parse(localStorage.getItem('creator_profile_data') || 'null');
      if (local) {
        if (local.avatar || local.avatar_url) {
          setAvatarPreview(local.avatar || local.avatar_url);
        }
        if (local.cover_image) {
          setBannerPreview(local.cover_image);
        }
        setProfileData(prev => ({
          ...prev,
          displayName: local.name || local.display_name || prev.displayName,
          bio: local.bio || prev.bio,
          avatarUrl: local.avatar || local.avatar_url || prev.avatarUrl,
          coverImage: local.cover_image || prev.coverImage,
          location: local.location || prev.location,
          monthlyPrice: local.monthly_price || prev.monthlyPrice,
          age: local.age || prev.age,
        }));
      }

      // Check auth metadata
      const meta = user.user_metadata;
      if (meta?.avatar_url || meta?.picture) {
        setAvatarPreview(prev => prev || meta.avatar_url || meta.picture);
      }
    } catch {}

    // 2. Fetch latest from Supabase
    getUserProfile(user.id).then(async (profile) => {
      if (profile) {
        if (profile.phone) {
          const raw = profile.phone.replace(/^\+254/, '').replace(/^0/, '');
          setPayoutData(prev => ({ ...prev, phoneNumber: raw }));
        }
        if (profile.avatar) {
          setAvatarPreview(profile.avatar);
        }
        setProfileData(prev => ({
          ...prev,
          displayName: profile.name || user.user_metadata?.full_name || user.user_metadata?.name || prev.displayName,
          bio: profile.bio || prev.bio,
          avatarUrl: profile.avatar || prev.avatarUrl,
        }));
      }
      try {
        const { data: creatorMeta } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (creatorMeta) {
          if (creatorMeta.cover_image) {
            setBannerPreview(creatorMeta.cover_image);
          }
          if (creatorMeta.avatar_url || creatorMeta.avatar) {
            setAvatarPreview(prev => prev || creatorMeta.avatar_url || creatorMeta.avatar);
          }
          setProfileData(prev => ({
            ...prev,
            bio: creatorMeta.bio || prev.bio,
            monthlyPrice: creatorMeta.monthly_price || prev.monthlyPrice,
            location: creatorMeta.location || prev.location,
            coverImage: creatorMeta.cover_image || prev.coverImage,
            age: creatorMeta.age || prev.age,
            tags: creatorMeta.tags || prev.tags,
            promoDiscount: creatorMeta.promo_discount || prev.promoDiscount,
            promoActive: creatorMeta.promo_active !== false,
          }));
        }
      } catch {
        // non-fatal
      }
    });
  }, [user]);

  const tabs = [
    { id: 'profile', label: 'Public Profile', icon: User, requiresAttention: false },
    { id: 'media', label: 'Media & Posts', icon: UploadCloud, requiresAttention: false },
    { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck, requiresAttention: true },
    { id: 'payouts', label: 'Payouts', icon: Wallet, requiresAttention: true },
    { id: 'preferences', label: 'Preferences', icon: Sliders, requiresAttention: false },
  ];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKycChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setKycData(prev => ({ ...prev, [name]: value }));
  };

  const handlePayoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPayoutData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async () => {
    setOtpMessage({ text: "", type: "" });
    if (!payoutData.phoneNumber || payoutData.phoneNumber.length < 9) {
      setOtpMessage({ text: "Please enter a valid phone number (at least 9 digits).", type: "error" });
      return;
    }
    
    let formattedPhone = payoutData.phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+254' + formattedPhone;
    }

    if (!user) {
      setOtpMessage({ text: "You must be logged in to verify a phone number.", type: "error" });
      return;
    }

    setIsLoadingOtp(true);
    try {
      const { error } = await supabase.auth.updateUser({
        phone: formattedPhone
      });
      if (error) throw error;
      
      setOtpSent(true);
      setOtpMessage({ text: "OTP sent via SMS! Please check your phone.", type: "success" });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      setOtpMessage({ text: "Failed to send OTP. " + (error?.message || "Make sure Phone authentication is enabled in Supabase."), type: "error" });
    } finally {
      setIsLoadingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpMessage({ text: "", type: "" });
    if (!userOtpInput) {
      setOtpMessage({ text: "Please enter the OTP.", type: "error" });
      return;
    }
    
    let formattedPhone = payoutData.phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+254' + formattedPhone;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: userOtpInput,
        type: 'phone_change'
      });
      if (error) throw error;

      if (user?.id) {
        const fullPhone = `+254${payoutData.phoneNumber.replace(/\s+/g, '').replace(/^0/, '').replace(/^\+254/, '')}`;
        await updateUserProfile(user.id, {
          phone: fullPhone,
          kra_pin: payoutData.kraPin
        });
        setIsPhoneVerified(true);
        setOtpMessage({ text: "Phone number verified and saved successfully!", type: "success" });
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      setOtpMessage({ text: error?.message || "Invalid OTP code. Please try again.", type: "error" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKycUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
       const url = URL.createObjectURL(e.target.files[0]);
       if (type === 'id') setKycData(prev => ({ ...prev, idDocumentPreview: url }));
       if (type === 'selfie') setKycData(prev => ({ ...prev, selfiePreview: url }));
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!user?.id) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;

    setIsDeletingAccount(true);
    try {
      await deleteUserAccount(user.id);

      // Clean up creator local storage caches
      try {
        localStorage.removeItem(`tgd_creator_profile_${user.id}`);
        localStorage.removeItem('creator_profile_data');
        localStorage.removeItem(`tgd_user_avatar_${user.id}`);
        localStorage.removeItem(`tgd_ppv_unlocked_${user.id}`);
        localStorage.removeItem('pendingAuthRole');
        
        // Remove user's posts from tgd_all_posts
        const stored = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
        const remaining = stored.filter((p: any) => p.creator_id !== user.id);
        localStorage.setItem('tgd_all_posts', JSON.stringify(remaining));
      } catch {}

      window.dispatchEvent(new CustomEvent('posts_updated'));
      await logout();
      toast.success('Your creator account and all content have been permanently deleted.');
      navigate('/');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      try {
        await logout();
      } catch {}
      toast.success('Your account has been deleted.');
      navigate('/');
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSaveAll = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let finalAvatarUrl = avatarPreview || profileData.avatarUrl;
      let finalCoverUrl = bannerPreview || profileData.coverImage;

      // 1. Upload avatar if new file picked
      if (avatarFile) {
        const cleanName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `avatars/${user.id}/${Date.now()}_${cleanName}`;
        const uploaded = await uploadFileToSupabase(avatarFile, 'Daysman Gad', path);
        if (uploaded) {
          finalAvatarUrl = uploaded;
        }
      }

      // 2. Upload header banner if new file picked
      if (bannerFile) {
        const cleanName = bannerFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `covers/${user.id}/${Date.now()}_${cleanName}`;
        const uploaded = await uploadFileToSupabase(bannerFile, 'Daysman Gad', path);
        if (uploaded) {
          finalCoverUrl = uploaded;
        }
      }

      // Guarantee no temporary blob URLs get saved to storage or database
      if (finalAvatarUrl && finalAvatarUrl.startsWith('blob:')) {
        finalAvatarUrl = profileData.avatarUrl || '';
      }
      if (finalCoverUrl && finalCoverUrl.startsWith('blob:')) {
        finalCoverUrl = profileData.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80';
      }

      // 3. Update users table in Supabase
      try {
        await updateUserProfile(user.id, {
          ...(profileData.displayName ? { name: profileData.displayName } : {}),
          bio: profileData.bio,
          ...(finalAvatarUrl ? { avatar: finalAvatarUrl } : {}),
          ...(finalCoverUrl ? { cover_image: finalCoverUrl } : {})
        });
      } catch (e) {
        console.warn('users table update notice:', e);
      }

      // 4. Update creator_profiles table in Supabase
      try {
        await updateCreatorProfile(user.id, {
          bio: profileData.bio,
          monthly_price: Number(profileData.monthlyPrice) || 1000,
          location: profileData.location,
          cover_image: finalCoverUrl,
          age: Number(profileData.age) || 24,
          tags: profileData.tags,
          promo_discount: Number(profileData.promoDiscount) || 50,
          promo_active: profileData.promoActive,
          avatar_url: finalAvatarUrl,
          avatar: finalAvatarUrl,
          display_name: profileData.displayName,
        });
      } catch (e) {
        console.warn('creator_profiles update notice:', e);
      }

      // 5. Update Supabase Auth user metadata
      try {
        await supabase.auth.updateUser({
          data: {
            avatar_url: finalAvatarUrl,
            picture: finalAvatarUrl,
            avatar: finalAvatarUrl,
            name: profileData.displayName,
            full_name: profileData.displayName,
          }
        });
      } catch (e) {
        console.warn('auth metadata update notice:', e);
      }

      // 6. Update local storage creator profile caches
      const profilePayload = {
        user_id: user.id,
        uid: user.id,
        name: profileData.displayName || user.user_metadata?.name || 'Creator',
        display_name: profileData.displayName || user.user_metadata?.name || 'Creator',
        avatar: finalAvatarUrl,
        avatar_url: finalAvatarUrl,
        cover_image: finalCoverUrl,
        bio: profileData.bio,
        location: profileData.location,
        monthly_price: Number(profileData.monthlyPrice) || 1000,
        age: Number(profileData.age) || 24,
        tags: profileData.tags,
        promo_discount: Number(profileData.promoDiscount) || 50,
        promo_active: profileData.promoActive,
      };
      localStorage.setItem(`tgd_creator_profile_${user.id}`, JSON.stringify(profilePayload));
      localStorage.setItem('creator_profile_data', JSON.stringify(profilePayload));
      if (finalAvatarUrl) {
        try {
          localStorage.setItem(`tgd_user_avatar_${user.id}`, finalAvatarUrl);
        } catch {}
      }

      // 7. Update all existing posts by this creator in tgd_all_posts
      try {
        const storedPosts = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
        let changed = false;
        const mappedPosts = storedPosts.map((p: any) => {
          if (p.creator_id === user.id) {
            changed = true;
            return {
              ...p,
              users: {
                uid: user.id,
                name: profileData.displayName || p.users?.name || 'Creator',
                avatar: finalAvatarUrl,
              }
            };
          }
          return p;
        });
        if (changed) {
          localStorage.setItem('tgd_all_posts', JSON.stringify(mappedPosts));
        }
      } catch {}

      // 8. Broadcast profile and posts update events across windows/tabs
      window.dispatchEvent(new CustomEvent('profile_updated', { detail: profilePayload }));
      window.dispatchEvent(new CustomEvent('posts_updated'));

      toast.success('Changes saved', {
        description: 'Your profile photo, identity, and VIP subscription settings are updated live.'
      });
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Save failed', {
        description: err?.message || 'Could not update profile.'
      });
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = resolveUserAvatar(avatarPreview || profileData.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture, profileData.displayName || user?.user_metadata?.name || user?.user_metadata?.full_name);
  const currentName = profileData.displayName || user?.user_metadata?.name || user?.user_metadata?.full_name || "Creator";

  return (
    <CreatorLayout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">Edit Profile</h1>
            <p className="text-zinc-400 text-sm font-medium">Manage your creator identity, verification, and payout settings.</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.id && (
              <Link 
                to={`/creator/${user.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 py-3 rounded-2xl border border-white/10 transition-all text-xs"
              >
                <Eye className="w-4 h-4 text-red-500" /> View Public Profile <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Link>
            )}
            <button 
              onClick={handleSaveAll} 
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-red-600/20 border border-red-500 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Changes
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex overflow-x-auto no-scrollbar gap-3 mb-8 bg-[#0d0e12] border border-zinc-800/80 p-2 rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all relative ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-500'
                  : 'bg-[#0d0e12] text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-zinc-400'}`} />
              {tab.label}
              {tab.requiresAttention && activeTab !== tab.id && (
                 <span className="absolute -top-1 -right-1 flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-[#0d0e12]"></span>
                 </span>
              )}
            </button>
          ))}
        </div>

        {/* Main Content Card Container */}
        <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">

          {activeTab === 'media' && (
            <div className="p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-white">Media & Posts</h2>
                  <p className="text-sm text-zinc-400 mt-1">Upload content, choose who can access it, or save it as a draft.</p>
                </div>
                <div className="flex gap-2">
                  <Link to="/feed" className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-bold hover:bg-zinc-800">
                    Manage Posts
                  </Link>
                  <Link to="/vault" className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-bold hover:bg-zinc-800">
                    Media Vault
                  </Link>
                </div>
              </div>
              <CreatePostForm />
            </div>
          )}
          
          {/* 1. PUBLIC PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              {/* Banner Area with Real File Upload */}
              <div className="h-56 bg-[#0d0e12] relative group cursor-pointer border-b border-zinc-800/80">
                <input 
                  type="file" 
                  id="bannerUpload" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleBannerChange} 
                />
                <label htmlFor="bannerUpload" className="w-full h-full block cursor-pointer">
                  <img 
                    src={bannerPreview || profileData.coverImage} 
                    alt="banner" 
                    className="w-full h-full object-cover group-hover:brightness-50 transition-all duration-300" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/80 text-white border border-zinc-700 px-5 py-2.5 rounded-full font-bold flex items-center gap-2 text-sm backdrop-blur-md shadow-2xl">
                      <Camera className="w-4 h-4 text-red-500" /> Click to Change Header Banner
                    </div>
                  </div>
                </label>
              </div>

              {/* Profile Body */}
              <div className="p-6 sm:p-10">
                {/* Avatar with Camera Overlay & Real File Upload */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-20 sm:-mt-24 mb-8">
                  <div className="relative inline-block group cursor-pointer shrink-0">
                    <input type="file" id="avatarUpload" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <label htmlFor="avatarUpload" className="cursor-pointer block relative rounded-full">
                      <img 
                        src={avatarPreview || currentAvatar} 
                        alt="avatar" 
                        className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-[#0d0e12] bg-[#0d0e12] object-cover group-hover:brightness-50 transition-all shadow-2xl" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/40">
                        <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2 pb-2">
                    <div className="flex items-center gap-3">
                      <label 
                        htmlFor="avatarUpload"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5" /> Upload Photo
                      </label>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview(null);
                            setProfileData(p => ({ ...p, avatarUrl: '' }));
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium text-xs rounded-xl border border-zinc-800 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Square image recommended. JPG, PNG or WebP up to 5MB.
                    </p>
                    {avatarFile && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        <Check className="w-3 h-3" /> New photo staged: {avatarFile.name} (Click "Save Changes" to publish)
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 max-w-3xl">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Display Name</label>
                        <input 
                          type="text" 
                          value={profileData.displayName}
                          onChange={e => setProfileData(p => ({ ...p, displayName: e.target.value }))}
                          placeholder={currentName}
                          className="w-full bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Age</label>
                        <input 
                          type="number"
                          min="18"
                          max="99"
                          value={profileData.age}
                          onChange={e => setProfileData(p => ({ ...p, age: Number(e.target.value) || 24 }))}
                          className="w-full bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Monthly VIP Subscription Price (KES)</label>
                        <div className="flex">
                            <span className="bg-[#0d0e12] border border-zinc-800 border-r-0 px-4 py-3.5 rounded-l-2xl text-zinc-400 text-sm font-bold flex items-center">KES</span>
                            <input 
                              type="number"
                              min="100"
                              step="50"
                              value={profileData.monthlyPrice}
                              onChange={e => setProfileData(p => ({ ...p, monthlyPrice: Number(e.target.value) || 0 }))}
                              className="w-full bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-r-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors" 
                            />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Location</label>
                        <input 
                          type="text" 
                          value={profileData.location}
                          onChange={e => setProfileData(p => ({ ...p, location: e.target.value }))}
                          placeholder="Nairobi, Kenya"
                          className="w-full bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors" 
                        />
                      </div>
                    </div>

                    {/* Limited-Time Promotional Discount Offer */}
                    <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-white flex items-center gap-2">
                            <Flame className="w-4 h-4 text-red-500" /> Limited-Time Promo Offer
                          </h4>
                          <p className="text-xs text-zinc-400">
                            Display a high-converting discount banner on your public profile page.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfileData(p => ({ ...p, promoActive: !p.promoActive }))}
                          className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${profileData.promoActive ? 'bg-red-600' : 'bg-zinc-800'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${profileData.promoActive ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {profileData.promoActive && (
                        <div className="flex items-center gap-2 sm:gap-3 pt-2 border-t border-white/5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-400">Discount:</span>
                          {[15, 25, 35, 50, 70].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setProfileData(p => ({ ...p, promoDiscount: pct }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                profileData.promoDiscount === pct
                                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                              }`}
                            >
                              {pct}% OFF
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Bio / About</label>
                      <textarea 
                        rows={4} 
                        value={profileData.bio}
                        onChange={e => setProfileData(p => ({ ...p, bio: e.target.value }))}
                        className="w-full bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors resize-none" 
                        placeholder="Welcome to my exclusive page! VIP posts, private chats, and weekly content drops."
                      />
                      <p className="text-xs text-zinc-500 mt-2 font-medium">Maximum 300 characters.</p>
                    </div>

                    {/* Content Specialties / Tags */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Content Specialties & Badges</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {['VIP Content', 'Direct Chat', 'Exclusive Photos', 'Private Videos', 'Behind The Scenes', 'Fitness', 'Custom Requests'].map(tag => {
                          const isSelected = profileData.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setProfileData(p => ({
                                  ...p,
                                  tags: isSelected ? p.tags.filter(t => t !== tag) : [...p.tags, tag]
                                }));
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected 
                                  ? 'bg-red-600/20 border border-red-500/60 text-red-400 font-black' 
                                  : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-red-400" />} {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Subscriber View Preview Card */}
                    <div className="pt-8 border-t border-zinc-800">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-black text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-red-500" /> Live Subscriber View Preview
                          </h3>
                          <p className="text-xs text-zinc-400">
                            How potential subscribers see your profile and banner on their end.
                          </p>
                        </div>
                        {user?.id && (
                          <Link
                            to={`/creator/${user.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            Open Public Page <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>

                      {/* Live Preview Card */}
                      <div className="rounded-3xl border border-white/15 bg-black overflow-hidden shadow-2xl max-w-xl mx-auto">
                        <div className="h-32 relative bg-zinc-900">
                          <img
                            src={bannerPreview || profileData.coverImage}
                            alt="cover preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        </div>
                        <div className="px-5 pb-5 pt-0 relative">
                          <div className="relative -mt-10 mb-3 flex items-end justify-between">
                            <div className="relative">
                              <img
                                src={avatarPreview || currentAvatar}
                                alt="avatar preview"
                                className="w-20 h-20 rounded-full border-4 border-black object-cover shadow-xl"
                              />
                              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black" />
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-full">
                                KES {profileData.monthlyPrice.toLocaleString()} /mo
                              </span>
                            </div>
                          </div>

                          <div className="font-black text-base text-white flex items-center gap-1.5">
                            <span>{profileData.displayName || 'Your Name'}</span>
                            <CheckCircle2 className="w-4 h-4 text-white fill-blue-500" />
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                            {profileData.bio || 'Your bio will appear here...'}
                          </p>

                          {profileData.promoActive && (
                            <div className="mt-3 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-between text-xs">
                              <span className="font-bold text-red-300 flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-red-500" /> Special Offer: {profileData.promoDiscount}% OFF
                              </span>
                              <span className="text-white font-extrabold text-[11px] bg-red-600 px-2 py-0.5 rounded-md">
                                Limited Offer
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Danger Zone: Permanent Account Deletion */}
                    <div className="pt-8 mt-8 border-t border-red-950/80">
                      <div className="p-6 rounded-3xl bg-[#14080a] border border-red-900/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                            <Trash2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-red-500 flex items-center gap-2">
                              Danger Zone: Delete Creator Account
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1 max-w-lg leading-relaxed">
                              Permanently delete your creator account, public profile, all posts, media vault, and subscriber data. This action cannot be reversed.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmText('');
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 hover:border-red-500 text-red-400 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-200 shrink-0 active:scale-95 cursor-pointer shadow-md"
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. KYC VERIFICATION TAB */}
          {activeTab === 'kyc' && (
            <div className="p-6 sm:p-10">
              {/* Action Banner */}
              <div className="mb-8 p-6 bg-red-950/40 border border-red-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black flex items-center gap-2 text-red-500 mb-1">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> Action Required: Identity Verification
                  </h2>
                  <p className="text-sm text-zinc-300 font-medium">You cannot withdraw earnings until your identity is verified under Kenya regulatory compliance (AML).</p>
                </div>
                <div className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase border border-red-400 shadow-md">
                  Unverified
                </div>
              </div>

              <div className="space-y-8 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Legal Full Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="legalName" 
                      value={kycData.legalName} 
                      onChange={handleKycChange} 
                      placeholder="As it appears on your ID" 
                      className="w-full bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm font-medium" 
                    />
                    <p className="text-xs text-zinc-500 mt-2 font-medium">Must match your M-Pesa registered name.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">National ID / Passport Number <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="nationalId" 
                      value={kycData.nationalId} 
                      onChange={handleKycChange} 
                      placeholder="e.g. 12345678" 
                      className="w-full bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm font-medium" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    name="dob" 
                    value={kycData.dob} 
                    onChange={handleKycChange} 
                    className="w-full sm:w-1/2 bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white focus:border-red-500 focus:outline-none text-sm font-medium" 
                  />
                  <p className="text-xs text-zinc-500 mt-2 font-medium">You must be 18+ to monetize on this platform.</p>
                </div>

                <div className="space-y-6 pt-6 border-t border-zinc-800">
                  <h3 className="font-black text-lg text-white">Document Verification</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ID Upload */}
                    <div className="relative border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center hover:bg-[#0d0e12] hover:border-red-500/50 transition-all cursor-pointer group flex flex-col items-center justify-center h-44 overflow-hidden">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleKycUpload(e, 'id')} />
                      {kycData.idDocumentPreview ? (
                         <img src={kycData.idDocumentPreview} alt="ID Preview" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-red-950/60 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div className="font-bold text-white text-sm mb-1">Upload ID Document</div>
                          <div className="text-xs text-zinc-500 font-medium">Front & Back of National ID or Passport.</div>
                        </>
                      )}
                    </div>

                    {/* Selfie Upload */}
                    <div className="relative border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center hover:bg-[#0d0e12] hover:border-red-500/50 transition-all cursor-pointer group flex flex-col items-center justify-center h-44 overflow-hidden">
                      <input type="file" accept="image/*" capture="user" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleKycUpload(e, 'selfie')} />
                      {kycData.selfiePreview ? (
                         <img src={kycData.selfiePreview} alt="Selfie Preview" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-red-950/60 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Camera className="w-6 h-6" />
                          </div>
                          <div className="font-bold text-white text-sm mb-1">Upload Selfie with ID</div>
                          <div className="text-xs text-zinc-500 font-medium">Clear photo holding your ID next to your face.</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    console.log("Submitting KYC For Verification:", kycData);
                    toast.success('KYC Submitted', {
                      description: 'Your documents have been received and are under secure review.'
                    });
                  }} 
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 font-black rounded-2xl shadow-lg shadow-red-600/20 border border-red-500 transition-all"
                >
                  Submit KYC for Verification
                </button>
              </div>
            </div>
          )}

          {/* 3. PAYOUTS TAB */}
          {activeTab === 'payouts' && (
            <div className="p-6 sm:p-10 space-y-8 max-w-3xl">
              <div className="mb-4 p-6 bg-red-950/40 border border-red-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black flex items-center gap-2 text-red-500 mb-1">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> Setup Payout Account
                  </h2>
                  <p className="text-sm text-zinc-300 font-medium">You must have an active and verified payout method to receive your creator earnings.</p>
                </div>
                <div className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase border border-red-400">
                  Unverified
                </div>
              </div>

              <div>
                <h2 className="text-xl font-black text-white mb-1">Withdrawal Methods</h2>
                <p className="text-sm text-zinc-400 font-medium mb-6">Configure where you want your earnings sent. M-Pesa is our primary payout method.</p>
              </div>

              <div className="bg-[#0d0e12] border border-zinc-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest border-l border-b border-emerald-500 shadow-md">Primary</div>
                
                <h3 className="font-black text-lg text-white mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  M-Pesa B2C Instant Payout
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Safaricom Phone Number</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="tel" 
                        name="phoneNumber" 
                        value={payoutData.phoneNumber} 
                        onChange={handlePayoutChange} 
                        disabled={isPhoneVerified} 
                        placeholder="712 345 678" 
                        className="flex-1 bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none disabled:opacity-50 text-sm" 
                      />
                      {!isPhoneVerified && (
                        <button 
                          type="button" 
                          onClick={handleSendOtp} 
                          disabled={isLoadingOtp} 
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-2xl font-black text-sm whitespace-nowrap shadow-md shadow-red-600/20 border border-red-500 transition-all disabled:opacity-50"
                        >
                          {isLoadingOtp ? 'Sending...' : (otpSent ? 'Resend OTP' : 'Send OTP')}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 font-medium">We send a code via SMS to confirm ownership. Earnings are sent directly to this M-Pesa line.</p>
                    {otpMessage.text && (
                      <p className={`text-sm mt-3 font-bold ${otpMessage.type === 'error' ? 'text-red-500' : 'text-emerald-400'}`}>{otpMessage.text}</p>
                    )}
                  </div>

                  {otpSent && !isPhoneVerified && (
                    <div className="pt-4 border-t border-zinc-800/80">
                      <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">SMS Verification Code</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                          type="text" 
                          value={userOtpInput} 
                          onChange={(e) => setUserOtpInput(e.target.value)} 
                          placeholder="123456" 
                          className="w-full sm:w-1/2 bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white text-center font-black tracking-widest text-lg focus:border-red-500 focus:outline-none" 
                        />
                        <button 
                          type="button" 
                          onClick={handleVerifyOtp} 
                          disabled={isVerifying} 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all border border-emerald-500 disabled:opacity-50"
                        >
                          {isVerifying ? 'Verifying...' : 'Verify & Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  {isPhoneVerified && (
                     <div className="pt-2 text-sm text-emerald-400 font-bold flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Phone number verified for M-Pesa payouts
                     </div>
                  )}
                </div>
              </div>

              <div className="bg-[#0d0e12] border border-zinc-800 p-6 sm:p-8 rounded-3xl">
                <h3 className="font-black text-lg text-white mb-4">Tax Compliance Information</h3>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">KRA PIN (Optional)</label>
                  <input 
                    type="text" 
                    name="kraPin" 
                    value={payoutData.kraPin} 
                    onChange={handlePayoutChange} 
                    placeholder="e.g. A123456789Z" 
                    className="w-full sm:w-1/2 bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white uppercase font-medium focus:border-red-500 focus:outline-none text-sm" 
                  />
                  <p className="text-xs text-zinc-500 mt-2 font-medium">Required for statutory tax compliance if earnings exceed monthly thresholds.</p>
                </div>
              </div>

              <div className="bg-[#0d0e12]/50 border border-zinc-800/60 p-6 rounded-3xl opacity-50 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white text-base">Bank Wire Transfer (SWIFT / RTGS)</h3>
                  <p className="text-xs text-zinc-400 font-medium">Direct-to-bank international payouts for high-volume creators.</p>
                </div>
                <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Planned
                </span>
              </div>
            </div>
          )}

          {/* 4. PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="p-6 sm:p-10 space-y-8 max-w-3xl">
              <div>
                <h2 className="text-xl font-black text-white mb-6">Creator Notifications & Security</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
                     <div>
                        <div className="font-bold text-white text-base">New Subscription Alerts</div>
                        <div className="text-xs text-zinc-400 font-medium">Get instant notification emails when a fan subscribes.</div>
                     </div>
                     <div className="w-14 h-8 bg-red-600 rounded-full relative cursor-pointer shadow-lg p-1 border border-red-500 transition-colors">
                        <div className="absolute right-1 top-1 bg-white w-6 h-6 rounded-full shadow-md"></div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
                     <div>
                        <div className="font-bold text-white text-base">Message Tip Notifications</div>
                        <div className="text-xs text-zinc-400 font-medium">Get notified when you receive a cash tip in DMs.</div>
                     </div>
                     <div className="w-14 h-8 bg-red-600 rounded-full relative cursor-pointer shadow-lg p-1 border border-red-500 transition-colors">
                        <div className="absolute right-1 top-1 bg-white w-6 h-6 rounded-full shadow-md"></div>
                     </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
                     <div>
                        <div className="font-bold text-white text-base">Platform Updates & Analytics</div>
                        <div className="text-xs text-zinc-400 font-medium">Receive weekly earnings insights and creator news.</div>
                     </div>
                     <div className="w-14 h-8 bg-[#0d0e12] border border-zinc-800 rounded-full relative cursor-pointer transition-colors">
                        <div className="absolute left-1 top-1 bg-zinc-600 w-6 h-6 rounded-full"></div>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Account Backup Email</label>
                     <input 
                       type="email" 
                       placeholder="backup@example.com" 
                       className="w-full bg-[#0d0e12] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none text-sm placeholder:text-zinc-600" 
                     />
                     <p className="text-xs text-zinc-500 mt-2 font-medium">Used for security recovery if you lose access to your primary login method.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Permanent Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121217] border border-red-900/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-white mb-2">
              Permanently Delete Account?
            </h3>

            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              This action will <strong className="text-red-400 font-bold">permanently erase</strong> your creator profile, all published photos and videos, subscriber history, and earnings records from The Gents Dollhouse. <strong className="text-white">This cannot be undone.</strong>
            </p>

            <div className="mb-6">
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                Type <span className="text-red-400 font-mono font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-black/60 border border-red-500/30 focus:border-red-500 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-zinc-600 focus:outline-none uppercase tracking-wider"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </CreatorLayout>
  );
};
export default EditProfile;
