import { useState, useEffect } from 'react';
import { ShieldCheck, MapPin, Share, MoreHorizontal, Lock } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getEscorts } from '../../lib/mockData';

const CreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');

  const creator = getEscorts().find(c => c.id === id);

  useEffect(() => {
    if (!creator && id) {
      navigate('/discover');
    }
  }, [creator, id, navigate]);

  if (!creator) return null;
  
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Cover */}
      <div className="h-48 md:h-64 lg:h-80 w-full relative bg-muted">
        <img src={creator.cover_image || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80'} alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
           <Link to="/" className="text-xl font-bold tracking-tighter text-white">The Gents Dollhouse<span className="text-primary">.</span></Link>
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
              <img src={creator.avatar} alt="Profile" className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-background object-cover bg-muted shadow-lg" />
              {creator.isVerified && (
                <div className="absolute bottom-2 right-2 bg-background rounded-full p-0.5 shadow-sm">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
              )}
            </div>
            <div className="pb-2">
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                {creator.name} 
              </h1>
              <p className="text-muted-foreground font-medium text-lg">@{creator.name.replace(/\s+/g, '').toLowerCase()}</p>
              {creator.age && <p className="text-sm text-muted-foreground mt-0.5">{creator.age} yrs · {creator.location}</p>}
            </div>
          </div>
          
          <div className="flex flex-row gap-3 w-full md:w-auto pb-2 z-10">
            <Link to="/checkout" className="flex-1 md:flex-none flex items-center justify-center gap-1 sm:gap-2 bg-primary text-primary-foreground font-bold px-3 sm:px-8 py-3 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20 text-sm sm:text-base whitespace-nowrap">
              Book for KES {creator.price_hr}/hr
            </Link>
            <button className="flex-1 md:flex-none flex items-center justify-center bg-input/30 hover:bg-input border border-border text-foreground font-bold px-3 sm:px-6 py-3 rounded-xl transition-colors text-sm sm:text-base whitespace-nowrap">
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
            <h3 className="text-lg font-bold mb-3">About {creator.name.split(' ')[0]}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {creator.bio}
            </p>
            {creator.services && creator.services.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Services</p>
                <div className="flex flex-wrap gap-2">
                  {creator.services.map(s => (
                    <span key={s} className="text-xs font-bold px-3 py-1.5 bg-input/20 border border-border rounded-full text-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <MapPin className="w-4 h-4 text-primary" /> {creator.location}
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <span className="font-bold text-lg">{creator.rating * 2.5}k</span> <span className="text-muted-foreground">Followers</span>
              </div>
            </div>
          </div>
        )}

        {/* Posts Section */}
        {activeTab === 'posts' && (
          <div className="flex flex-col gap-6">
            {/* Free Post */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-row items-center gap-3">
                  <div className="relative">
                    <img src={creator.avatar} alt="avatar" className="w-12 h-12 rounded-full border-2 border-background object-cover" />
                    {creator.isVerified && (
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[15px] leading-tight text-foreground">{creator.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">2 hours ago</div>
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors p-2">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 pb-3">
                <p className="text-[15px] leading-relaxed">Hey loves, having an amazing day! ✨ Check out a little sneak peek from my latest shoot.</p>
              </div>
              
              {/* Image Container */}
              <div className="relative w-full bg-black/90 flex justify-center items-center overflow-hidden max-h-[600px] border-y border-border/50">
                 {/* Blurred Background to fill space */}
                 <div 
                   className="absolute inset-0 opacity-40 blur-xl scale-110" 
                   style={{ backgroundImage: `url(${creator.gallery && creator.gallery.length > 0 ? creator.gallery[0] : creator.avatar})`, backgroundPosition: 'center', backgroundSize: 'cover' }}
                 />
                 <img 
                   src={creator.gallery && creator.gallery.length > 0 ? creator.gallery[0] : creator.avatar} 
                   alt="post media" 
                   className="relative w-full max-h-[600px] object-contain z-10" 
                 />
              </div>
              
              <div className="p-4 flex items-center justify-between bg-card">
                 <div className="text-sm font-bold text-muted-foreground">0 likes</div>
                 <button className="text-sm font-bold flex items-center gap-2 hover:text-primary transition-colors">
                   <Share className="w-4 h-4" /> Share
                 </button>
              </div>
            </div>

            {/* Locked Premium Post */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col mt-2">
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-row items-center gap-3">
                  <div className="relative">
                    <img src={creator.avatar} alt="avatar" className="w-12 h-12 rounded-full border-2 border-background object-cover" />
                    {creator.isVerified && (
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[15px] leading-tight text-foreground flex items-center gap-2">{creator.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Yesterday</div>
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors p-2">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 pb-3">
                <p className="text-[15px] leading-relaxed">Exclusive behind-the-scenes content & private gallery just for my VIPs! 💎✨</p>
              </div>
              
              <div className="relative w-full max-h-[600px] flex justify-center items-center border-y border-border/50 overflow-hidden bg-black aspect-[4/5] sm:aspect-video">
                 {/* Premium Background blur */}
                 <div 
                   className="absolute inset-0 opacity-50 blur-2xl scale-110" 
                   style={{ backgroundImage: `url(${creator.cover_image || creator.avatar})`, backgroundPosition: 'center', backgroundSize: 'cover' }}
                 />
                 
                 <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-md w-full mx-auto backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl shadow-2xl m-4">
                    <div className="bg-primary/20 text-primary p-4 rounded-full mb-5 shadow-[0_0_30px_rgba(255,0,0,0.3)] border border-primary/30">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h4 className="text-2xl font-black mb-2 text-white">Subscribe to Unlock</h4>
                    <p className="text-sm text-gray-300 mb-8 max-w-xs mx-auto leading-relaxed">
                      This content is for subscribers only. Join for KES 500/month to unlock all exclusive posts and media.
                    </p>
                    <Link to="/checkout" className="group w-full max-w-xs flex items-center justify-center gap-2 bg-primary text-primary-foreground font-black px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(255,0,0,0.2)] hover:shadow-[0_0_30px_rgba(255,0,0,0.4)] hover:scale-[1.02]">
                      Unlock Content
                    </Link>
                 </div>
              </div>
              
              <div className="p-4 flex items-center justify-between bg-card text-muted-foreground">
                 <div className="text-sm font-bold flex items-center gap-2">
                   <Lock className="w-4 h-4" /> Premium Post
                 </div>
                 <button className="text-sm font-bold flex items-center gap-2 hover:text-foreground transition-colors">
                   <Share className="w-4 h-4" /> Share
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CreatorProfile;
