import { ShieldCheck, TrendingUp, Users, CheckCircle, ArrowRight, Menu, Star, Zap, Lock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const heroImages = [
  "https://i.pinimg.com/736x/c6/ff/a6/c6ffa63b68d9f215fd063ffb97f33842.jpg",
  "https://i.pinimg.com/1200x/37/fd/dd/37fddd03ee8b2e1a05c297e20d261601.jpg",
  "https://i.pinimg.com/736x/f6/b6/de/f6b6de8523e31a9f04f60ca66639c42f.jpg",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1400&q=85",
  "https://i.pinimg.com/736x/80/78/c3/8078c38f0cb612302707c7429e3ecf59.jpg",
];

const creators = [
  { name: "Amina K.", category: "Fitness", subs: "12k", price: "KES 500/mo", img: "https://images.unsplash.com/photo-1531123414780-f74242c2b052?w=800&q=80" },
  { name: "Chef Kamau", category: "Culinary Arts", subs: "8.5k", price: "KES 1,000/mo", img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80" },
  { name: "Wanjiku Tech", category: "Education", subs: "24k", price: "KES 300/mo", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80" },
  { name: "ODC Music", category: "Entertainment", subs: "45k", price: "KES 800/mo", img: "https://images.unsplash.com/photo-1516280440502-6286fa6ef598?w=800&q=80" },
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
            {heroImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{
                  opacity: i === heroIndex ? 1 : 0,
                  transition: 'opacity 1.5s ease-in-out',
                }}
                loading={i <= 1 ? 'eager' : 'lazy'}
              />
            ))}
            {/* Semi-transparent dark overlay — keeps images visible but text readable */}
            <div
              className="absolute inset-0 block md:hidden"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.95) 100%)' }}
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
          <div className="relative z-10 flex flex-col items-center justify-end md:justify-center px-6 pt-48 pb-10 md:py-40 w-full max-w-4xl mx-auto mt-auto md:mt-0">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs md:text-sm font-semibold mb-6 md:mb-8 shadow-sm backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              🇰🇪 Kenyan Creator Economy — Built Different
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-4 md:mb-6 leading-[1.05]">
              <span className="text-white drop-shadow-lg">Your Content.</span><br />
              <span className="text-white drop-shadow-lg">Your Fans.</span>{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-300 to-secondary drop-shadow-lg">
                Your Money.
              </span>
            </h1>

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
            <div className="mt-8 flex items-center gap-2">
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
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-muted/20 py-6 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "2,400+", label: "Active Creators" },
              { value: "KES 12M+", label: "Paid Out Monthly" },
              { value: "180k+", label: "Happy Fans" },
              { value: "90%", label: "Revenue to Creators" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="text-2xl md:text-3xl font-black text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 relative">
              {/* Connector line (desktop) */}
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {[
                { step: "01", icon: Zap, title: "Create Your Page", body: "Sign up free, set your subscription price, and upload your first piece of content. Takes under 5 minutes." },
                { step: "02", icon: Users, title: "Grow Your Fans", body: "Share your Hideaway link on Instagram, TikTok, Twitter. Fans subscribe with M-Pesa or card in seconds." },
                { step: "03", icon: TrendingUp, title: "Get Paid Instantly", body: "Earnings hit your M-Pesa wallet instantly after each transaction. No hold periods, no minimums." },
              ].map(({ icon: Icon, title, body }, i) => (
                <div key={i} className={`flex flex-col items-center text-center group ${i === 2 ? 'col-span-2 md:col-span-1 mx-auto px-4 md:px-0' : ''}`}>
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300 shadow-sm">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-black flex items-center justify-center shadow-md">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
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
            <div id="creators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {creators.map((creator, i) => (
                <div key={i} className="group relative bg-background border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img src={creator.img} alt={creator.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-muted/30 border border-border rounded-2xl p-7 flex flex-col gap-5 hover:border-primary/20 transition-colors hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 duration-300">
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
        <section className="px-6 py-24 bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.15),transparent_60%)]" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-semibold mb-8">
              <Lock className="w-3.5 h-3.5" /> Secure & Encrypted
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6">Designed for Kenya 🇰🇪</h2>
            <p className="text-emerald-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              We process payments through M-Pesa instantly — zero friction for your fans. International subscribers can use Visa or Mastercard seamlessly.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 items-center mb-10">
              {["M-PESA", "VISA", "Mastercard", "Airtel Money"].map((method) => (
                <div key={method} className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/20 font-bold tracking-wider text-base shadow-lg">
                  {method}
                </div>
              ))}
            </div>
            <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-black hover:bg-emerald-50 transition-all shadow-xl hover:scale-[1.03]">
              Start Earning Today <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

      </main>

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
