import UserLayout from '../components/UserLayout';
import { PlayCircle, Image as ImageIcon } from 'lucide-react';

const UserVault = () => {
  return (
    <UserLayout>
       <div className="mb-8">
           <h1 className="text-2xl font-bold tracking-tight">Your Purchases</h1>
           <p className="text-sm text-muted-foreground">All Pay-Per-View content you have unlocked.</p>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => {
            const isVideo = i % 2 === 0;
            return (
              <div key={i} className="group relative aspect-[3/4] bg-muted rounded-xl border border-border overflow-hidden cursor-pointer shadow-sm">
                 <img src={`https://images.unsplash.com/photo-${1550000000000+i}?w=600&q=80`} alt="purchased media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 
                 <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1.5 rounded-md text-foreground border border-border/50">
                    {isVideo ? <PlayCircle className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                 </div>
                 
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 sm:p-4">
                    <span className="text-white text-sm font-bold truncate">Exclusive Set part {i}</span>
                    <span className="text-white/70 text-xs mt-1">Creator Name • Unlocked Oct 24</span>
                 </div>
              </div>
            )
          })}
       </div>

       {/* Empty State Mockup if no purchases */}
       {/*
       <div className="flex flex-col items-center justify-center bg-background border border-dashed border-border rounded-2xl p-12 text-center mt-8">
          <FolderHeart className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-bold text-lg">No purchases yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">When you unlock PPV messages or buy content from creators, it will be safely stored here forever.</p>
       </div>
       */}

    </UserLayout>
  );
};
export default UserVault;
