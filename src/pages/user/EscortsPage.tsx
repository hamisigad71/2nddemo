import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, ShieldCheck, Filter, Phone, Lock } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import { supabase } from '../../lib/supabase';
import { resolveUserAvatar } from '../../lib/avatar';
import { useAuth } from '../../context/AuthContext';
import EscortBookingFlowModal from '../../components/EscortBookingFlowModal';

import { mockEscorts, type EscortProfile } from '../../lib/mockData';

export default function EscortsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [escorts, setEscorts] = useState<EscortProfile[]>(mockEscorts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEscortForBooking, setSelectedEscortForBooking] = useState<EscortProfile | null>(null);
  const [unlockedEscortIds, setUnlockedEscortIds] = useState<Set<string>>(new Set());

  // Load unlocked escorts
  const loadUnlocks = async () => {
    const unlocked = new Set<string>();
    try {
      const globalStored = localStorage.getItem('tgd_escort_unlocks_global');
      if (globalStored) {
        (JSON.parse(globalStored) as string[]).forEach((id) => unlocked.add(id));
      }
    } catch {}

    if (user?.id) {
      try {
        const { data } = await supabase
          .from('escort_contact_unlocks')
          .select('escort_id')
          .eq('client_id', user.id);
        if (data) {
          data.forEach((row: any) => unlocked.add(row.escort_id));
        }
      } catch (e) {
        console.warn('Could not load user escort unlocks:', e);
      }
    }
    setUnlockedEscortIds(unlocked);
  };

  useEffect(() => {
    loadUnlocks();
  }, [user?.id]);

  useEffect(() => {
    const fetchEscorts = async () => {
      try {
        // Fetch approved escort applications from Supabase
        const { data: apps, error } = await supabase
          .from('escort_applications')
          .select('*')
          .in('status', ['approved', 'pending'])
          .order('created_at', { ascending: false });

        if (!error && apps && apps.length > 0) {
          const liveEscorts: EscortProfile[] = apps.map((app) => {
            const rawRate = String(app.rates || '');
            const parsedRate = parseInt(rawRate.replace(/[^\d]/g, ''), 10) || 5000;
            const photos = app.photos || app.verification_photos || [];
            const primaryAvatar = photos[0] || resolveUserAvatar(null, app.name || 'Companion');

            return {
              id: app.creator_id || app.id,
              name: app.name || 'Elite Companion',
              avatar: primaryAvatar,
              cover_image: photos[1] || photos[0] || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80',
              bio: app.bio || 'Verified elite companion.',
              location: app.location || 'Nairobi, KE',
              rating: 5.0,
              isVerified: app.status === 'approved',
              isOnline: true,
              price_hr: parsedRate,
              age: app.age || 22,
              services: [app.measurements ? `Fit: ${app.measurements}` : 'VIP Events', 'Dinner Date', 'Companionship'],
              gallery: photos,
            };
          });

          // Merge live approved escorts with the 3 demo ones without duplicates
          const liveIds = new Set(liveEscorts.map(e => e.id));
          const filteredDemo = mockEscorts.filter(d => !liveIds.has(d.id));
          setEscorts([...liveEscorts, ...filteredDemo]);
        }
      } catch (err) {
        console.error('Error fetching live escort applications:', err);
      }
    };

    fetchEscorts();
  }, []);

  const filteredEscorts = escorts.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <UserLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-red-500">
              Elite Companions
            </h1>
            <div className="flex items-center justify-center shrink-0">
              <img src="https://i.pinimg.com/1200x/ef/6d/07/ef6d071275fa0c2e8636b910e883f866.jpg" alt="Dollhouse Logo" className="w-8 h-8 rounded-full border shadow-sm object-cover" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Discover verified, premium companions near you.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-red-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name or city..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/50 rounded-2xl text-sm focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all font-medium placeholder:text-muted-foreground/70"
            />
          </div>
          <button className="p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-foreground hover:bg-muted/60 transition-all active:scale-95 shrink-0 hover:text-red-500">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEscorts.map((profile) => {
          const isUnlocked = unlockedEscortIds.has(profile.id);

          return (
            <div
              key={profile.id}
              onClick={() => {
                if (isUnlocked) {
                  navigate(`/creator/${profile.id}`);
                } else {
                  setSelectedEscortForBooking(profile);
                }
              }}
              className="group block bg-card dark:bg-[#111218] rounded-2xl overflow-hidden border border-border/80 dark:border-white/10 hover:border-red-500/60 shadow-sm hover:shadow-xl dark:shadow-black/40 transition-all duration-300 relative cursor-pointer"
            >
              {/* Header Image Area */}
              <div className="relative aspect-[4/5] overflow-hidden bg-muted dark:bg-zinc-900 border-b border-border/60 dark:border-white/10">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center group-hover:scale-105 group-hover:opacity-95 transition-all duration-700 ease-out"
                />
                
                {/* Lock Badge if profile requires payment to view */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 text-white border border-red-500/60 text-xs font-bold flex items-center gap-2 shadow-2xl">
                      <Lock className="w-3.5 h-3.5 text-red-500" />
                      <span>Pay KES 1,300 to Unlock</span>
                    </div>
                  </div>
                )}
                
                {/* Online Indicator Dot and Rating - strictly top aligned, rounded edges */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center z-10">
                  <div className="flex items-center gap-1.5 bg-black/75 dark:bg-black/85 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-md">
                    <span className={`h-2 w-2 rounded-full ${profile.isOnline ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-zinc-400'}`} />
                    <span className="text-[10px] font-extrabold tracking-widest uppercase text-white">
                      {profile.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="flex bg-black/75 dark:bg-black/85 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-md">
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-white tracking-widest uppercase">
                      <Star className="w-3 h-3 text-red-500 fill-red-500" />
                      {profile.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Area - Pristine Light & Dark Surfaces */}
              <div className="p-4 sm:p-5 flex flex-col relative z-10 bg-white dark:bg-[#111218]">
                
                {/* Name & Badges */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                      {profile.name}
                    </h3>
                    {profile.isVerified && (
                      <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-red-600 dark:text-red-500 font-extrabold text-sm sm:text-base tracking-tight">
                      KES {profile.price_hr.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"> /hr</span>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 mb-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-500 shrink-0" />
                  <span className="truncate">{profile.location}</span>
                </div>

                {/* Bio */}
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 line-clamp-2 mb-3.5 font-normal">
                  {profile.bio}
                </p>

                {/* Action Buttons: Unlock Contact & Escrow Booking */}
                <div className="pt-3 border-t border-zinc-200/80 dark:border-white/10 flex items-center gap-2">
                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/creator/${profile.id}`);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer uppercase tracking-wider"
                    >
                      <span>Unlocked · View Profile &amp; Chat</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEscortForBooking(profile);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer uppercase tracking-wider"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Unlock Contact &amp; Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Escort Booking & Contact Unlock Modal */}
      {selectedEscortForBooking && (
        <EscortBookingFlowModal
          isOpen={Boolean(selectedEscortForBooking)}
          onClose={() => {
            setSelectedEscortForBooking(null);
            loadUnlocks();
          }}
          escort={selectedEscortForBooking}
          currentUser={user ? { id: user.id, email: user.email, name: user.user_metadata?.name, phone: user.user_metadata?.phone } : null}
          onUnlockedSuccess={() => {
            loadUnlocks();
          }}
        />
      )}

      {filteredEscorts.length === 0 && (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">No companions found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search filters to find what you're looking for.</p>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
