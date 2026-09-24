import UserLayout from '../../components/UserLayout';
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from 'lucide-react';

const UserDashboard = () => {
  return (
    <UserLayout>
       <div className="mb-8">
           <h1 className="text-2xl font-bold tracking-tight">Your Feed</h1>
           <p className="text-sm text-muted-foreground">Latest posts from creators you're subscribed to.</p>
       </div>

       <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
             <article key={i} className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
                
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between border-b border-border/50">
                   <div className="flex items-center gap-3 cursor-pointer">
                      <img src={`https://i.pinimg.com/1200x/6e/e3/66/6ee366544934ea9423263d4b8f9e9d80.jpg`} alt="creator" className="w-10 h-10 rounded-full object-cover border border-border" />
                      <div>
                         <div className="font-bold text-sm flex items-center gap-1 hover:underline">
                            Creator Name {i}
                         </div>
                         <div className="text-xs text-muted-foreground">2 hours ago</div>
                      </div>
                   </div>
                   <button className="p-2 text-muted-foreground hover:bg-muted rounded-full">
                      <MoreHorizontal className="w-5 h-5" />
                   </button>
                </div>

                {/* Post Content */}
                <div className="p-4">
                   <p className="text-sm mb-4">
                      Just uploaded a brand new exclusive set! Let me know what you think in the comments below! 🌟✨
                   </p>
                </div>
                
                <div className="relative bg-muted cursor-pointer group">
                   <img src={`https://i.pinimg.com/1200x/6e/e3/66/6ee366544934ea9423263d4b8f9e9d80.jpg`} alt="post media" className="w-full aspect-[4/5] object-cover" />
                </div>

                {/* Post Actions */}
                <div className="p-4 flex items-center justify-between border-t border-border/50">
                   <div className="flex items-center gap-6">
                      <button className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group">
                         <div className="p-2 rounded-full group-hover:bg-red-500/10"><Heart className="w-5 h-5" /></div>
                         <span className="text-sm font-bold">124</span>
                      </button>
                      <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                         <div className="p-2 rounded-full group-hover:bg-primary/10"><MessageCircle className="w-5 h-5" /></div>
                         <span className="text-sm font-bold">12</span>
                      </button>
                      <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-bold text-sm ml-2">
                         Send Tip
                      </button>
                   </div>
                   <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                      <Bookmark className="w-5 h-5" />
                   </button>
                </div>

             </article>
          ))}
       </div>
    </UserLayout>
  );
};
export default UserDashboard;
