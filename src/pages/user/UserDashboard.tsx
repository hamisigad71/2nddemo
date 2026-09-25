import { useState } from 'react';
import UserLayout from '../../components/UserLayout';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Users, FolderHeart, Wallet } from 'lucide-react';
import TipModal from '../../components/TipModal';

const mockPosts = [
  { id: 1, name: "@janedoe", time: "2h ago", avatar: "1534528741775-53994a69daeb", image: "https://i.pinimg.com/1200x/7e/b0/56/7eb056c0c86c3dcf22324e8071e87d61.jpg" },
  { id: 2, name: "@alexsmith", time: "4h ago", avatar: "1506794778202-cad84cf45f1d", image: "https://i.pinimg.com/736x/aa/f4/5c/aaf45cd23fc53d552829bc05589744e4.jpg" },
  { id: 3, name: "@creative_mind", time: "5h ago", avatar: "1494790108377-be9c29b29330", image: "https://i.pinimg.com/736x/f5/d2/ff/f5d2ff9093bd28e175a4825e9dd2e9fb.jpg" },
  { id: 4, name: "@photo_guru", time: "8h ago", avatar: "1531746020798-e6953c6e8e04", image: "https://i.pinimg.com/736x/49/19/3d/49193d39772165c1817cbe5249ef2f0c.jpg" },
  { id: 5, name: "@artist_vibe", time: "12h ago", avatar: "1554151228-14d9def656e4", image: "https://i.pinimg.com/736x/c8/eb/9a/c8eb9a8bd20e1964d2d6e7b3a0404e0a.jpg" },
  { id: 6, name: "@daily_vlog", time: "18h ago", avatar: "1527980965255-d3b416303d12", image: "https://i.pinimg.com/736x/7c/a4/cf/7ca4cf27123cbec7fe3d1031149dd946.jpg" },
  { id: 7, name: "@fitness_pro", time: "1d ago", avatar: "1517841905240-472988babdf9", image: "https://i.pinimg.com/736x/55/cd/63/55cd63e0c8df641842d2a8834ecaf87b.jpg" },
  { id: 8, name: "@tech_reviewer", time: "2d ago", avatar: "1438761681033-6461ffad8d80", image: "https://i.pinimg.com/736x/f3/64/19/f36419b462738559046d218a15e96133.jpg" },
];

const FeedPost = ({ post, idx }: { post: any, idx: number }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [likesCount, setLikesCount] = useState(124 + idx * 7);

  const toggleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleTip = () => {
    setIsTipOpen(true);
  };

  return (
    <>
      <article className="bg-background border border-border/60 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl relative transition-all duration-300 hover:shadow-primary/5 hover:border-primary/30 flex flex-col h-full">
        
        {/* Post Header */}
        <div className="p-3 md:p-4 flex items-center justify-between border-b border-border/30 bg-muted/20 backdrop-blur-md shrink-0">
           <div className="flex items-center gap-3 cursor-pointer group min-w-0">
              <img src={`https://images.unsplash.com/photo-${post.avatar}?w=150&h=150&fit=crop&q=80`} alt="creator" className="w-10 h-10 rounded-full object-cover border border-primary/20 group-hover:border-primary transition-colors shrink-0" />
              <div className="min-w-0">
                 <div className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                    {post.name}
                 </div>
                 <div className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase mt-0.5">{post.time}</div>
              </div>
           </div>
           <button className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors shrink-0 ml-2">
              <MoreHorizontal className="w-4 h-4" />
           </button>
        </div>

        {/* Post Content Details */}
        <div className="p-4 shrink-0">
           <p className="text-sm leading-relaxed text-foreground/90 font-medium line-clamp-3">
              Just uploaded a brand new exclusive set! Let me know what you think in the comments below! 🌟✨
           </p>
        </div>
        
        {/* Post Media */}
        <div className="relative bg-black cursor-pointer group px-0 flex-1 flex flex-col justify-center overflow-hidden">
           <img src={post.image} alt="post media" referrerPolicy="no-referrer" className="w-full h-full object-cover aspect-[4/5] object-center transition-transform duration-700 group-hover:scale-[1.02]" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>

        {/* Post Actions */}
        <div className="p-3 md:p-4 flex items-center justify-between border-t border-border/30 bg-muted/20 backdrop-blur-md shrink-0">
           <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              <button 
                  onClick={toggleLike}
                  className={`flex items-center gap-1.5 transition-colors group ${isLiked ? 'text-primary' : 'text-muted-foreground'}`}
              >
                 <div className={`p-1.5 rounded-full transition-all ${isLiked ? 'bg-primary/20' : 'group-hover:bg-primary/10 group-hover:text-primary'}`}>
                     <Heart className={`w-5 h-5 transition-transform active:scale-90 ${isLiked ? 'fill-primary text-primary' : ''}`} />
                 </div>
                 <span className={`text-xs font-bold transition-opacity ${isLiked ? 'opacity-100' : 'opacity-80 group-hover:opacity-100 group-hover:text-primary'}`}>
                   {likesCount}
                 </span>
              </button>
              
              <button className="flex items-center gap-1.5 text-muted-foreground transition-colors group">
                 <div className="p-1.5 rounded-full group-hover:bg-muted group-hover:text-foreground transition-all">
                    <MessageCircle className="w-5 h-5 transition-transform active:scale-90" />
                 </div>
                 <span className="text-xs font-bold opacity-80 group-hover:opacity-100 group-hover:text-foreground transition-opacity">12</span>
              </button>
           </div>
           
           <div className="flex items-center gap-1.5 shrink-0 ml-2">
               <button 
                  onClick={handleTip}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-full px-3 py-1 font-bold text-[11px] ring-1 ring-primary/30 hover:ring-primary active:scale-95 whitespace-nowrap"
               >
                  Tip 💸
               </button>
               <button 
                  onClick={() => setIsSaved(!isSaved)}
                  className={`p-1.5 rounded-full transition-colors active:scale-95 ${isSaved ? 'text-foreground bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
               >
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
               </button>
           </div>
        </div>
      </article>

      <TipModal 
        isOpen={isTipOpen}
        onClose={() => setIsTipOpen(false)}
        creatorName={post.name}
      />
    </>
  );
};

const UserDashboard = () => {
  return (
    <UserLayout>
       <div className="mb-8">
           <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Dashboard</h1>
           <p className="text-muted-foreground text-sm md:text-base font-medium">Welcome back! Here's a quick overview before your feed.</p>
       </div>

       {/* User Stats Overview */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
           {[ 
               { label: "Active Subs", value: "3", icon: <Users className="w-5 h-5 text-primary" />, glow: "bg-primary/20" },
               { label: "Saved Posts", value: "24", icon: <Bookmark className="w-5 h-5 text-secondary" />, glow: "bg-secondary/20" },
               { label: "Purchases", value: "8", icon: <FolderHeart className="w-5 h-5 text-emerald-500" />, glow: "bg-emerald-500/20" },
               { label: "Wallet Balance", value: "KES 5k", icon: <Wallet className="w-5 h-5 text-amber-500" />, glow: "bg-amber-500/20" }
           ].map((stat, i) => (
               <div key={i} className="bg-background border border-border/40 rounded-2xl p-4 md:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                  <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity ${stat.glow}`} />
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                     <div className="p-2 rounded-xl bg-muted/50 border border-border/50">
                        {stat.icon}
                     </div>
                  </div>
                  <div className="relative z-10">
                     <p className="text-xs text-muted-foreground font-bold tracking-wider uppercase mb-1">{stat.label}</p>
                     <h3 className="text-2xl font-black">{stat.value}</h3>
                  </div>
               </div>
           ))}
       </div>

       <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Your Feed</h2>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {mockPosts.map((post, index) => (
             <FeedPost key={post.id} post={post} idx={index} />
          ))}
       </div>
    </UserLayout>
  );
};

export default UserDashboard;

