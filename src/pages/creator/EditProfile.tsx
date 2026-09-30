import CreatorLayout from '../../components/CreatorLayout';
import { Camera, Save, User, ShieldCheck, Wallet, Sliders, AlertCircle, CheckCircle2, Clock, UploadCloud, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

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

  const tabs = [
    { id: 'profile', label: 'Public Profile', icon: User, activeColor: 'bg-primary text-primary-foreground' },
    { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck, requiresAttention: true, activeColor: 'bg-red-600 text-white' },
    { id: 'payouts', label: 'Payouts', icon: Wallet, requiresAttention: true, activeColor: 'bg-red-600 text-white' },
    { id: 'preferences', label: 'Preferences', icon: Sliders, activeColor: 'bg-primary text-primary-foreground' },
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

  const currentAvatar = avatarPreview || user?.photoURL || "https://i.pravatar.cc/150?img=12";
  const currentName = user?.displayName || "Jane Doe";

  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Edit Profile</h1>
          <p className="text-muted-foreground">Manage your creator identity, verification, and settings.</p>
        </div>
        <button onClick={handleSaveAll} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          <Save className="w-5 h-5" /> Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-colors relative ${
              activeTab === tab.id
                ? tab.activeColor
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.requiresAttention && (
               <span className="absolute -top-1 -right-1 flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-[1.5px] border-background"></span>
               </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm mb-8">
        
        {/* PUBLIC PROFILE TAB */}
        {activeTab === 'profile' && (
          <div>
            <div className="h-48 bg-muted relative group cursor-pointer">
              <img src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1200" alt="banner" className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full font-bold flex items-center gap-2 text-sm shadow-xl">
                    <Camera className="w-4 h-4" /> Change Banner
                  </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="relative -mt-16 sm:-mt-20 mb-8 inline-block group cursor-pointer">
                  <input type="file" id="avatarUpload" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <label htmlFor="avatarUpload" className="cursor-pointer block relative rounded-full">
                    <img src={currentAvatar} alt="avatar" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-background object-cover group-hover:brightness-75 transition-all" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </label>
              </div>

              <div className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold mb-2">Display Name</label>
                      <input type="text" defaultValue={currentName} className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Username</label>
                      <div className="flex">
                          <span className="bg-muted border border-border border-r-0 px-4 py-3 rounded-l-xl text-muted-foreground font-medium flex items-center">hideaway.com/</span>
                          <input type="text" defaultValue="janedoe" className="w-full bg-muted/30 border border-border px-4 py-3 rounded-r-xl focus:outline-none focus:border-primary" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Bio</label>
                    <textarea rows={4} defaultValue="Welcome to my exclusive page! 🌟 Custom requests open in DMs." className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary resize-none" />
                    <p className="text-xs text-muted-foreground mt-2">Maximum 300 characters.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold mb-2">Location (Optional)</label>
                      <input type="text" defaultValue="Nairobi, Kenya" className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Primary Social Link</label>
                      <input type="url" placeholder="https://instagram.com/yourhandle" className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                      <p className="text-xs text-muted-foreground mt-2">Helps us verify your audience.</p>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* KYC VERIFICATION TAB */}
        {activeTab === 'kyc' && (
          <div className="p-6 sm:p-8">
            <div className="mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-red-600 mb-1">
                  <AlertCircle className="w-5 h-5" /> Action Required: Identity Verification
                </h2>
                <p className="text-sm text-foreground">You cannot withdraw earnings until your identity is verified. This ensures compliance with Anti-Money Laundering (AML) regulations.</p>
              </div>
              <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap uppercase tracking-wider">
                Unverified
              </div>
            </div>

            <div className="space-y-8 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Legal Full Name <span className="text-red-500">*</span></label>
                  <input type="text" name="legalName" value={kycData.legalName} onChange={handleKycChange} placeholder="As it appears on your ID" className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                  <p className="text-xs text-muted-foreground mt-2">Must match your M-Pesa registered name.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">National ID / Passport Number <span className="text-red-500">*</span></label>
                  <input type="text" name="nationalId" value={kycData.nationalId} onChange={handleKycChange} placeholder="e.g. 12345678" className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" name="dob" value={kycData.dob} onChange={handleKycChange} className="w-full sm:w-1/2 bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                <p className="text-xs text-muted-foreground mt-2">You must be 18+ to monetize on this platform.</p>
              </div>

              <div className="space-y-6 pt-4 border-t border-border">
                <h3 className="font-bold text-lg">Document Uploads</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ID Upload */}
                  <div className="relative border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer group shadow-sm flex flex-col items-center justify-center overflow-hidden h-40">
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleKycUpload(e, 'id')} />
                    {kycData.idDocumentPreview ? (
                       <img src={kycData.idDocumentPreview} alt="ID Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="font-bold mb-1">Upload ID Document</div>
                        <div className="text-xs text-muted-foreground">Front and Back of National ID or Passport inner page. Max 5MB.</div>
                      </>
                    )}
                  </div>

                  {/* Selfie Upload */}
                  <div className="relative border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer group shadow-sm flex flex-col items-center justify-center overflow-hidden h-40">
                    <input type="file" accept="image/*" capture="user" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleKycUpload(e, 'selfie')} />
                    {kycData.selfiePreview ? (
                       <img src={kycData.selfiePreview} alt="Selfie Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="font-bold mb-1">Upload Selfie</div>
                        <div className="text-xs text-muted-foreground">A clear selfie of you holding your ID next to your face. Max 5MB.</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <button onClick={() => {
                console.log("Submitting KYC For Verification:", kycData);
                alert("KYC Submitted securely for review!");
              }} className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-3 font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors">
                Submit for Verification
              </button>
            </div>
          </div>
        )}

        {/* PAYOUTS TAB */}
        {activeTab === 'payouts' && (
          <div className="p-6 sm:p-8 space-y-8 max-w-2xl">
            <div className="mb-4 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-red-600 mb-1">
                  <AlertCircle className="w-5 h-5" /> Action Required: Setup Payout Method
                </h2>
                <p className="text-sm text-foreground">You must have an active and verified payout method to receive your earnings. The registered name must match your KYC details.</p>
              </div>
              <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap uppercase tracking-wider">
                Unverified
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2">Withdrawal Methods</h2>
              <p className="text-sm text-muted-foreground mb-6">Configure where you want your earnings sent. M-Pesa is our primary payout method.</p>
            </div>

            <div className="bg-muted/20 border border-border p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Primary</div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#4CAF50]" /> M-Pesa B2C Payout
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Safaricom Phone Number</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="tel" name="phoneNumber" value={payoutData.phoneNumber} onChange={handlePayoutChange} placeholder="254 7XX XXX XXX" className="flex-1 bg-muted/50 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                    <button className="bg-foreground text-background px-6 py-3 rounded-xl font-bold whitespace-nowrap hover:bg-foreground/90 transition-colors">
                      Send OTP
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">We will send a code to confirm ownership. This number receives your withdrawals.</p>
                </div>

                <div className="pt-4 hidden"> {/* Show when OTP is sent */}
                  <label className="block text-sm font-bold mb-2">Verification Code</label>
                  <input type="text" placeholder="Enter 6-digit OTP" className="w-full sm:w-1/2 bg-muted/50 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-center tracking-widest text-lg" />
                </div>
              </div>
            </div>

            <div className="bg-muted/20 border border-border p-6 rounded-2xl">
              <h3 className="font-bold text-lg mb-4">Tax Information</h3>
              <div>
                <label className="block text-sm font-bold mb-2">KRA PIN (Optional)</label>
                <input type="text" name="kraPin" value={payoutData.kraPin} onChange={handlePayoutChange} placeholder="e.g. A123456789Z" className="w-full sm:w-1/2 bg-muted/50 border border-border px-4 py-3 rounded-xl focus:outline-none uppercase focus:border-primary" />
                <p className="text-xs text-muted-foreground mt-2">Required for tax compliance if your earnings exceed the monthly threshold.</p>
              </div>
            </div>

            <div className="bg-muted/20 border border-border p-6 rounded-2xl opacity-50 cursor-not-allowed">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">Bank Transfer (Coming Soon)</h3>
                <span className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-xs font-bold">Planned</span>
              </div>
              <p className="text-sm text-muted-foreground">Direct-to-bank SWIFT/RTGS payouts will be available for high-volume creators in the future.</p>
            </div>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === 'preferences' && (
          <div className="p-6 sm:p-8 space-y-8 max-w-2xl">
            <div>
              <h2 className="text-xl font-bold mb-6">Creator Preferences</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-6">
                   <div>
                      <div className="font-bold">New Subscription Alerts</div>
                      <div className="text-sm text-muted-foreground">Get notified when a new fan subscribes.</div>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                      <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>

                <div className="flex items-center justify-between border-b border-border pb-6">
                   <div>
                      <div className="font-bold">Message Tip Alerts</div>
                      <div className="text-sm text-muted-foreground">Get notified when you receive a tip in DMs.</div>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                      <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>
                
                <div className="flex items-center justify-between border-b border-border pb-6">
                   <div>
                      <div className="font-bold">Marketing Emails</div>
                      <div className="text-sm text-muted-foreground">Receive platform updates and creator tips.</div>
                   </div>
                   <div className="w-12 h-6 bg-muted border border-border rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 bg-muted-foreground w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold mb-2">Account Backup Email</label>
                   <input type="email" placeholder="backup@example.com" className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                   <p className="text-xs text-muted-foreground mt-2">We'll use this if you lose access to your primary login method.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </CreatorLayout>
  );
};
export default EditProfile;
