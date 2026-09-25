import { useState } from 'react';
import UserLayout from '../../components/UserLayout';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Users, FolderHeart, Wallet } from 'lucide-react';

const FeedPost = ({ i }: { i: number }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(124 + i * 3);

  const toggleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleTip = () => {
    alert(`Tip module opened for Creator ${i}! 💸`);
  };

  return (
    <article className="bg-background border border-border/60 rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-300 hover:shadow-primary/5 hover:border-primary/20">
      
      {/* Post Header */}
      <div className="p-4 md:p-5 flex items-center justify-between border-b border-border/30 bg-muted/20 backdrop-blur-md">
         <div className="flex items-center gap-3 cursor-pointer group">
            <img src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80`} alt="creator" className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 group-hover:border-primary transition-colors" />
            <div>
               <div className="font-bold text-sm md:text-base flex items-center gap-1 group-hover:text-primary transition-colors">
                  Creator Name {i}
               </div>
               <div className="text-xs text-muted-foreground font-medium tracking-wide uppercase mt-0.5">{2 * i} hours ago</div>
            </div>
         </div>
         <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5" />
         </button>
      </div>

      {/* Post Content Details */}
      <div className="p-5">
         <p className="text-sm md:text-base leading-relaxed text-foreground/90 font-medium">
            Just uploaded a brand new exclusive set! Let me know what you think in the comments below! 🌟✨
         </p>
      </div>
      
      {/* Post Media */}
      <div className="relative bg-black cursor-pointer group px-0">
         <img src={`https://images.unsplash.com/photo-1549492423-400259a2e574?w=800&h=1000&fit=crop&q=80`} alt="post media" className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
         <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Post Actions */}
      <div className="p-5 flex items-center justify-between border-t border-border/30 bg-muted/20 backdrop-blur-md">
         <div className="flex items-center gap-4 md:gap-6">
            <button 
                onClick={toggleLike}
                className={`flex items-center gap-2 transition-colors group ${isLiked ? 'text-primary' : 'text-muted-foreground'}`}
            >
               <div className={`p-2 rounded-full transition-all ${isLiked ? 'bg-primary/20' : 'group-hover:bg-primary/10 group-hover:text-primary'}`}>
                   <Heart className={`w-6 h-6 transition-transform active:scale-90 ${isLiked ? 'fill-primary text-primary' : ''}`} />
               </div>
               <span className={`text-sm font-bold transition-opacity ${isLiked ? 'opacity-100' : 'opacity-80 group-hover:opacity-100 group-hover:text-primary'}`}>
                 {likesCount}
               </span>
            </button>
            
            <button className="flex items-center gap-2 text-muted-foreground transition-colors group">
               <div className="p-2 rounded-full group-hover:bg-muted group-hover:text-foreground transition-all">
                  <MessageCircle className="w-6 h-6 transition-transform active:scale-90" />
               </div>
               <span className="text-sm font-bold opacity-80 group-hover:opacity-100 group-hover:text-foreground transition-opacity">12</span>
            </button>
            
            <button 
                onClick={handleTip}
                className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-full px-4 py-1.5 font-bold text-sm md:ml-2 ring-1 ring-primary/30 hover:ring-primary active:scale-95"
            >
               Send Tip
            </button>
         </div>
         <button 
            onClick={() => setIsSaved(!isSaved)}
            className={`p-2 rounded-full transition-colors active:scale-95 ${isSaved ? 'text-foreground bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
         >
            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
         </button>
      </div>

    </article>
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

       <div className="space-y-8">
          {[1, 2, 3, 4, 5].map((i) => (
             <FeedPost key={i} i={i} />
          ))}
       </div>
    </UserLayout>
  );
};
export default UserDashboard;

