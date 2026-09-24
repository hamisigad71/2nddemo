import CreatorLayout from '../components/CreatorLayout';
import { Camera, Save } from 'lucide-react';

const EditProfile = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Edit Profile</h1>
          <p className="text-muted-foreground">Update your public facing page and bio.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          <Save className="w-5 h-5" /> Save Changes
        </button>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm mb-8">
        {/* Banner Upload */}
        <div className="h-48 bg-muted relative group cursor-pointer">
           <img src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1200" alt="banner" className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full font-bold flex items-center gap-2 text-sm shadow-xl">
                 <Camera className="w-4 h-4" /> Change Banner
              </div>
           </div>
        </div>

        <div className="p-6 sm:p-8">
           {/* Avatar Upload */}
           <div className="relative -mt-16 sm:-mt-20 mb-8 inline-block group cursor-pointer">
              <img src="https://i.pravatar.cc/150?img=12" alt="avatar" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-background object-cover group-hover:brightness-75 transition-all" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                 <Camera className="w-6 h-6 text-white drop-shadow-md" />
              </div>
           </div>

           <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-bold mb-2">Display Name</label>
                   <input type="text" defaultValue="Jane Doe" className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold mb-2">Username</label>
                   <div className="flex">
                      <span className="bg-muted border border-border border-r-0 px-4 py-3 rounded-l-xl text-muted-foreground font-medium">mali.com/</span>
                      <input type="text" defaultValue="janedoe" className="w-full bg-muted/30 border border-border px-4 py-3 rounded-r-xl focus:outline-none focus:border-primary" />
                   </div>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Bio</label>
                <textarea rows={4} defaultValue="Welcome to my exclusive page! 🌟 Custom requests open in DMs." className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary resize-none" />
                <p className="text-xs text-muted-foreground mt-2">Maximum 300 characters.</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Location (Optional)</label>
                <input type="text" defaultValue="Nairobi, Kenya" className="w-full max-w-sm bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
              </div>
           </div>
        </div>
      </div>
    </CreatorLayout>
  );
};
export default EditProfile;
