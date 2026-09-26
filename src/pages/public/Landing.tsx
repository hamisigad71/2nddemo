import { ShieldCheck, TrendingUp, Users, CheckCircle, ArrowRight, Menu, Star, Zap, Lock, X, DollarSign, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

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
    quote: "Hideaway changed everything for me. I went from zero to KES 120,000/month in 4 months. M-Pesa payouts hit instantly — no waiting, no friction.",
    name: "Amina K.",
    role: "Fitness Creator · 12k subscribers",
    img: "https://images.unsplash.com/photo-1531123414780-f74242c2b052?w=200&q=80",
  },
  {
    quote: "I've tried other platforms but they didn't get Kenya. Hideaway speaks my fans' language — M-Pesa is all they need. My income tripled in 3 months.",
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
          <div className="text-2xl font-black tracking-tighter text-primary drop-shadow-[0_0_12px_rgba(0,200,110,0.4)]">
            Hideaway<span className="text-secondary">.</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#discover" className="hover:text-primary transition-colors text-muted-foreground">Discover</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors text-muted-foreground">How It Works</a>
          <a href="#creators" className="hover:text-primary transition-colors text-muted-foreground">Creators</a>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/login" className="hidden md:inline-flex text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
            Login
          </Link>
          <Link to="/signup" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02]">
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
            <button onClick={() => setMobileMenuOpen(false)} className="self-end text-muted-foreground hover:text-foreground">
              <X className="w-6 h-6" />
            </button>
            <div className="text-2xl font-black tracking-tighter text-primary">Hideaway<span className="text-secondary">.</span></div>
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
          className="relative flex flex-col items-center text-center overflow-hidden min-h-[80svh] md:min-h-[100svh]"
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
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.95) 100%)' }}
            />
            <div
              className="absolute inset-0 hidden md:block"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.65) 100%)' }}
            />
            {/* Bottom fade into page background */}
            <div
              className="absolute bottom-0 left-0 right-0 h-48 md:h-28"
              style={{ background: 'linear-gradient(to top, hsl(0 0% 10%) 0%, transparent 100%)' }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between md:justify-center items-center px-6 pt-19 pb-10 md:py-40 w-full max-w-4xl mx-auto flex-1">

            {/* TOP GROUP: Badge + Headline */}
            <div className="flex flex-row items-center justify-center md:flex-col text-center md:text-center gap-4 md:gap-0 mb-6 md:mb-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs md:text-sm font-medium mb-6 md:mb-8 shadow-2xl backdrop-blur-md hover:bg-white/15 hover:border-white/30 transition-all cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Kenyan Creator Economy — Built Different 🇰🇪</span>
              </div>

              {/* Headline */}
              <h1 className="text-[1.35rem] sm:text-5xl md:text-7xl font-black tracking-tight mb-4 md:mb-6 leading-[1.05] whitespace-nowrap md:whitespace-normal">
                <span className="text-white drop-shadow-lg">Your Content.</span>{' '}
                <span className="text-white drop-shadow-lg">Your Fans.</span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-300 to-secondary drop-shadow-lg">
                  Your Money.
                </span>
              </h1>
            </div>

            {/* BOTTOM GROUP: Description + CTAs + Social Proof */}
            <div className="flex flex-col items-center text-center w-full">
              <p className="text-sm sm:text-base md:text-xl text-white/80 max-w-2xl mb-6 md:mb-10 leading-relaxed">
                The premium subscription platform for African creators. Monetize your audience directly through{' '}
                <span className="text-primary font-semibold">M-Pesa</span>, cards &amp; more. No middleman. No hassle.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-row items-center gap-3 w-full justify-center px-1 sm:px-0">
                <Link to="/signup" className="group w-1/2 sm:w-auto flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-2 py-3.5 sm:px-8 sm:py-4 rounded-xl text-sm sm:text-base font-bold hover:bg-emerald-500 transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.03]">
                  Start Earning
                  <ArrowRight className="hidden sm:block w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/discover" className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/25 hover:border-white/40 px-2 py-3.5 sm:px-8 sm:py-4 rounded-xl text-sm sm:text-base font-semibold transition-all">
                  Explore Creators
                </Link>
              </div>

              {/* Social Proof Mini */}
              <div className="mt-10 flex items-center gap-2 text-sm text-white/70">
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
        <section className="px-6 py-28 relative overflow-hidden bg-background border-b border-border">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />

          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
            {/* Left Content */}
            <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
                <TrendingUp className="w-3.5 h-3.5" /> Growth Calculator
              </div>
              <h2 className="text-xl md:text-5xl font-black mb-4 md:mb-6 tracking-tight leading-tight max-w-[280px] md:max-w-none mx-auto md:mx-0">
                Calculate your{' '}
                <span className="block md:inline text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">earning potential</span>
              </h2>
              <p className="text-muted-foreground mb-10 text-lg leading-relaxed max-w-lg">
                See what happens when you monetize directly. Estimate your revenue if just <strong>5%</strong> of your audience subscribes at KES 500/month.
              </p>
              
              <div className="w-full bg-muted/30 border border-border rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm">
                <div className="flex justify-between items-center mb-5 md:mb-6">
                  <span className="font-bold text-foreground text-xs md:text-sm uppercase tracking-wider">Current Followers</span>
                  <span className="text-2xl md:text-3xl font-black text-primary">{followers.toLocaleString()}</span>
                </div>
                
                <div className="relative pt-2 pb-2">
                  <input 
                    type="range" 
                    min="1000" 
                    max="1000000" 
                    step="1000"
                    value={followers}
                    onChange={(e) => setFollowers(Number(e.target.value))}
                    className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                </div>
                
                <div className="flex justify-between text-xs font-bold text-muted-foreground mt-2">
                  <span>1k</span>
                  <span>1M+</span>
                </div>
              </div>
            </div>
            
            {/* Right Content - Premium Card */}
            <div className="w-full md:w-1/2">
              <div className="relative group perspective-1000">
                {/* Animated glow behind the card */}
                <div className="absolute -inset-1 bg-gradient-to-b from-primary/40 to-background rounded-[2.5rem] blur-xl opacity-40 group-hover:opacity-70 transition duration-700" />
                
                <div className="relative bg-card border border-border p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] text-center shadow-2xl z-10 transition-transform duration-500 group-hover:scale-[1.02] flex flex-col items-center overflow-hidden">
                  
                  {/* Subtle noise texture */}
                  <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

                  <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 text-primary rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 transform group-hover:-translate-y-1 group-hover:scale-110 transition-all duration-300 shadow-inner border border-primary/20">
                      <DollarSign className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    
                    <h3 className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2 md:mb-4">Estimated Monthly Income</h3>
                    
                    <div className="flex items-center justify-center gap-1 md:gap-1.5 mb-1 w-full">
                      <span className="text-sm md:text-2xl font-bold text-muted-foreground mt-1 md:mt-2">KES</span>
                      <span className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground tracking-tight">
                        {(followers * 0.05 * 500).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 border border-border text-xs font-semibold text-muted-foreground mt-4">
                      <CheckCircle className="w-3.5 h-3.5 text-primary" /> Based on KES 500 sub price
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-border w-full">
                      <Link to="/signup" className="flex items-center justify-center w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg hover:brightness-110 hover:shadow-xl hover:shadow-primary/25 transition-all group/btn">
                        Start Earning Free <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-muted/20 py-4 px-3">
          <div className="max-w-5xl mx-auto grid grid-cols-4 gap-1 text-center">
            {[
              { value: "2,400+", label: "Active Creators" },
              { value: "KES 12M+", label: "Paid Out Monthly" },
              { value: "180k+", label: "Happy Fans" },
              { value: "90%", label: "Revenue to Creators" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 px-1">
                <div className="text-base sm:text-2xl md:text-3xl font-black text-foreground leading-tight">{stat.value}</div>
                <div className="text-[9px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Value Propositions */}
        <section className="px-6 py-24 bg-muted/20 border-b border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-black mb-3">Why creators choose Hideaway</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Built from the ground up for the African creator — not just adapted from Western platforms.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {[
                { icon: TrendingUp, color: "primary", title: "Maximize Earnings", body: "Keep up to 90% of your subscription revenue. We offer the lowest platform fees for verified creators — more money in your pocket, always." },
                { icon: Users, color: "secondary", title: "Own Your Audience", body: "Your fans, your community. Own your contact list and build direct relationships with your most loyal supporters." },
                { icon: ShieldCheck, color: "primary", title: "Secure & Instant Payouts", body: "M-Pesa STK push and Card checkouts built natively. Instant payouts with zero withdrawal minimums or waiting periods." },
              ].map(({ icon: Icon, color, title, body }, i) => (
                <div key={i} className={`group bg-background border border-border p-5 md:p-8 rounded-2xl hover:border-${color}/40 transition-all duration-300 hover:shadow-lg hover:shadow-${color}/5 hover:-translate-y-1 ${i === 2 ? 'col-span-2 md:col-span-1 mx-auto max-w-sm md:max-w-none' : ''}`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-${color}/10 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-${color}/20 transition-colors`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 text-${color}`} />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 leading-tight">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-xs md:text-sm">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-6 py-24 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black mb-3">Start earning in 3 steps</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">From signup to your first M-Pesa payout — it takes less than 10 minutes.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-8 relative">
              {/* Connector line (desktop) */}
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {[
                { step: "01", icon: Zap, title: "Create Your Page", body: "Sign up free, set your subscription price, and upload your first piece of content. Takes under 5 minutes." },
                { step: "02", icon: Users, title: "Grow Your Fans", body: "Share your Hideaway link on Instagram, TikTok, Twitter. Fans subscribe with M-Pesa or card in seconds." },
                { step: "03", icon: TrendingUp, title: "Get Paid Instantly", body: "Earnings hit your M-Pesa wallet instantly after each transaction. No hold periods, no minimums." },
              ].map(({ icon: Icon, title, body }, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="relative mb-3 sm:mb-6">
                    <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-muted border border-border flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300 shadow-sm">
                      <Icon className="w-5 h-5 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-black text-[10px] sm:text-xs font-black flex items-center justify-center shadow-md">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-[11px] sm:text-lg font-bold mb-1 sm:mb-2 leading-tight">{title}</h3>
                  <p className="text-muted-foreground text-[9px] sm:text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link to="/signup" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-primary/20 hover:scale-[1.03]">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Creators */}
        <section id="discover" className="px-6 py-24 border-b border-border bg-muted/10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-black mb-2">Trending on Hideaway</h2>
                <p className="text-muted-foreground">Top Kenyan creators sharing premium content right now.</p>
              </div>
              <Link to="/discover" className="text-sm font-bold text-primary hover:text-emerald-300 flex items-center gap-1 transition-colors">
                View all creators <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div 
              id="creators" 
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
            >
              {creators.map((creator, i) => (
                <div key={i} className="flex-shrink-0 group relative bg-background border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer">
                  <div className="relative aspect-[4/5] sm:aspect-square overflow-hidden bg-muted">
                    <img src={creator.img} alt={creator.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Category badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-background/70 backdrop-blur-sm border border-border text-xs font-semibold text-secondary">
                      {creator.category}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold mb-1 flex items-center gap-1.5">
                      {creator.name}
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    </h3>
                    <div className="flex items-center justify-between text-sm mt-3">
                      <span className="text-muted-foreground">{creator.subs} subscribers</span>
                      <span className="font-bold text-secondary">{creator.price}</span>
                    </div>
                    <button className="mt-4 w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-primary py-2 rounded-lg text-sm font-semibold transition-all duration-200">
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
              <h2 className="text-3xl md:text-4xl font-black mb-3">Creators love Hideaway</h2>
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
            <p className="text-muted-foreground">Everything you need to know about earning on Hideaway.</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "How long do payouts take?", a: "Instantly. Unlike other platforms that make you wait 30 days, Hideaway deposits your earnings directly to your M-Pesa immediately after a subscriber pays." },
              { q: "What percentage does Hideaway take?", a: "We take a flat 10% platform fee, which covers hosting, payment processing fees (M-Pesa/Card), and features. You keep 90% of everything you earn." },
              { q: "Can international fans subscribe?", a: "Yes! While built for Africa and M-Pesa natively, international followers can pay seamlessly using their Visa or Mastercard in USD." },
              { q: "What type of content is allowed?", a: "Hideaway is a home for premium lifestyle, fitness, culinary, educational, and entertainment creators. Content must comply with our Terms of Service (no explicit adult content)." },
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
              <div className="text-2xl font-black tracking-tighter text-primary mb-3">Hideaway<span className="text-secondary">.</span></div>
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
                <a href="#" className="hover:text-primary transition-colors">About Hideaway</a>
                <a href="#" className="hover:text-primary transition-colors">Blog</a>
                <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">© 2026 Hideaway Technologies Ltd. All rights reserved.</div>
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
