import CreatorLayout from '../../components/CreatorLayout';
import { UploadCloud, FolderHeart, Lock } from 'lucide-react';

// Easily update your media images below by modifying the 'url' property for each item.
const MEDIA_ITEMS = [
  { id: 1, title: 'IMG_3451.jpg', date: 'Posted 2 days ago', isLocked: false, url: 'https://i.pinimg.com/736x/ce/82/40/ce82402ccc5033865a33c33383de7536.jpg' },
  { id: 2, title: 'IMG_3452.jpg', date: 'Posted 2 days ago', isLocked: false, url: 'https://i.pinimg.com/736x/74/05/72/7405725108189b8130901b32d9e3dce8.jpg' },
  { id: 3, title: 'IMG_3453.jpg', date: 'Posted 2 days ago', isLocked: true,  url: 'https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg' },
  { id: 4, title: 'IMG_3454.jpg', date: 'Posted 2 days ago', isLocked: false, url: 'https://i.pinimg.com/736x/c7/8e/4c/c78e4c788d6650fe1d5a1a1c7e7d829f.jpg' },
  { id: 5, title: 'IMG_3455.jpg', date: 'Posted 2 days ago', isLocked: false, url: 'https://i.pinimg.com/736x/3e/4e/7d/3e4e7df827c9a49a43ce5094273a82f2.jpg' },
  { id: 6, title: 'IMG_3456.jpg', date: 'Posted 2 days ago', isLocked: true,  url: 'https://i.pinimg.com/736x/4e/a4/63/4ea463c09071090447141b234eeb6839.jpg' },
  { id: 7, title: 'IMG_3457.jpg', date: 'Posted 2 days ago', isLocked: false, url: 'https://i.pinimg.com/736x/48/70/77/487077c37991be14455988c1b56f7306.jpg' },
  { id: 8, title: 'IMG_3458.jpg', date: 'Posted 2 days ago', isLocked: false, url: 'https://i.pinimg.com/736x/00/79/21/007921d60270116d1cc141bf55b2d9d2.jpg' },
  { id: 9, title: 'IMG_3459.jpg', date: 'Posted 2 days ago', isLocked: true,  url: 'https://i.pinimg.com/736x/71/fa/aa/71faaa9b1327b6d1eef05bdd7c51e9aa.jpg' },
  { id: 10, title: 'IMG_3460.jpg', date: 'Posted 2 days ago', isLocked: false, url: 'https://i.pinimg.com/736x/71/d4/5a/71d45ac93a14bad04fb29d4b5f6d8925.jpg' },
];

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {MEDIA_ITEMS.map((item) => (
          <div key={item.id} className="group relative aspect-[4/5] bg-muted rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 ring-1 ring-border/50 hover:ring-primary/50">
            <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
            
            {item.isLocked && (
              <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md p-2 rounded-xl text-white shadow-lg ring-1 ring-white/20">
                <Lock className="w-4 h-4" />
              </div>
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <span className="text-white text-sm font-bold truncate tracking-wide">{item.title}</span>
              <span className="text-white/60 text-[10px] uppercase font-semibold tracking-wider mt-1">{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </CreatorLayout>
  );
};
export default MediaVault;
