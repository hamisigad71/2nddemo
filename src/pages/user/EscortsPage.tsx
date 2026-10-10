import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, ShieldCheck, ChevronRight, Filter } from 'lucide-react';
import UserLayout from '../../components/UserLayout';

interface EscortProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  rating: number;
  isVerified: boolean;
  isOnline: boolean;
  price_hr: number;
}

const mockEscorts: EscortProfile[] = [
  {
    id: 'escort-1',
    name: 'Valentina',
    avatar: 'https://i.pinimg.com/736x/27/a7/8e/27a78e6e8f924a2e01c24fe905172364.jpg',
    bio: 'Luxury companion for high-end events. Passionate, elegant, and discreet.',
    location: 'Nairobi, KE',
    rating: 4.9,
    isVerified: true,
    isOnline: true,
    price_hr: 5000,
  },
  {
    id: 'escort-2',
    name: 'Chloe Vibe',
    avatar: 'https://i.pinimg.com/736x/28/8c/76/288c76c680527b6fa111cf8d0c1a8878.jpg',
    bio: 'Fun, spontaneous and ready for an adventure. Let\'s make memories.',
    location: 'Mombasa, KE',
    rating: 4.8,
    isVerified: true,
    isOnline: false,
    price_hr: 3500,
  },
  {
    id: 'escort-3',
    name: 'Sofia Monroe',
    avatar: 'https://i.pinimg.com/736x/af/76/fd/af76fd4cab678ac1fc3562f9e46daacd.jpg',
    bio: 'The ultimate girlfriend experience. Sweet, attentive, and unforgettable.',
    location: 'Nairobi, KE',
    rating: 5.0,
    isVerified: true,
    isOnline: true,
    price_hr: 7000,
  },
  {
    id: 'escort-4',
    name: 'Maya',
    avatar: 'https://i.pinimg.com/736x/43/6b/f5/436bf5ff8aff0db0316feadbb8ba1a09.jpg',
    bio: 'Your perfect escape from reality. Exclusive bookings only.',
    location: 'Kilimani, NRB',
    rating: 4.7,
    isVerified: false,
    isOnline: true,
    price_hr: 4000,
  },
  {
    id: 'escort-5',
    name: 'Zuri',
    avatar: 'https://i.pinimg.com/736x/9f/c9/7a/9fc97a91a92810c4b63a3151b4a458c2.jpg',
    bio: 'Elegant, intelligent, and a perfect +1 for all your VIP arrangements.',
    location: 'Westlands, NRB',
    rating: 4.9,
    isVerified: true,
    isOnline: true,
    price_hr: 6000,
  },
  {
    id: 'escort-6',
    name: 'Aaliyah',
    avatar: 'https://i.pinimg.com/736x/d3/59/f3/d359f3b580443cb55716d9289f3ade6a.jpg',
    bio: 'Breathtakingly gorgeous and charming. Ready for a beautiful evening.',
    location: 'Karen, NRB',
    rating: 5.0,
    isVerified: true,
    isOnline: false,
    price_hr: 8000,
  },
  {
    id: 'escort-7',
    name: 'Jessica',
    avatar: 'https://i.pinimg.com/736x/64/69/2a/64692a6dcfd5228a91dfe7419716db0d.jpg',
    bio: 'Sun-kissed and ready for a good time. Let\'s explore the coast together.',
    location: 'Diani, KE',
    rating: 4.6,
    isVerified: false,
    isOnline: true,
    price_hr: 4500,
  },
  {
    id: 'escort-8',
    name: 'Nadia',
    avatar: 'https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg',
    bio: 'Classy, bubbly, and extremely fun. Your best kept secret.',
    location: 'Kileleshwa, NRB',
    rating: 4.8,
    isVerified: true,
    isOnline: true,
    price_hr: 5500,
  }
];

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
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-500 to-rose-400">
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-rose-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name or city..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/50 rounded-2xl text-sm focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all font-medium placeholder:text-muted-foreground/70"
            />
          </div>
          <button className="p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-foreground hover:bg-muted/60 transition-all active:scale-95 shrink-0 hover:text-rose-500">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEscorts.map((profile) => (
          <Link
            key={profile.id}
            to={`/creator/${profile.id}`} 
            className="group relative bg-[#12131C]/90 rounded-[2.2rem] overflow-hidden border border-white/10 hover:border-rose-500/40 transition-all duration-500 hover:shadow-[0_16px_40px_-12px_rgba(244,63,94,0.22)] flex flex-col backdrop-blur-xl hover:-translate-y-1.5"
          >
            {/* Header Image Area */}
            <div className="relative aspect-[4/5] overflow-hidden">
              <img 
                src={profile.avatar} 
                alt={profile.name} 
                className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
              />
              
              {/* Multi-stage Smooth Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#12131C] via-[#12131C]/30 to-black/30 opacity-90 group-hover:opacity-80 transition-opacity duration-500" />
              
              {/* Top Badges Layer */}
              <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center z-10">
                {/* Online Indicator Badge */}
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    {profile.isOnline && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${profile.isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-zinc-500'}`} />
                  </span>
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-100">
                    {profile.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                {/* Verified Shield Badge */}
                {profile.isVerified && (
                  <div className="bg-sky-500/20 backdrop-blur-md text-sky-400 px-2.5 py-1.5 rounded-full border border-sky-400/30 flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Verified</span>
                  </div>
                )}
              </div>

              {/* Rating Tag Floating over image bottom right */}
              <div className="absolute bottom-4 right-4 z-10">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-amber-400 px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black tracking-tight">{profile.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-5 flex-1 flex flex-col relative z-10 -mt-2">
              
              {/* Name & Price Header */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h3 className="text-xl font-black text-white group-hover:text-rose-400 transition-colors tracking-tight truncate">
                  {profile.name}
                </h3>
                <div className="shrink-0 text-right">
                  <span className="text-rose-400 font-black text-base">KES {profile.price_hr.toLocaleString()}</span>
                  <span className="text-[11px] text-zinc-400 font-medium"> /hr</span>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-zinc-400">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{profile.location}</span>
              </div>

              {/* Bio */}
              <p className="text-xs leading-relaxed text-zinc-400/90 mb-5 line-clamp-2 flex-1 font-normal">
                {profile.bio}
              </p>

              {/* Action Button */}
              <div className="w-full bg-gradient-to-r from-rose-500/15 via-rose-500/20 to-pink-500/15 group-hover:from-rose-500 group-hover:to-pink-600 text-rose-300 group-hover:text-white transition-all duration-300 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider border border-rose-500/30 group-hover:border-rose-400 shadow-sm flex items-center justify-center gap-2">
                <span>View Profile</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>

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
