import CreatorLayout from '../components/CreatorLayout';
import { UploadCloud, FolderHeart, Lock } from 'lucide-react';

const MediaVault = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Media Vault</h1>
          <p className="text-muted-foreground">Manage all your uploaded photos and videos in one place.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          <UploadCloud className="w-5 h-5" /> Upload Media
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {['All Media', 'Photos', 'Videos', 'Locked PPV', 'Archived'].map((tab, i) => (
          <button key={tab} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${i === 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-input hover:text-foreground transition-colors'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Folders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         {['Summer Shoot', 'BTS Exclusives', 'Custom Requests'].map((folder) => (
            <div key={folder} className="bg-background border border-border p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors">
               <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                 <FolderHeart className="w-5 h-5" />
               </div>
               <div className="font-bold text-sm truncate">{folder}</div>
            </div>
         ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="group relative aspect-square bg-muted rounded-xl border border-border overflow-hidden cursor-pointer hover:border-primary transition-colors">
            <img src={`https://images.unsplash.com/photo-${1531123414780 + i}?w=400&q=80`} alt="media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            
            {i % 3 === 0 && (
              <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1.5 rounded-md text-secondary border border-border/50">
                <Lock className="w-3.5 h-3.5" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <span className="text-white text-xs font-bold truncate">IMG_{3450 + i}.jpg</span>
              <span className="text-white/70 text-[10px]">Posted 2 days ago</span>
            </div>
          </div>
        ))}
      </div>
    </CreatorLayout>
  );
};
export default MediaVault;
