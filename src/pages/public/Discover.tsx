import { useState } from 'react';
import { Search, Filter, CheckCircle, MapPin, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';

const mockCreators = [
  { name: "Amina K.", handle: "@aminak", category: "Fitness", location: "Nairobi, Kenya", subs: "12k", price: "KES 500/mo", avatar: "https://i.pinimg.com/736x/c6/ff/a6/c6ffa63b68d9f215fd063ffb97f33842.jpg", cover: "https://i.pinimg.com/736x/c6/ff/a6/c6ffa63b68d9f215fd063ffb97f33842.jpg" },
  { name: "Sarah M.", handle: "@sarahm", category: "Lifestyle", location: "Mombasa", subs: "9.5k", price: "KES 800/mo", avatar: "https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg", cover: "https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg" },
  { name: "Chef Kamau", handle: "@chefkamau", category: "Culinary", location: "Nairobi, Kenya", subs: "8.5k", price: "KES 1k/mo", avatar: "https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg", cover: "https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg" },
  { name: "Betty Vlog", handle: "@betty", category: "Vlogger", location: "Nakuru", subs: "3k", price: "KES 500/mo", avatar: "https://i.pinimg.com/736x/c7/63/a1/c763a17c42705d2b6b981adc1130ed91.jpg", cover: "https://i.pinimg.com/736x/c7/63/a1/c763a17c42705d2b6b981adc1130ed91.jpg" },
  { name: "Wanjiku Tech", handle: "@wanjiku", category: "Education", location: "Nairobi", subs: "24k", price: "KES 300/mo", avatar: "https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg", cover: "https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg" },
  { name: "Grace Style", handle: "@grace", category: "Fashion", location: "Nairobi", subs: "32k", price: "KES 1.5k/mo", avatar: "https://i.pinimg.com/736x/80/78/c3/8078c38f0cb612302707c7429e3ecf59.jpg", cover: "https://i.pinimg.com/736x/80/78/c3/8078c38f0cb612302707c7429e3ecf59.jpg" },
  { name: "Fit Guru", handle: "@fitguru", category: "Health", location: "Eldoret", subs: "18k", price: "KES 700/mo", avatar: "https://i.pinimg.com/736x/f6/b6/de/f6b6de8523e31a9f04f60ca66639c42f.jpg", cover: "https://i.pinimg.com/736x/f6/b6/de/f6b6de8523e31a9f04f60ca66639c42f.jpg" },
  { name: "ODC Music", handle: "@odcmusic", category: "Entertainment", location: "Kisumu", subs: "45k", price: "KES 1k/mo", avatar: "https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg", cover: "https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg" },
];

const Discover = () => {
  const [activeTab, setActiveTab] = useState('trending');
  
  return (
    <>
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="border-b border-border bg-background/95 sticky top-0 z-20 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center w-full md:w-auto">
            <Link to="/" className="text-xl font-bold text-primary mr-2 md:hidden">Hideaway.</Link>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
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
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
        <h1 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6 capitalize">{activeTab} Creators</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
           {/* Mock Creator Cards */}
           {mockCreators.map((creator, i) => (
             <Link to="/checkout" state={{ creator }} key={i} className="group relative flex flex-col aspect-[3/4] sm:aspect-[4/5] bg-muted border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                {/* Full Background Cover */}
                <img src={creator.cover} alt="cover" className="absolute inset-0 w-full h-full object-cover object-top opacity-90 group-hover:scale-110 group-hover:blur-[2px] transition-all duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
                
                {/* Lock Overlay on Hover */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/20 backdrop-blur-sm pointer-events-none">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40 transform scale-75 group-hover:scale-100 transition-transform duration-500 mb-2">
                    <Lock className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="font-bold text-white text-xs sm:text-sm drop-shadow-md">Unlock Profile</span>
                </div>

                {/* Permanent Lock Badge */}
                <div className="absolute top-3 right-3 z-30 bg-black/50 backdrop-blur-md p-1.5 sm:p-2 rounded-full border border-white/10 shadow-sm">
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white/90" />
                </div>
                
                {/* Info Container Placed over Gradient */}
                <div className="relative z-10 px-3 pb-3 sm:px-5 sm:pb-5 pt-10 mt-auto flex flex-col text-white transition-transform duration-300 group-hover:translate-y-2 group-hover:opacity-40">
                  {/* Avatar & Category */}
                  <div className="flex items-end justify-between mb-2 sm:mb-3">
                    <img src={creator.avatar} alt="avatar" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-primary/50 shadow-md object-cover bg-background" loading="lazy" />
                    <div className="text-[10px] sm:text-xs font-semibold text-secondary uppercase tracking-wider backdrop-blur-sm bg-black/30 px-2 py-0.5 rounded border border-white/10">{creator.category}</div>
                  </div>
                  
                  {/* Name & Handle */}
                  <h3 className="text-sm sm:text-xl font-bold flex items-center gap-1 text-white truncate w-full shadow-sm">
                    <span className="truncate">{creator.name}</span>
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0 drop-shadow-md" />
                  </h3>
                  <p className="text-[10px] sm:text-sm text-gray-300 font-medium truncate drop-shadow-sm">{creator.handle}</p>
                  
                  {/* Location */}
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-300 mt-1 sm:mt-2 truncate drop-shadow-sm">
                    <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{creator.location}</span>
                  </div>
                  
                  {/* Stats & Price Bottom bar */}
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20 flex flex-row items-center justify-between mt-auto gap-1">
                    <div className="text-[10px] sm:text-sm font-medium text-gray-300 drop-shadow-sm">{creator.subs} followers</div>
                    <div className="text-[11px] sm:text-sm font-black text-primary drop-shadow-sm">{creator.price}</div>
                  </div>
                </div>
             </Link>
           ))}
        </div>
      </main>
    </div>
    <BottomNav />
    </>
  )
}
export default Discover;
