import UserLayout from '../../components/UserLayout';
import { Save, Camera, ShieldAlert, Bell } from 'lucide-react';

const UserSettings = () => {
  return (
    <UserLayout>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
             <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
             <p className="text-sm text-muted-foreground">Update your details and privacy preferences.</p>
          </div>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform text-sm">
             <Save className="w-4 h-4" /> Save Profile
          </button>
       </div>

       <div className="space-y-8">
          
          {/* Profile Section */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border">Profile Information</h2>
             
             <div className="flex items-center gap-6 mb-8">
                <div className="relative group cursor-pointer inline-block">
                   <img src="https://i.pravatar.cc/150?img=50" alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border group-hover:brightness-75 transition-all" />
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white drop-shadow" />
                   </div>
                </div>
                <div>
                  <div className="font-bold">Profile Picture</div>
                  <div className="text-xs text-muted-foreground">Creators will see this when you interact with them.</div>
                </div>
             </div>

             <div className="space-y-4 max-w-md">
                <div>
                   <label className="block text-sm font-bold mb-1">Display Name</label>
                   <input type="text" defaultValue="Fan User" className="w-full bg-muted/20 border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                   <label className="block text-sm font-bold mb-1">Email <span className="text-red-500">*</span></label>
                   <input type="email" defaultValue="user@example.com" disabled className="w-full bg-muted border border-border px-3 py-2.5 rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
                   <p className="text-[10px] text-muted-foreground mt-1">Contact support to change your email address.</p>
                </div>
             </div>
          </section>

          {/* Preferences */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-6 pb-2 border-b border-border flex items-center gap-2">
               <Bell className="w-5 h-5" /> Preferences
             </h2>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div>
                      <div className="font-bold text-sm">Email Notifications</div>
                      <div className="text-xs text-muted-foreground">Receive emails for new messages and subscription updates.</div>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                      <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>
                
                <div className="flex items-center justify-between">
                   <div>
                      <div className="font-bold text-sm">In-App Sound</div>
                      <div className="text-xs text-muted-foreground">Play a small chime when a new message arrives.</div>
                   </div>
                   <div className="w-12 h-6 bg-muted border border-border rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 bg-muted-foreground w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>
             </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
             <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
               <ShieldAlert className="w-5 h-5" /> Danger Zone
             </h2>
             <p className="text-sm text-red-600/80 mb-4">
                Permanently delete your account and remove all data. This action cannot be undone, and you will lose access to all purchased contents.
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
