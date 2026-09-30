import UserLayout from '../../components/UserLayout';
import { Save, Camera, ShieldAlert, Bell, Globe, CreditCard, Lock } from 'lucide-react';

const UserSettings = () => {
  return (
    <UserLayout>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
             <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
             <p className="text-sm text-muted-foreground">Update your details, payments, and privacy preferences.</p>
          </div>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform text-sm">
             <Save className="w-4 h-4" /> Save Profile
          </button>
       </div>

       <div className="space-y-8 max-w-3xl">
          
          {/* Profile Section */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
                <Globe className="w-5 h-5 text-muted-foreground" /> Public Profile
             </h2>
             
             <div className="flex items-center gap-6 mb-8">
                <div className="relative group cursor-pointer inline-block">
                   <img src="https://i.pravatar.cc/150?img=50" alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border group-hover:brightness-75 transition-all" />
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white drop-shadow" />
                   </div>
                </div>
                <div>
                  <div className="font-bold">Profile Picture</div>
                  <div className="text-xs text-muted-foreground max-w-xs">Creators will see this when you interact with them in messages or comments.</div>
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-bold mb-1">Display Name</label>
                   <input type="text" defaultValue="Fan User" className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary" />
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

          {/* Payment Section */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" /> Checkout Defaults
             </h2>
             
             <div className="space-y-4 max-w-md">
                <div>
                   <label className="block text-sm font-bold mb-1">Default M-Pesa Number</label>
                   <div className="flex">
                      <span className="bg-muted border border-border border-r-0 px-3 py-2.5 rounded-l-lg text-muted-foreground text-sm flex items-center">+254</span>
                      <input type="tel" placeholder="7XX XXX XXX" className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-r-lg text-sm focus:outline-none focus:border-primary" />
                   </div>
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
                   <label className="block text-sm font-bold mb-1">Primary Email (Google Auth) <span className="text-red-500">*</span></label>
                   <input type="email" defaultValue="user@example.com" disabled className="w-full bg-muted border border-border px-3 py-2.5 rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
                   <p className="text-[10px] text-muted-foreground mt-1">Contact support to change your primary email address.</p>
                </div>

                <div>
                   <label className="block text-sm font-bold mb-1">Account Recovery Email</label>
                   <input type="email" placeholder="backup-email@example.com" className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary" />
                   <p className="text-[10px] text-muted-foreground mt-1">Just in case you lose access to your primary Google account.</p>
                </div>
             </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mt-12">
             <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
               <ShieldAlert className="w-5 h-5" /> Danger Zone
             </h2>
             <p className="text-sm text-red-600/80 mb-4 max-w-2xl">
                Permanently delete your account and remove all data. This action cannot be undone, and you will lose access to all purchased content and active subscriptions.
             </p>
             <button className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-red-700 transition-colors">
                Delete Account
             </button>
          </section>

       </div>
    </UserLayout>
  );
};
export default UserSettings;
