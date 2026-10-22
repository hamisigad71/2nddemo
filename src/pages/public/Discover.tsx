import { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle2, MapPin, Lock, Flame, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import { supabase } from '../../lib/supabase';
import { getDiscoverCreators, HARDCODED_DISCOVER_CREATORS } from '../../lib/db';
import { getDefaultAvatar } from '../../lib/avatar';
import LiveNowTray from '../../components/LiveNowTray';

const Discover = () => {
  const [activeTab, setActiveTab] = useState('trending');
  const [search, setSearch] = useState('');
  const [creators, setCreators] = useState<any[]>(HARDCODED_DISCOVER_CREATORS);
  const [loading, setLoading] = useState(false);

  const fetchCreators = async () => {
    try {
      const data = await getDiscoverCreators();
      setCreators(data);
    } catch (err) {
      console.error('Failed to load discover creators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();

    const handleUpdate = () => fetchCreators();
    window.addEventListener('posts_updated', handleUpdate);

    // Real-time listener for newly registered creators or new posts
    const channel = supabase
      .channel('discover_creators_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchCreators();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchCreators();
      })
      .subscribe();

    return () => {
      window.removeEventListener('posts_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Tab-based sorting
  const sorted = [...creators].sort((a, b) => {
    if (activeTab === 'new') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (activeTab === 'popular') {
      const subsA = parseInt(String(a.subs).replace(/\D/g, ''), 10) || 0;
      const subsB = parseInt(String(b.subs).replace(/\D/g, ''), 10) || 0;
      return subsB - subsA;
    }
    // 'trending' (default): Creators with real feed posts first, then highest postsCount & subs
    if (a.hasPosts !== b.hasPosts) {
      return a.hasPosts ? -1 : 1;
    }
    return (b.postsCount || 0) - (a.postsCount || 0);
  });

  const filtered = sorted.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.handle.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="border-b border-border bg-background/95 sticky top-0 z-20 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center w-full md:w-auto">
            <Link to="/" className="text-xl font-bold text-primary mr-2 md:hidden">The Gents Dollhouse.</Link>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search creators..." 
                className="w-full bg-input/50 border border-border rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {['trending', 'popular', 'new'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold capitalize whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-input/30 hover:bg-input text-muted-foreground border border-transparent hover:border-border'}`}
              >
                {tab}
              </button>
            ))}
            <button className="px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap bg-input/30 hover:bg-input flex items-center gap-1 transition-colors border border-transparent hover:border-border ml-2">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 pb-24 md:pb-8 space-y-8">
        {/* Live Broadcasts Carousel */}
        <LiveNowTray />

        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-3xl font-bold capitalize">{activeTab} Creators</h1>
            <span className="text-xs text-muted-foreground font-semibold">
              {filtered.length} verified creators
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading feed creators...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground space-y-2">
              <p className="font-bold text-lg text-white">No creators found</p>
              <p className="text-sm">Try searching with a different name or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
             {filtered.map((creator, i) => (
               <Link 
                 to={`/creator/${creator.id}`} 
                 state={{ creator }} 
                 key={creator.id || i} 
                 className="group relative flex flex-col aspect-[3/4] sm:aspect-[4/5] bg-muted border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
               >
                  {/* Full Background Cover */}
                  <img 
                    src={creator.cover && !/\.(mp4|webm|mov|m4v)/i.test(creator.cover) ? creator.cover : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80"} 
                    alt="cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80";
                    }}
                    className="absolute inset-0 w-full h-full object-cover object-top opacity-90 group-hover:scale-110 group-hover:blur-[2px] transition-all duration-500" 
                    loading="lazy" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
                  
                  {/* Lock Overlay on Hover */}
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/20 backdrop-blur-sm pointer-events-none">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40 transform scale-75 group-hover:scale-100 transition-transform duration-500 mb-2">
                      <Lock className="w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <span className="font-bold text-white text-xs sm:text-sm drop-shadow-md">View Profile</span>
                  </div>

                  {/* Top Badges (Active Feed Badge & Lock) */}
                  <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                    {creator.hasPosts ? (
                      <span className="bg-red-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                        <Flame className="w-3 h-3 text-yellow-300" /> Active Feed
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="bg-black/50 backdrop-blur-md p-1.5 sm:p-2 rounded-full border border-white/10 shadow-sm">
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white/90" />
                    </div>
                  </div>
                  
                  {/* Info Container Placed over Gradient */}
                  <div className="relative z-10 px-3 pb-3 sm:px-5 sm:pb-5 pt-10 mt-auto flex flex-col text-white transition-transform duration-300 group-hover:translate-y-2 group-hover:opacity-40">
                    {/* Avatar & Category */}
                    <div className="flex items-end justify-between mb-2 sm:mb-3">
                      <img 
                        src={creator.avatar} 
                        alt="avatar" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getDefaultAvatar(creator.name);
                        }}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-primary/50 shadow-md object-cover bg-background" 
                        loading="lazy" 
                      />
                      <div className="text-[10px] sm:text-xs font-semibold text-secondary uppercase tracking-wider backdrop-blur-sm bg-black/30 px-2 py-0.5 rounded border border-white/10">{creator.category}</div>
                    </div>
                    
                    {/* Name & Handle */}
                    <h3 className="text-sm sm:text-xl font-bold flex items-center gap-1 text-white truncate w-full shadow-sm">
                      <span className="truncate">{creator.name}</span>
                      {creator.isVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-blue-500 shrink-0 drop-shadow-md" title="Verified Creator" />
                      )}
                    </h3>
                    <p className="text-[10px] sm:text-sm text-gray-300 font-medium truncate drop-shadow-sm">{creator.handle}</p>
                    
                    {/* Location */}
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-300 mt-1 sm:mt-2 truncate drop-shadow-sm">
                      <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{creator.location}</span>
                    </div>
                    
                    {/* Stats & Price Bottom bar */}
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20 flex flex-row items-center justify-between mt-auto gap-1">
                      <div className="text-[10px] sm:text-xs font-medium text-gray-300 drop-shadow-sm flex items-center gap-1.5">
                        <span>{creator.subs}</span>
                        {creator.postsCount > 0 && (
                          <span className="text-zinc-400">• {creator.postsCount} posts</span>
                        )}
                      </div>
                      <div className="text-[11px] sm:text-sm font-black text-primary drop-shadow-sm">{creator.price}</div>
                    </div>
                  </div>
               </Link>
             ))}
          </div>
          )}
        </div>
      </main>
    </div>
    <BottomNav />
    </>
  );
};

export default Discover;
