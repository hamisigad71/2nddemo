import CreatorLayout from '../../components/CreatorLayout';
import { Camera, Save, User, ShieldCheck, Wallet, Sliders, AlertCircle, UploadCloud, Smartphone, CheckCircle2, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../lib/db';
import { supabase } from '../../lib/supabase';

const EditProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuth();
  
  // States
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
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

  // Load existing phone from DB
  useEffect(() => {
    if (!user?.id) return;
    getUserProfile(user.id).then((profile) => {
      if (profile?.phone) {
        const raw = profile.phone.replace(/^\+254/, '').replace(/^0/, '');
        setPayoutData(prev => ({ ...prev, phoneNumber: raw }));
      }
    });
  }, [user]);

  const tabs = [
    { id: 'profile', label: 'Public Profile', icon: User, requiresAttention: false },
    { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck, requiresAttention: true },
    { id: 'payouts', label: 'Payouts', icon: Wallet, requiresAttention: true },
    { id: 'preferences', label: 'Preferences', icon: Sliders, requiresAttention: false },
  ];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarPreview(URL.createObjectURL(file));
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

  const handleSaveAll = () => {
    console.log("Current Captured KYC Data:", kycData);
    console.log("Current Captured Payout Data:", payoutData);
    alert("Changes saved! Check browser console to see the captured payload.");
  };

  const currentAvatar = avatarPreview || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "https://i.pinimg.com/736x/c9/27/d6/c927d6a930299f0e5d0be9b217d09b16.jpg";
  const currentName = user?.user_metadata?.name || user?.user_metadata?.full_name || "Jane Doe";

  return (
    <CreatorLayout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">Edit Profile</h1>
            <p className="text-zinc-400 text-sm font-medium">Manage your creator identity, verification, and payout settings.</p>
          </div>
          <button 
            onClick={handleSaveAll} 
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-red-600/20 border border-red-500 transition-all transform active:scale-95"
          >
            <Save className="w-5 h-5" /> Save Changes
          </button>
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
                  : 'bg-[#14161d] text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
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
          
          {/* 1. PUBLIC PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              {/* Banner Area */}
              <div className="h-56 bg-[#14161d] relative group cursor-pointer border-b border-zinc-800/80">
                <img 
                  src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1200" 
                  alt="banner" 
                  className="w-full h-full object-cover group-hover:brightness-50 transition-all duration-300" 
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/80 text-white border border-zinc-700 px-5 py-2.5 rounded-full font-bold flex items-center gap-2 text-sm backdrop-blur-md shadow-2xl">
                      <Camera className="w-4 h-4 text-red-500" /> Change Header Banner
                    </div>
                </div>
              </div>

              {/* Profile Body */}
              <div className="p-6 sm:p-10">
                {/* Avatar with Camera Overlay */}
                <div className="relative -mt-20 sm:-mt-24 mb-8 inline-block group cursor-pointer">
                    <input type="file" id="avatarUpload" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <label htmlFor="avatarUpload" className="cursor-pointer block relative rounded-full">
                      <img 
                        src={currentAvatar} 
                        alt="avatar" 
                        className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-[#0d0e12] bg-[#14161d] object-cover group-hover:brightness-50 transition-all shadow-2xl" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/40">
                        <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    </label>
                </div>

                <div className="space-y-6 max-w-3xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Display Name</label>
                        <input 
                          type="text" 
                          defaultValue={currentName} 
                          className="w-full bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Username</label>
                        <div className="flex">
                            <span className="bg-[#181a22] border border-zinc-800 border-r-0 px-4 py-3.5 rounded-l-2xl text-zinc-500 text-sm font-bold flex items-center">gentsdollhouse.com/</span>
                            <input 
                              type="text" 
                              defaultValue="janedoe" 
                              className="w-full bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-r-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors" 
                            />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Bio</label>
                      <textarea 
                        rows={4} 
                        defaultValue="Welcome to my exclusive page! 🌟 Custom requests open in DMs." 
                        className="w-full bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors resize-none" 
                      />
                      <p className="text-xs text-zinc-500 mt-2 font-medium">Maximum 300 characters.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Location (Optional)</label>
                        <input 
                          type="text" 
                          defaultValue="Nairobi, Kenya" 
                          className="w-full bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Primary Social Link</label>
                        <input 
                          type="url" 
                          placeholder="https://instagram.com/yourhandle" 
                          className="w-full bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none transition-colors placeholder:text-zinc-600" 
                        />
                        <p className="text-xs text-zinc-500 mt-2 font-medium">Helps us verify your creator identity.</p>
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
                      className="w-full bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm font-medium" 
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
                      className="w-full bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm font-medium" 
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
                    className="w-full sm:w-1/2 bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white focus:border-red-500 focus:outline-none text-sm font-medium" 
                  />
                  <p className="text-xs text-zinc-500 mt-2 font-medium">You must be 18+ to monetize on this platform.</p>
                </div>

                <div className="space-y-6 pt-6 border-t border-zinc-800">
                  <h3 className="font-black text-lg text-white">Document Verification</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ID Upload */}
                    <div className="relative border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center hover:bg-[#14161d] hover:border-red-500/50 transition-all cursor-pointer group flex flex-col items-center justify-center h-44 overflow-hidden">
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
                    <div className="relative border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center hover:bg-[#14161d] hover:border-red-500/50 transition-all cursor-pointer group flex flex-col items-center justify-center h-44 overflow-hidden">
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
                    alert("KYC Submitted securely for review!");
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

              <div className="bg-[#14161d] border border-zinc-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden">
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

              <div className="bg-[#14161d] border border-zinc-800 p-6 sm:p-8 rounded-3xl">
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

              <div className="bg-[#14161d]/50 border border-zinc-800/60 p-6 rounded-3xl opacity-50 flex items-center justify-between">
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
                     <div className="w-14 h-8 bg-[#14161d] border border-zinc-800 rounded-full relative cursor-pointer transition-colors">
                        <div className="absolute left-1 top-1 bg-zinc-600 w-6 h-6 rounded-full"></div>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Account Backup Email</label>
                     <input 
                       type="email" 
                       placeholder="backup@example.com" 
                       className="w-full bg-[#14161d] border border-zinc-800 px-4 py-3.5 rounded-2xl text-white font-medium focus:border-red-500 focus:outline-none text-sm placeholder:text-zinc-600" 
                     />
                     <p className="text-xs text-zinc-500 mt-2 font-medium">Used for security recovery if you lose access to your primary login method.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </CreatorLayout>
  );
};
export default EditProfile;
