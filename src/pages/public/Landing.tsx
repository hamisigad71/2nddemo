import { ShieldCheck, TrendingUp, Users, CheckCircle, ArrowRight, Menu, Star, Zap, Lock, X, ChevronDown, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const heroImages = [
  "https://i.pinimg.com/736x/c6/ff/a6/c6ffa63b68d9f215fd063ffb97f33842.jpg",
  "https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg",
  "https://i.pinimg.com/736x/f6/b6/de/f6b6de8523e31a9f04f60ca66639c42f.jpg",
  "https://i.pinimg.com/736x/c7/63/a1/c763a17c42705d2b6b981adc1130ed91.jpg",
  "https://i.pinimg.com/736x/80/78/c3/8078c38f0cb612302707c7429e3ecf59.jpg",
];

const creators = [
  { name: "Amina K.", category: "Fitness", subs: "12k", price: "KES 500/mo", img: "https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg" },
  { name: "Chef Kamau", category: "Culinary Arts", subs: "8.5k", price: "KES 1,000/mo", img: "https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg" },
  { name: "Wanjiku Tech", category: "Education", subs: "24k", price: "KES 300/mo", img: "https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg" },
  { name: "ODC Music", category: "Entertainment", subs: "45k", price: "KES 800/mo", img: "https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg" },
];

const testimonials = [
  {
    quote: "The Gents Dollhouse changed everything for me. I went from zero to KES 120,000/month in 4 months. M-Pesa payouts hit instantly — no waiting, no friction.",
    name: "Amina K.",
    role: "Fitness Creator · 12k subscribers",
    img: "https://images.unsplash.com/photo-1531123414780-f74242c2b052?w=200&q=80",
  },
  {
    quote: "I've tried other platforms but they didn't get Kenya. The Gents Dollhouse speaks my fans' language — M-Pesa is all they need. My income tripled in 3 months.",
    name: "Chef Kamau",
    role: "Culinary Creator · 8.5k subscribers",
    img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=200&q=80",
  },
  {
    quote: "The dashboard is clean, payouts are instant, and the support team actually responds. Best creator platform built for Africa, period.",
    name: "Wanjiku Tech",
    role: "Tech Educator · 24k subscribers",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
  },
];

const Landing = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [followers, setFollowers] = useState(10000);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">

      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="hidden md:block w-10 h-10 md:w-12 md:h-12 object-contain" />
          <span className="text-xl md:text-2xl font-black tracking-tighter text-primary">The Gents Dollhouse<span className="text-secondary">.</span></span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#discover" className="hover:text-primary transition-colors text-muted-foreground">Discover</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors text-muted-foreground">How It Works</a>
          <a href="#creators" className="hover:text-primary transition-colors text-muted-foreground">Creators</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme appearance"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
          </button>
          <Link to="/login" className="hidden md:inline-flex text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
            Login
          </Link>
          <Link to="/signup" className="hidden md:inline-flex bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02]">
            Start Earning
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-foreground p-1">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative ml-auto w-72 h-full bg-muted border-l border-border flex flex-col p-6 gap-6 shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background/80 border border-border text-foreground transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Logo" className="w-10 h-10 object-contain" />
              <span className="text-2xl font-black tracking-tighter text-primary">The Gents Dollhouse<span className="text-secondary">.</span></span>
            </div>
            <div className="flex flex-col gap-4 text-base font-medium">
              <a href="#discover" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">Discover</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">How It Works</a>
              <a href="#creators" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">Creators</a>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">Login</Link>
            </div>
            <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="mt-auto bg-primary text-primary-foreground px-5 py-3 rounded-lg font-semibold text-center hover:bg-emerald-500 transition-all">
              Start Earning Free
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1">

        {/* Hero Section */}
        <section
          className="relative flex flex-col items-center text-center overflow-hidden min-h-[100svh] md:min-h-[100svh]"
        >

          {/* Carousel Background Images */}
          <div className="absolute inset-0" style={{ zIndex: 0 }}>
            {/* Desktop Carousel */}
            {heroImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                aria-hidden="true"
                className="hidden md:block absolute inset-0 w-full h-full object-cover object-center"
                style={{
                  opacity: i === heroIndex ? 1 : 0,
                  transition: 'opacity 1.5s ease-in-out',
                }}
                loading={i <= 1 ? 'eager' : 'lazy'}
              />
            ))}
            {/* Mobile Static Background */}
            <img
              src="https://i.pinimg.com/736x/bc/aa/40/bcaa40faa1cee525632e139ddcaf709c.jpg"
              alt=""
              aria-hidden="true"
              className="md:hidden absolute inset-0 w-full h-full object-cover object-center"
              loading="eager"
            />
            {/* Semi-transparent dark overlay — keeps images visible but text readable */}
            <div
              className="absolute inset-0 block md:hidden"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 40%, rgba(10,10,12,1) 100%)' }}
            />
            <div
              className="absolute inset-0 hidden md:block"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.65) 100%)' }}
            />
            {/* Bottom fade into page background */}
            <div
              className="absolute bottom-0 left-0 right-0 h-24 md:h-28"
              style={{ background: 'linear-gradient(to top, hsl(0 0% 10%) 0%, transparent 100%)' }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-start md:justify-center items-center px-6 pt-16 pb-10 md:py-40 w-full max-w-4xl mx-auto flex-1 gap-6">

            {/* TOP GROUP: Badge + Headline */}
            <div className="flex flex-col items-center text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-red-500/30 text-white text-xs md:text-sm font-bold mb-6 md:mb-8 shadow-lg shadow-red-500/10 backdrop-blur-md transition-all cursor-default relative overflow-hidden">
                <span className="relative flex h-2 w-2 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="z-10">Kenyan Creator Economy — Built Different 🇰🇪</span>
              </div>

              {/* Headline */}
              <h1 className="text-xl sm:text-5xl md:text-7xl font-black tracking-tight mb-4 md:mb-6 leading-tight whitespace-nowrap md:whitespace-normal">
                <span className="text-white drop-shadow-xl">Your Content.</span>{' '}
                <span className="text-white drop-shadow-xl">Your Fans.</span>{' '}
                <span className="text-red-500 drop-shadow-[0_4px_12px_rgba(239,68,68,0.5)]">
                  Your Money.
                </span>
              </h1>
            </div>

            {/* BOTTOM GROUP: Description */}
            <div className="flex flex-col items-center text-center w-full">
              <p className="text-sm sm:text-base md:text-xl text-white/80 max-w-2xl mb-6 md:mb-10 leading-relaxed">
                The premium subscription platform for African creators. Monetize your audience directly through{' '}
                <span className="text-primary font-semibold">M-Pesa</span>, cards &amp; more. No middleman. No hassle.
              </p>
            </div>

            {/* CTA + Social Proof — pushed to bottom on mobile */}
            <div className="mt-auto md:mt-0 flex flex-col items-center text-center w-full pb-2 md:pb-0">
              {/* CTA Buttons */}
              <div className="flex flex-row items-center justify-center gap-3 w-full px-2 sm:px-0 max-w-sm sm:max-w-none">
                <Link to="/signup" className="group flex-1 sm:flex-none sm:w-auto flex items-center justify-center gap-1.5 bg-red-600 text-white px-2 py-4 sm:px-8 sm:py-4 rounded-xl text-xs sm:text-base font-black hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:scale-[1.02] border border-red-500">
                  Start Earning
                  <ArrowRight className="hidden sm:block w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/discover" className="flex-1 sm:flex-none sm:w-auto flex items-center justify-center gap-1.5 bg-[#0a0b0e] backdrop-blur-md text-white hover:bg-white/5 border border-zinc-700 hover:border-white/40 px-2 py-4 sm:px-8 sm:py-4 rounded-xl text-[11px] sm:text-base font-bold transition-all uppercase tracking-wider">
                  Explore Creators
                </Link>
              </div>

              {/* Social Proof Mini */}
              <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                <div className="flex -space-x-2">
                  {creators.slice(0, 3).map((c, i) => (
                    <img key={i} src={c.img} alt={c.name} className="w-7 h-7 rounded-full border-2 border-white/30 object-cover" />
                  ))}
                </div>
                <span>Join <strong className="text-white">2,400+</strong> creators already earning</span>
              </div>

              {/* Carousel Dots */}
              <div className="mt-8 hidden md:flex items-center gap-2">
                {heroImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`rounded-full transition-all duration-500 ${
                      i === heroIndex
                        ? 'w-6 h-2 bg-primary'
                        : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Global Payment Partners / Trust Badges — Infinite Marquee */}
        <section className="bg-background border-b border-border py-3 overflow-hidden">
          <div
            className="flex items-center gap-8"
            style={{
              display: 'flex',
              width: 'max-content',
              animation: 'marquee 18s linear infinite',
            }}
          >
            {[
              { name: "M-PESA", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4NrGQhzTgIhXHqB15-5h3BWFd2hAVWucCZjleiDXKuA&s=10" },
              { name: "VISA", logoUrl: "https://i.pinimg.com/236x/2c/2e/a2/2c2ea23f50347ec3cc8ec0d47536aee8.jpg" },
              { name: "Mastercard", logoUrl: "https://i.pinimg.com/1200x/cf/01/7c/cf017c3df4b4b6ce716a19b6d146a93c.jpg" },
              { name: "Airtel Money", logoUrl: "https://i.pinimg.com/1200x/fe/6d/5f/fe6d5fe2443668b417384ede46531bee.jpg" },
              // duplicate set for seamless loop
              { name: "M-PESA2", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4NrGQhzTgIhXHqB15-5h3BWFd2hAVWucCZjleiDXKuA&s=10" },
              { name: "VISA2", logoUrl: "https://i.pinimg.com/236x/2c/2e/a2/2c2ea23f50347ec3cc8ec0d47536aee8.jpg" },
              { name: "Mastercard2", logoUrl: "https://i.pinimg.com/1200x/cf/01/7c/cf017c3df4b4b6ce716a19b6d146a93c.jpg" },
              { name: "Airtel Money2", logoUrl: "https://i.pinimg.com/1200x/fe/6d/5f/fe6d5fe2443668b417384ede46531bee.jpg" },
            ].map(({ name, logoUrl }) => (
              <div key={name} className="flex items-center justify-center px-5 py-2 rounded-lg bg-white h-12 min-w-[110px] shadow-sm shrink-0">
                <img src={logoUrl} alt={name.replace(/\d+$/, '')} className="h-8 max-w-[90px] object-contain" />
              </div>
            ))}
          </div>
          <style>{`
            @keyframes marquee {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </section>

        {/* Earning Potential Calculator */}
        <section className="px-6 py-28 relative overflow-hidden bg-[#0a0b0e] border-b border-zinc-800">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-16 relative z-10">
            {/* Left Content */}
            <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/50 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-widest mb-6">
                <TrendingUp className="w-4 h-4 text-red-500" /> Growth Calculator
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4 md:mb-6 tracking-tight leading-tight text-white">
                Calculate your{' '}
                <span className="inline text-red-500">earning potential</span>
              </h2>
              <p className="text-zinc-400 mb-8 text-base md:text-lg leading-relaxed max-w-lg font-medium">
                See what happens when you monetize directly. Estimate your revenue if just <strong className="text-white">5%</strong> of your audience subscribes at KES 500/month.
              </p>
              
            </div>
            
            {/* Right Content - Unified Card for both mobile and desktop */}
            <div className="w-full md:w-1/2">
              <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl md:rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative z-10 w-full max-w-lg mx-auto md:max-w-none">
                <div className="flex flex-row p-4 sm:p-6 md:p-10 items-stretch gap-3 sm:gap-6 w-full">
                  {/* Slider Side */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="text-[9px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-1 sm:mb-2 truncate">Current Followers</div>
                    <div className="text-lg sm:text-3xl md:text-4xl font-black text-red-500 tracking-tight mb-4 sm:mb-6 truncate">{followers.toLocaleString()}</div>
                    <div className="relative pt-1 sm:pt-2 w-full">
                       <input 
                         type="range" min="1000" max="1000000" step="1000"
                         value={followers} onChange={(e) => setFollowers(Number(e.target.value))}
                         className="w-full h-1.5 sm:h-2.5 bg-zinc-800 rounded-lg appearance-none accent-red-600 focus:outline-none cursor-pointer"
                       />
                       <div className="flex justify-between text-[8px] sm:text-xs font-bold text-zinc-500 mt-2 sm:mt-3">
                         <span>1k</span><span>1M+</span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Vertical Divider */}
                  <div className="w-px bg-zinc-800 shrink-0"></div>
                  
                  {/* Income Side */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center min-w-0">
                    <div className="text-[9px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-1 sm:mb-2 truncate w-full">Monthly Income</div>
                    <div className="flex items-start justify-center gap-0.5 sm:gap-1 mb-2 sm:mb-4">
                      <span className="text-[9px] sm:text-lg font-extrabold text-red-500 mt-1">KES</span>
                      <span className="text-xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none truncate">
                        {(followers * 0.05 * 500).toLocaleString()}
                      </span>
                    </div>
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-950/30 border border-emerald-500/30 text-[8px] sm:text-xs font-bold text-emerald-400">
                      <CheckCircle className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                      <span className="truncate flex-1 min-w-0"><span className="hidden sm:inline">Based on </span>KES 500<span className="hidden sm:inline"> sub price</span></span>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA area */}
                <div className="p-4 sm:p-6 md:p-8 border-t border-zinc-800 bg-zinc-900/20">
                  <Link to="/signup" className="flex items-center justify-center w-full bg-red-600 hover:bg-red-700 text-white py-3 md:py-4 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg transition-all active:scale-95 group/btn border border-red-500 shadow-lg shadow-red-600/10">
                    Start Earning Free <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2 group-hover/btn:translate-x-1 transition-transform shrink-0" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Stats Header Bar */}
        <section className="border-y border-zinc-800 bg-[#07080a] py-10 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">2,400+</span>
              <span className="text-xs uppercase font-extrabold tracking-widest text-red-500 mt-1">Active Creators</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">KES 12M+</span>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 mt-1">Paid Out Monthly</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">180k+</span>
              <span className="text-xs uppercase font-extrabold tracking-widest text-red-500 mt-1">Happy Fans</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">90%</span>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 mt-1">Revenue To Creators</span>
            </div>
          </div>
        </section>

        {/* Why Creators Choose Us */}
        <section className="px-6 py-28 border-b border-zinc-800 bg-[#0a0b0e]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                Why creators choose <span className="text-red-500">The Gents Dollhouse</span>
              </h2>
              <p className="text-zinc-400 text-base sm:text-lg font-medium leading-relaxed">
                Built from the ground up for the African creator — not just adapted from Western platforms.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
              <div className="bg-[#0d0e12] border border-zinc-800 p-4 md:p-8 rounded-2xl md:rounded-3xl hover:border-red-500/40 transition-colors group">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-red-950/40 border border-red-500/30 text-red-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                  <TrendingUp className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <h3 className="text-sm md:text-xl font-black text-white mb-2 md:mb-3 leading-tight">Maximize Earnings</h3>
                <p className="text-zinc-400 text-[10px] md:text-sm leading-relaxed font-medium">
                  Keep up to <strong className="text-emerald-400">90%</strong> of your subscription revenue. We offer the lowest platform fees for verified creators — more money in your pocket, always.
                </p>
              </div>

              <div className="bg-[#0d0e12] border border-zinc-800 p-4 md:p-8 rounded-2xl md:rounded-3xl hover:border-red-500/40 transition-colors group">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-red-950/40 border border-red-500/30 text-red-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                  <Users className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <h3 className="text-sm md:text-xl font-black text-white mb-2 md:mb-3 leading-tight">Own Your Audience</h3>
                <p className="text-zinc-400 text-[10px] md:text-sm leading-relaxed font-medium">
                  Your fans, your community. Own your contact list and build direct relationships with your most loyal supporters without algorithm restrictions.
                </p>
              </div>

              <div className="bg-[#0d0e12] border border-zinc-800 p-4 md:p-8 rounded-2xl md:rounded-3xl hover:border-red-500/40 transition-colors group col-span-2 md:col-span-1">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-red-950/40 border border-red-500/30 text-red-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                  <ShieldCheck className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <h3 className="text-sm md:text-xl font-black text-white mb-2 md:mb-3 leading-tight">Secure & Instant Payouts</h3>
                <p className="text-zinc-400 text-[10px] md:text-sm leading-relaxed font-medium">
                  M-Pesa STK push and Card checkouts built natively. Instant payouts with zero withdrawal minimums or long waiting periods.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Start Earning in 3 Steps */}
        <section className="px-6 py-28 border-b border-zinc-800 bg-[#07080a]">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Start earning in <span className="text-red-500">3 steps</span>
            </h2>
            <p className="text-zinc-400 text-base sm:text-lg font-medium mb-16 max-w-xl mx-auto">
              From signup to your first M-Pesa payout — it takes less than 10 minutes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative mb-16">
              {/* Step 1 */}
              <div className="bg-[#0d0e12] border border-zinc-800 p-8 rounded-3xl relative flex flex-col items-center text-center">
                <div className="absolute -top-4 right-6 w-8 h-8 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center border-2 border-[#07080a]">
                  1
                </div>
                <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">Create Your Page</h3>
                <p className="text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed">
                  Sign up free, set your subscription price, and upload your first piece of content. Takes under 5 minutes.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#0d0e12] border border-zinc-800 p-8 rounded-3xl relative flex flex-col items-center text-center">
                <div className="absolute -top-4 right-6 w-8 h-8 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center border-2 border-[#07080a]">
                  2
                </div>
                <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">Grow Your Fans</h3>
                <p className="text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed">
                  Share your link on Instagram, TikTok, Twitter. Fans subscribe with M-Pesa or card in seconds.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#0d0e12] border border-zinc-800 p-8 rounded-3xl relative flex flex-col items-center text-center">
                <div className="absolute -top-4 right-6 w-8 h-8 rounded-full bg-emerald-500 text-black font-black text-xs flex items-center justify-center border-2 border-[#07080a]">
                  3
                </div>
                <div className="w-16 h-16 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">Get Paid Instantly</h3>
                <p className="text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed">
                  Earnings hit your M-Pesa wallet instantly after each transaction. No hold periods, no minimums.
                </p>
              </div>
            </div>

            <Link to="/signup" className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black text-base transition-all active:scale-95 border border-red-500 shadow-lg shadow-red-600/20">
              Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </section>

        {/* Featured Creators */}
        <section id="discover" className="px-6 py-24 border-b border-zinc-800 bg-[#0a0b0e]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-2">Trending on The Gents Dollhouse</h2>
                <p className="text-zinc-400 font-medium">Top Kenyan creators sharing premium content right now.</p>
              </div>
              <Link to="/discover" className="text-sm font-bold text-red-500 hover:text-red-400 flex items-center gap-1.5 transition-colors">
                View all creators <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div 
              id="creators" 
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
            >
              {creators.map((creator, i) => (
                <div key={i} className="flex-shrink-0 group relative bg-card border border-border/80 rounded-2xl sm:rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl flex flex-col justify-between">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img src={creator.img} alt={creator.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    {/* Category badge */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2.5 sm:px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-rose-400 shadow-sm">
                      {creator.category}
                    </div>
                  </div>
                  <div className="p-3 sm:p-5 flex flex-col flex-1 justify-between gap-3 sm:gap-4 bg-card">
                    <div>
                      <h3 className="text-sm sm:text-lg font-black text-foreground mb-1 flex items-center gap-1.5 truncate">
                        {creator.name}
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 fill-primary/10" />
                      </h3>
                      <div className="flex flex-col sm:flex-row justify-between text-[10px] sm:text-sm font-bold mt-1.5 sm:mt-2 gap-0.5 sm:gap-0">
                        <span className="text-muted-foreground font-medium">{creator.subs} subs</span>
                        <span className="text-primary font-extrabold">{creator.price}</span>
                      </div>
                    </div>

                    <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-black transition-all active:scale-95 shadow-md shadow-primary/20">
                      Subscribe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-6 py-24 border-b border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-black mb-3">Creators love The Gents Dollhouse</h2>
              <p className="text-muted-foreground">Real stories from creators earning real money.</p>
            </div>
            <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-4 md:gap-6 pb-6 md:pb-0 snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {testimonials.map((t, i) => (
                <div key={i} className="flex-shrink-0 w-[85vw] sm:w-[60vw] md:w-auto snap-center bg-muted/30 border border-border rounded-2xl p-7 flex flex-col gap-5 hover:border-primary/20 transition-colors hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 duration-300">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-secondary text-secondary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3 mt-auto">
                    <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" />
                    <div>
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payments / Designed for Kenya */}
        <section className="px-6 py-24 bg-background border-t border-border overflow-hidden relative">
          {/* Subtle Primary Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-semibold mb-8">
              <Lock className="w-4 h-4" /> Secure & Encrypted
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6">Designed for Kenya 🇰🇪</h2>
            <p className="text-muted-foreground text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              We process payments through <strong className="text-foreground">M-Pesa instantly</strong> — zero friction for your fans. International subscribers can use Visa or Mastercard seamlessly.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 items-center mb-12">
              {[
                { name: "M-PESA", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4NrGQhzTgIhXHqB15-5h3BWFd2hAVWucCZjleiDXKuA&s=10" },
                { name: "VISA", logoUrl: "https://i.pinimg.com/236x/2c/2e/a2/2c2ea23f50347ec3cc8ec0d47536aee8.jpg" },
                { name: "Mastercard", logoUrl: "https://i.pinimg.com/1200x/cf/01/7c/cf017c3df4b4b6ce716a19b6d146a93c.jpg" },
                { name: "Airtel Money", logoUrl: "https://i.pinimg.com/1200x/fe/6d/5f/fe6d5fe2443668b417384ede46531bee.jpg" }
              ].map(({ name, logoUrl }) => (
                <div key={name} className="px-6 md:px-8 py-3 md:py-4 rounded-xl bg-white flex items-center justify-center min-w-[140px] h-[60px] shadow-lg hover:scale-105 transition-transform duration-300">
                  {logoUrl ? (
                    <img src={logoUrl} alt={name} className="h-10 object-contain mix-blend-multiply" />
                  ) : (
                    <span className="font-bold text-black">{name}</span>
                  )}
                </div>
              ))}
            </div>
            
            <Link to="/signup" className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-xl font-black hover:scale-[1.03] transition-transform shadow-xl shadow-foreground/10">
              Start Earning Today <ArrowRight className="w-5 h-5 text-primary" />
            </Link>
          </div>
        </section>

      </main>

      {/* FAQ Section */}
      <section className="px-6 py-24 bg-background border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about earning on The Gents Dollhouse.</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "How long do payouts take?", a: "Instantly. Unlike other platforms that make you wait 30 days, The Gents Dollhouse deposits your earnings directly to your M-Pesa immediately after a subscriber pays." },
              { q: "What percentage does The Gents Dollhouse take?", a: "We take a flat 10% platform fee, which covers hosting, payment processing fees (M-Pesa/Card), and features. You keep 90% of everything you earn." },
              { q: "Can international fans subscribe?", a: "Yes! While built for Africa and M-Pesa natively, international followers can pay seamlessly using their Visa or Mastercard in USD." },
              { q: "What type of content is allowed?", a: "The Gents Dollhouse is a home for premium lifestyle, fitness, culinary, educational, and entertainment creators. Content must comply with our Terms of Service (no explicit adult content)." },
            ].map((faq, i) => (
              <details key={i} className="group bg-muted/20 border border-border rounded-2xl overflow-hidden open:bg-muted/40 transition-colors">
                <summary className="font-bold text-lg p-6 cursor-pointer flex justify-between items-center hover:text-primary transition-colors list-none marker:hidden">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-open:-rotate-180 transition-transform duration-300" />
                </summary>
                <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <a href="mailto:support@hideaway.co.ke" className="text-primary font-bold hover:underline">Contact Support</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-14 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.svg" alt="Logo" className="w-12 h-12 object-contain" />
                <span className="text-2xl font-black tracking-tighter text-primary leading-tight">The Gents Dollhouse<span className="text-secondary">.</span></span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">The premium creator platform built for Kenya and all of Africa.</p>
            </div>
            {/* Creators */}
            <div>
              <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-foreground">Creators</h4>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <Link to="/signup" className="hover:text-primary transition-colors">Get Started</Link>
                <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
                <a href="#" className="hover:text-primary transition-colors">Pricing & Fees</a>
                <a href="#" className="hover:text-primary transition-colors">Creator Handbook</a>
              </div>
            </div>
            {/* Fans */}
            <div>
              <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-foreground">Fans</h4>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <Link to="/discover" className="hover:text-primary transition-colors">Discover Creators</Link>
                <Link to="/login" className="hover:text-primary transition-colors">Login</Link>
                <a href="#" className="hover:text-primary transition-colors">Fan FAQ</a>
                <a href="#" className="hover:text-primary transition-colors">Gift Subscriptions</a>
              </div>
            </div>
            {/* Company */}
            <div>
              <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-foreground">Company</h4>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <a href="#" className="hover:text-primary transition-colors">About The Gents Dollhouse</a>
                <a href="#" className="hover:text-primary transition-colors">Blog</a>
                <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">© 2026 The Gents Dollhouse Technologies Ltd. All rights reserved.</div>
            <div className="flex items-center gap-3">
              {["M-PESA", "VISA", "MC"].map((b) => (
                <div key={b} className="px-2.5 py-1 rounded border border-border bg-muted text-xs font-bold text-muted-foreground">
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
