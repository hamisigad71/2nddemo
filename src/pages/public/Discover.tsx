import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, MapPin, Lock, Flame, Loader2, Sun, Moon, Sparkles, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import { supabase } from '../../lib/supabase';
import {
  getDiscoverCreators,
  getFanSubscriptions,
  checkUserSubscription,
  getUserProfile,
  getPlatformAds,
  trackAdImpression,
  trackAdClick,
  type PlatformAd
} from '../../lib/db';
import { getDefaultAvatar } from '../../lib/avatar';
import { formatLastSeenStatus } from '../../lib/dateUtils';
import LiveNowTray from '../../components/LiveNowTray';
import SubscribeModal from '../../components/SubscribeModal';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { filterAndSortCreators, type CreatorDirectoryFilter, type CreatorGenderFilter } from '../../lib/creatorDirectory';
import './Discover.css';

const Discover = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CreatorDirectoryFilter>('trending');
  const [genderFilter, setGenderFilter] = useState<CreatorGenderFilter>('all');
  const [search, setSearch] = useState('');
  const [creators, setCreators] = useState<any[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<PlatformAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubscribedIds, setActiveSubscribedIds] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [subscribeModalCreator, setSubscribeModalCreator] = useState<any | null>(null);

  const fetchUserSubscriptions = useCallback(async () => {
    if (!user?.id) {
      setActiveSubscribedIds(new Set());
      setUserRole(null);
      return;
    }

    try {
      const up = await getUserProfile(user.id);
      if (up?.role) setUserRole(up.role);
    } catch {}

    try {
      const subs = await getFanSubscriptions(user.id);
      const activeIds = new Set<string>();
      subs.forEach((s: any) => {
        if (s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > new Date())) {
          activeIds.add(s.creator_id);
        }
      });
      setActiveSubscribedIds(activeIds);
    } catch (e) {
      console.warn('Could not load user active subscriptions:', e);
    }
  }, [user?.id]);

  const fetchCreators = async () => {
    try {
      const [data, ads] = await Promise.all([
        getDiscoverCreators(),
        getPlatformAds('users', false)
      ]);
      setCreators(data);
      const activeCreatorAds = ads.filter(a => a.ad_type === 'creator' && a.status === 'active');
      setSponsoredAds(activeCreatorAds);
      activeCreatorAds.forEach(a => trackAdImpression(a.id));
    } catch (err) {
      console.error('Failed to load discover creators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
    fetchUserSubscriptions();

    const handleUpdate = () => {
      fetchCreators();
      fetchUserSubscriptions();
    };
    window.addEventListener('posts_updated', handleUpdate);
    window.addEventListener('profile_updated', handleUpdate);
    window.addEventListener('creators_updated', handleUpdate);
    window.addEventListener('tgd_ads_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Real-time listener for newly registered creators or new posts
    const channel = supabase
      .channel('discover_creators_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchCreators();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchCreators();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_profiles' }, () => {
        fetchCreators();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        fetchUserSubscriptions();
      })
      .subscribe();

    return () => {
      window.removeEventListener('posts_updated', handleUpdate);
      window.removeEventListener('profile_updated', handleUpdate);
      window.removeEventListener('creators_updated', handleUpdate);
      window.removeEventListener('tgd_ads_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [fetchUserSubscriptions]);

  const handleCreatorCardClick = async (e: React.MouseEvent, creator: any) => {
    e.preventDefault();

    // 1. If current user owns this creator account, allow viewing directly
    if (user && (user.id === creator.id || user.email === creator.email)) {
      navigate(`/creator/${creator.id}`, { state: { creator } });
      return;
    }

    // 2. If current user is platform admin, allow inspecting directly
    if (userRole === 'admin') {
      navigate(`/creator/${creator.id}`, { state: { creator } });
      return;
    }

    // 3. If user is actively subscribed, allow viewing
    if (activeSubscribedIds.has(creator.id)) {
      navigate(`/creator/${creator.id}`, { state: { creator } });
      return;
    }

    // 4. Double check live subscription in case newly purchased
    if (user?.id) {
      const liveSub = await checkUserSubscription(user.id, creator.id);
      if (liveSub && (!liveSub.expires_at || new Date(liveSub.expires_at) > new Date())) {
        setActiveSubscribedIds(prev => new Set([...prev, creator.id]));
        navigate(`/creator/${creator.id}`, { state: { creator } });
        return;
      }
    }

    // 5. Creator is locked - prompt to subscribe and pay before viewing profile
    setSubscribeModalCreator(creator);
  };
  
  const sorted = filterAndSortCreators(creators, activeTab, genderFilter);

  const searchClean = search.trim().toLowerCase();
  const filtered = sorted.filter(c => {
    if (!searchClean) return true;
    return (
      Boolean(c.name && c.name.toLowerCase().includes(searchClean)) || 
      Boolean(c.handle && c.handle.toLowerCase().includes(searchClean)) ||
      Boolean(c.category && c.category.toLowerCase().includes(searchClean)) ||
      Boolean(c.location && c.location.toLowerCase().includes(searchClean))
    );
  });

  return (
    <>
    <div className="discover-page min-h-screen bg-background text-foreground flex flex-col">
      <div className="discover-header border-b border-border bg-background/95 sticky top-0 z-20 p-4">
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
          <div className="discover-filters flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar" role="group" aria-label="Filter creators">
            {([
              ['all', 'All Creators'],
              ['verified', 'Verified'],
              ['trending', 'Trending'],
              ['popular', 'Popular'],
              ['new', 'New'],
            ] as const).map(([filter, label]) => (
              <button 
                key={filter}
                type="button"
                onClick={() => setActiveTab(filter)}
                aria-pressed={activeTab === filter}
                className={`discover-filter-button px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === filter ? 'bg-primary text-primary-foreground' : 'bg-input/30 hover:bg-input text-muted-foreground border border-transparent hover:border-border'}`}
              >
                {label}
              </button>
            ))}
            <div className="flex items-center gap-2 border-l border-border pl-2" role="group" aria-label="Filter creators by gender">
              {([
                ['all', 'All genders'],
                ['male', 'Male'],
                ['female', 'Female'],
              ] as const).map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setGenderFilter(filter)}
                  aria-pressed={genderFilter === filter}
                  className={`discover-filter-button px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${genderFilter === filter ? 'bg-primary text-primary-foreground' : 'bg-input/30 hover:bg-input text-muted-foreground border border-transparent hover:border-border'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-input/30 hover:bg-input text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border shrink-0"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme appearance"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>
      </div>
      
      <main className="discover-main flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 pb-24 md:pb-8 space-y-8">
        {/* Live Broadcasts Carousel */}
        <LiveNowTray />

        {/* Sponsored Creators Spotlight */}
        {sponsoredAds.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className="text-sm sm:text-base font-black text-foreground tracking-tight">
                  Featured & Sponsored Creators
                </h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                Platform Spotlight
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {sponsoredAds.map(ad => (
                <div
                  key={ad.id}
                  onClick={() => {
                    trackAdClick(ad.id);
                    if (ad.creator_id) {
                      navigate(`/creator/${ad.creator_id}`);
                    } else if (ad.cta_url) {
                      window.open(ad.cta_url, '_blank');
                    }
                  }}
                  className="group relative bg-gradient-to-r from-card to-card/60 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-3.5 flex items-center gap-3.5 transition-all shadow-sm hover:shadow-md cursor-pointer overflow-hidden"
                >
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-border/80">
                    <img
                      src={ad.creator_avatar || ad.image_url}
                      alt={ad.creator_name || ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1 left-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 block ring-2 ring-black" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-foreground truncate">
                        {ad.creator_name || ad.sponsor_name}
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
                        Sponsored
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-1 font-medium">
                      {ad.title}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
                      <span>View Profile & Exclusive Content</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-3xl font-bold">
              {activeTab === 'all' ? 'All Creators' : `${activeTab[0].toUpperCase()}${activeTab.slice(1)} Creators`}
            </h1>
            <span className="text-xs text-muted-foreground font-semibold">
              {filtered.length} {filtered.length === 1 ? 'creator' : 'creators'}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading feed creators...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground space-y-2">
              <p className="font-bold text-lg text-foreground">No creators found</p>
              <p className="text-sm">Try searching with a different name or category.</p>
            </div>
          ) : (
            <div className="discover-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
             {filtered.map((creator, i) => {
               const isSubscribed = activeSubscribedIds.has(creator.id) || Boolean(user && (user.id === creator.id || user.email === creator.email)) || userRole === 'admin';
               const category = creator.category?.trim().toLowerCase() === 'vip creator'
                 ? 'Creator'
                 : creator.category;
               return (
                <div 
                  key={creator.id || i}
                  onClick={(e) => handleCreatorCardClick(e, creator)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCreatorCardClick(e as any, creator);
                    }
                  }}
                  className="discover-card group relative flex flex-col bg-card border border-border/80 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_6px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.12)] dark:shadow-none dark:hover:shadow-[0_0_24px_rgba(225,29,72,0.12)] cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/60"
                >
                  {/* Media Cover Showcase */}
                  <div className="discover-card-cover relative aspect-[16/11] sm:aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img 
                      src={creator.cover && !/\.(mp4|webm|mov|m4v)/i.test(creator.cover) ? creator.cover : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80"} 
                      alt={creator.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80";
                      }}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out" 
                      loading="lazy" 
                    />
                    
                    {/* Subtle top vignette for badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
                      {creator.isDemo ? (
                        <span className="bg-amber-500 text-black text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-amber-300">
                          DEMO ACCOUNT
                        </span>
                      ) : creator.hasPosts ? (
                        <span className="bg-rose-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Flame className="w-3 h-3 text-amber-300" /> Active Feed
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-[9px] sm:text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md uppercase tracking-wider border border-white/10 shadow-sm truncate max-w-[120px]">
                        {creator.isDemo ? 'SAMPLE PREVIEW' : category}
                      </span>
                    </div>

                    {/* Subtle hover overlay hint */}
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <span className="px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-black/85 text-foreground text-xs font-bold shadow-lg backdrop-blur-md transform scale-95 group-hover:scale-100 transition-transform duration-300 flex items-center gap-1.5">
                        {isSubscribed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> View Profile
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-primary" /> Subscribe to View
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Surface (Clean Solid Surface: No Fog, High Contrast) */}
                  <div className="discover-card-content p-3 sm:p-4 pt-1 sm:pt-1.5 flex flex-col flex-1 relative bg-card">
                    {/* Avatar & Price Row */}
                    <div className="-mt-7 sm:-mt-8 mb-2 flex items-end justify-between relative z-10">
                      <div className="relative">
                        <img 
                          src={creator.avatar} 
                          alt={creator.name} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getDefaultAvatar(creator.name);
                          }}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-card shadow-md object-cover bg-muted" 
                          loading="lazy" 
                        />
                        {(() => {
                          const presence = formatLastSeenStatus(creator.last_seen);
                          if (presence.isOnline) {
                            return (
                              <span
                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full flex items-center justify-center"
                                title="Online now"
                              >
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                              </span>
                            );
                          }
                          if (creator.hasPosts) {
                            return (
                              <span
                                className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full"
                                title="Active Feed Creator"
                              />
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="discover-card-price text-right pl-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 block">Access</span>
                        <span className="text-xs sm:text-sm font-black text-primary leading-none block">{creator.price}</span>
                      </div>
                    </div>

                    {/* Name & Verified Badge */}
                    <div className="min-w-0 mb-0.5">
                      <h3 className="discover-card-name text-sm sm:text-base font-bold text-foreground truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                        <span className="truncate">{creator.name}</span>
                        {creator.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0 fill-blue-500/10" />
                        )}
                        {creator.isDemo && (
                          <span className="ml-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                            Demo
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate font-medium mt-0.5">
                        {creator.handle}
                      </p>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground/80 truncate mb-2.5">
                      <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                      <span className="truncate">{creator.location}</span>
                    </div>
                    {(creator.gender || creator.age) && (
                      <div className="mb-2.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                        {creator.gender && <span>{creator.gender}</span>}
                        {creator.gender && creator.age && <span aria-hidden="true">·</span>}
                        {creator.age && <span>{creator.age} yrs</span>}
                      </div>
                    )}

                    {/* Stats & Link Footer */}
                    <div className="discover-card-footer mt-auto pt-2 sm:pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <span className="font-semibold text-foreground/85">{creator.subs}</span>
                        {creator.postsCount > 0 && (
                          <span className="text-muted-foreground/70">• {creator.postsCount} posts</span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform shrink-0 flex items-center gap-1">
                        {isSubscribed ? (
                          <>View Profile &rarr;</>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-primary inline" /> Subscribe to View &rarr;
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
               );
             })}
          </div>
          )}
        </div>
      </main>

      {/* Subscribe Modal for Locked Creators */}
      {subscribeModalCreator && (
        <SubscribeModal
          isOpen={Boolean(subscribeModalCreator)}
          onClose={() => setSubscribeModalCreator(null)}
          creatorName={subscribeModalCreator.name}
          creatorId={subscribeModalCreator.id}
          creatorAvatar={subscribeModalCreator.avatar}
          price={parseInt(String(subscribeModalCreator.price).replace(/[^0-9]/g, ''), 10) || 1000}
          durationDays={30}
          tierName="VIP Profile Access"
          subtitle={`Subscribe to ${subscribeModalCreator.name} to unlock full access to their profile, exclusive posts, and private messaging.`}
          onSuccess={() => {
            const target = subscribeModalCreator;
            setActiveSubscribedIds(prev => new Set([...prev, target.id]));
            setSubscribeModalCreator(null);
            navigate(`/creator/${target.id}`, { state: { creator: target } });
          }}
        />
      )}
    </div>
    <BottomNav />
    </>
  );
};

export default Discover;
