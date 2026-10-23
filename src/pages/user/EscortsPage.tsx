import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, ShieldCheck, Filter } from 'lucide-react';
import UserLayout from '../../components/UserLayout';

import { mockEscorts, type EscortProfile } from '../../lib/mockData';

export default function EscortsPage() {
  const [escorts] = useState<EscortProfile[]>(mockEscorts);
  const [searchQuery, setSearchQuery] = useState('');

  // Example of how to fetch from DB if needed:
  // useEffect(() => {
  //   const fetchEscorts = async () => {
  //     const { data } = await supabase.from('users').select('*').eq('role', 'escort');
  //     if (data) setEscorts(data);
  //   };
  //   fetchEscorts();
  // }, []);

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
        {filteredEscorts.map((profile) => (
          <Link
            key={profile.id}
            to={`/creator/${profile.id}`} 
            className="group block bg-card rounded-2xl overflow-hidden border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-lg transition-all duration-300 relative"
          >
            {/* Header Image Area */}
            <div className="relative aspect-[4/5] overflow-hidden bg-muted border-b border-border/60">
              <img 
                src={profile.avatar} 
                alt={profile.name} 
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-105 group-hover:opacity-95 transition-all duration-700 ease-out"
              />
              
              {/* Online Indicator Dot and Rating - strictly top aligned, rounded edges */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-2 bg-black/75 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm">
                  <span className={`h-1.5 w-1.5 rounded-full ${profile.isOnline ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-zinc-600'}`} />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                    {profile.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="flex bg-black/75 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-white tracking-widest uppercase">
                    <Star className="w-3 h-3 text-red-500 fill-red-500" />
                    {profile.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4 sm:p-5 flex flex-col relative z-10 bg-card">
              
              {/* Name & Badges */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                    {profile.name}
                  </h3>
                  {profile.isVerified && (
                    <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-primary font-bold tracking-tight">KES {profile.price_hr.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground"> /hr</span>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 mb-2.5 text-[11px] text-primary uppercase tracking-widest font-bold">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{profile.location}</span>
              </div>

              {/* Bio */}
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground line-clamp-2">
                {profile.bio}
              </p>
            </div>
          </Link>
        ))}
      </div>

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
