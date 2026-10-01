import UserLayout from '../../components/UserLayout';
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
              <div key={i} className="group relative aspect-[4/5] bg-muted rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 ring-1 ring-border/50 hover:ring-primary/50">
                 <img src={`https://i.pinimg.com/736x/ec/69/8d/ec698da362858bc36a6ab5a015cf9e34.jpg`} alt="purchased media" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                 
                 <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md p-2 rounded-xl text-white shadow-lg ring-1 ring-white/20">
                    {isVideo ? <PlayCircle className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                 </div>
                 
                 {/* Gradient overlay */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 
                 {/* Content overlay */}
                 <div className="absolute inset-0 flex flex-col justify-end p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <span className="text-white text-sm font-bold truncate tracking-wide">Exclusive Set part {i}</span>
                    <span className="text-white/60 text-[10px] uppercase font-semibold tracking-wider mt-1">Creator Name • Unlocked Oct 24</span>
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
