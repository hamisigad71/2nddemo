import { useState } from 'react';
import { ShieldCheck, MapPin, Share, MoreHorizontal, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreatorProfile = () => {
  const [activeTab, setActiveTab] = useState('posts');
  
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Cover */}
      <div className="h-48 md:h-64 lg:h-80 w-full relative bg-muted">
        <img src="https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80" alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
           <Link to="/" className="text-xl font-bold tracking-tighter text-white">Hideaway<span className="text-primary">.</span></Link>
           <div className="flex gap-3">
             <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
               <Share className="w-5 h-5" />
             </button>
             <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
               <MoreHorizontal className="w-5 h-5" />
             </button>
           </div>
        </nav>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-end gap-5 z-10">
            <div className="relative">
              <img src="https://i.pravatar.cc/300?img=12" alt="Profile" className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-background object-cover bg-muted shadow-lg" />
              <div className="absolute bottom-2 right-2 bg-background rounded-full p-0.5 shadow-sm">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
            </div>
            <div className="pb-2">
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                Jane Doe 
              </h1>
              <p className="text-muted-foreground font-medium text-lg">@janedoe</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto pb-2 z-10">
            <Link to="/checkout" className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20">
              Subscribe for KES 500
            </Link>
            <button className="flex-1 sm:flex-none flex items-center justify-center bg-input/30 hover:bg-input border border-border text-foreground font-bold px-6 py-3 rounded-xl transition-colors">
              Tip KES 100
            </button>
          </div>
        </div>

        <div className="flex gap-8 mb-8 border-b border-border">
          {['posts', 'media', 'about'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Bio Section */}
        {activeTab === 'about' && (
          <div className="bg-input/10 border border-border p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-3">About Jane</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Welcome to my page! I create exclusive lifestyle, fitness, and fashion content just for my subscribers. Join the community to get daily workouts and styling tips!
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <MapPin className="w-4 h-4 text-primary" /> Nairobi, Kenya
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <span className="font-bold text-lg">12.5k</span> <span className="text-muted-foreground">Followers</span>
              </div>
            </div>
          </div>
        )}

        {/* Posts Section */}
        {activeTab === 'posts' && (
          <div className="flex flex-col gap-6">
            {/* Free Post */}
            <div className="bg-background border border-border rounded-2xl overflow-hidden">
              <div className="p-4 flex items-center gap-3 border-b border-border">
                <img src="https://i.pravatar.cc/150?img=12" alt="avatar" className="w-10 h-10 rounded-full" />
                <div>
                  <div className="font-bold text-sm text-foreground">Jane Doe</div>
                  <div className="text-xs text-muted-foreground">2 hours ago</div>
                </div>
              </div>
              <div className="p-4">
                <p className="mb-4">Just finished a killer workout at the gym! Check out this quick routine you can do at home. 💪🔥</p>
                <div className="rounded-xl overflow-hidden bg-muted aspect-video relative flex items-center justify-center">
                   <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80" alt="post media" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Locked Premium Post */}
            <div className="bg-background border border-border rounded-2xl overflow-hidden relative">
               <div className="p-4 flex items-center gap-3 border-b border-border">
                <img src="https://i.pravatar.cc/150?img=12" alt="avatar" className="w-10 h-10 rounded-full" />
                <div>
                  <div className="font-bold text-sm text-foreground">Jane Doe</div>
                  <div className="text-xs text-muted-foreground">Yesterday</div>
                </div>
              </div>
              <div className="p-4">
                <p className="mb-4 text-muted-foreground">Detailed full-body workout routine + meal plan for the week. Only for my subscribers! 🥗✨</p>
                
                <div className="rounded-xl overflow-hidden border border-border aspect-square sm:aspect-video flex flex-col items-center justify-center relative p-6 text-center bg-input/20">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80')] opacity-30 blur-md grayscale"></div>
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-md"></div>
                  
                  <div className="bg-background/80 border border-white/10 p-4 rounded-full mb-4 shadow-xl z-10">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-xl font-bold mb-2 z-10 text-foreground">Subscribe to Unlock</h4>
                  <p className="text-sm text-muted-foreground mb-6 z-10 max-w-sm">
                    This content is for subscribers only. Join for KES 500/month to unlock all exclusive posts and media.
                  </p>
                  <Link to="/checkout" className="z-10 bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20">
                    Unlock Content
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CreatorProfile;
