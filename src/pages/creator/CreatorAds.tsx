import React, { useState, useEffect, useMemo } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import {
  Handshake,
  Search,
  CheckCircle2,
  Send,
  X,
  Check,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Eye,
  MousePointer,
  Clock,
  CreditCard,
  Plus,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';
import {
  getPlatformAds,
  trackAdImpression,
  trackAdClick,
  applyForCreatorBrandDeal,
  getCreatorBrandDealApplications,
  getCreatorAdOrders,
  createCreatorAdOrder,
  getStoredCreatorProfile,
  getUserProfile,
  type PlatformAd,
  type CreatorAdOrder,
  type AdApplication
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';

const CREATOR_CATEGORIES = [
  { id: 'all', label: 'All Opportunities' },
  { id: 'brand_deal', label: 'Paid Brand Deals' },
  { id: 'creator_perk', label: 'Studio & Production' },
  { id: 'sponsorship', label: 'VIP Shoots & Events' },
];

const PROMOTION_PACKAGES = [
  {
    id: 'starter',
    name: '3 Days Spotlight',
    days: 3,
    price: 800,
    tag: 'Quick Boost',
    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    features: [
      'Placed every 3 posts in Subscriber Feed',
      'Direct Subscribe & Profile CTA button',
      'Real-time impression & click analytics',
      'Estimated ~1,500+ targeted subscriber views'
    ]
  },
  {
    id: 'featured',
    name: '7 Days Featured Campaign',
    days: 7,
    price: 1500,
    tag: 'Most Popular',
    popular: true,
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    features: [
      'Top priority rotation in Subscriber Feeds',
      'Verified "Sponsored Creator" golden badge',
      'Direct link to your PPV & monthly tiers',
      'Estimated ~5,000+ targeted subscriber views',
      'Dedicated admin priority review (< 2 hours)'
    ]
  },
  {
    id: 'vip',
    name: '30 Days VIP Super-Boost',
    days: 30,
    price: 4500,
    tag: 'Best Value',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    features: [
      'Full month uninterrupted spotlight',
      'Featured placement in Subscriber Feed & Discover',
      'Custom promo banner and tagline',
      'Estimated ~25,000+ subscriber views across Kenya',
      'Direct promotion to newly registered subscribers'
    ]
  }
];

const CreatorAds: React.FC = () => {
  const { user } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<'promote' | 'deals'>('promote');
  const [ads, setAds] = useState<PlatformAd[]>([]);
  const [applications, setApplications] = useState<AdApplication[]>([]);
  const [myOrders, setMyOrders] = useState<CreatorAdOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Brand Deal modal state
  const [selectedAdForApplication, setSelectedAdForApplication] = useState<PlatformAd | null>(null);
  const [pitchText, setPitchText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Promotion Booking Modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(PROMOTION_PACKAGES[1]);
  const [promoHeadline, setPromoHeadline] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoImage, setPromoImage] = useState('');
  const [promoPhone, setPromoPhone] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  const creatorId = user?.id || 'creator-default';
  const creatorName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Creator';
  const creatorHandle = `@${creatorName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedAds, fetchedApps, fetchedOrders, userProfile] = await Promise.all([
        getPlatformAds('all', false),
        getCreatorBrandDealApplications(creatorId),
        getCreatorAdOrders(),
        user?.id ? getUserProfile(user.id) : null
      ]);
      setAds(fetchedAds);
      setApplications(fetchedApps);

      // Filter orders for this creator
      const localProfile = user?.id ? getStoredCreatorProfile(user.id) : null;
      const filteredOrders = fetchedOrders.filter(
        o => o.creator_id === creatorId || o.creator_id === user?.id
      );
      setMyOrders(filteredOrders);

      // Pre-populate promo banner with creator cover if empty
      const defaultCover =
        localProfile?.cover_image ||
        userProfile?.cover_image ||
        (user?.user_metadata?.cover_image as string) ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80';
      if (!promoImage) {
        setPromoImage(defaultCover);
      }
      if (!promoHeadline) {
        setPromoHeadline(`Subscribe to ${creatorName} for Exclusive Daily VIP Content`);
      }
      if (!promoDescription) {
        setPromoDescription(`Unlock private photoshoots, VIP direct messaging, and daily behind the scenes stories.`);
      }

      // Track impressions for loaded ads
      fetchedAds.forEach(ad => {
        trackAdImpression(ad.id);
      });
    } catch (err) {
      console.error('Failed to load creator ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('tgd_ads_updated', handleUpdate);
    window.addEventListener('tgd_applications_updated', handleUpdate);
    window.addEventListener('tgd_ad_orders_updated', handleUpdate);
    return () => {
      window.removeEventListener('tgd_ads_updated', handleUpdate);
      window.removeEventListener('tgd_applications_updated', handleUpdate);
      window.removeEventListener('tgd_ad_orders_updated', handleUpdate);
    };
  }, [creatorId]);

  // Active platform ads published by the admin for this creator
  const myLiveAds = useMemo(() => {
    return ads.filter(ad => {
      if (ad.status !== 'active') return false;
      const isMyCreatorId = ad.creator_id === creatorId || (user?.id && ad.creator_id === user.id);
      const isMyName = Boolean(ad.creator_name && creatorName && ad.creator_name.toLowerCase().includes(creatorName.toLowerCase()));
      const isMyUrl = Boolean(ad.cta_url && user?.id && ad.cta_url.includes(user.id));
      return isMyCreatorId || isMyName || isMyUrl;
    });
  }, [ads, creatorId, user?.id, creatorName]);

  const filteredAds = useMemo(() => {
    return ads
      .filter(ad => ad.ad_type !== 'creator' && ad.category !== 'creator_spotlight')
      .filter(ad => {
        const matchesCategory =
          activeCategory === 'all' ? true : ad.category === activeCategory;
        const matchesSearch =
          ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ad.sponsor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ad.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });
  }, [ads, activeCategory, searchQuery]);

  const hasApplied = (adId: string) => {
    return applications.some(a => a.ad_id === adId);
  };

  const handleOpenApplicationModal = (ad: PlatformAd) => {
    trackAdClick(ad.id);
    setSelectedAdForApplication(ad);
    setPitchText('');
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdForApplication) return;

    setIsSubmitting(true);
    try {
      await applyForCreatorBrandDeal(
        selectedAdForApplication.id,
        creatorId,
        creatorName,
        creatorHandle,
        pitchText.trim() || 'Excited to collaborate on this campaign! Check out my profile and stats.'
      );

      toast.success('Brand deal application submitted to platform admin!');
      setSelectedAdForApplication(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookPromotionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoHeadline.trim()) {
      toast.error('Please enter a promotion headline');
      return;
    }
    if (!promoPhone.trim()) {
      toast.error('Please enter your M-Pesa phone number for billing');
      return;
    }

    setIsBookingSubmitting(true);
    try {
      const localProfile = user?.id ? getStoredCreatorProfile(user.id) : null;
      const avatarUrl =
        localProfile?.avatar ||
        localProfile?.avatar_url ||
        (user?.user_metadata?.avatar as string) ||
        (user?.user_metadata?.avatar_url as string) ||
        null;

      await createCreatorAdOrder({
        creator_id: creatorId,
        creator_name: creatorName,
        creator_avatar: avatarUrl,
        creator_handle: creatorHandle,
        title: promoHeadline.trim(),
        description: promoDescription.trim() || `Unlock private photoshoots, VIP direct messaging, and daily behind the scenes stories.`,
        image_url: promoImage.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
        package_name: selectedPackage.name,
        duration_days: selectedPackage.days,
        amount: selectedPackage.price,
        phone: promoPhone.trim(),
        payment_status: 'paid',
        status: 'pending'
      });

      toast.success('Promotion request submitted!', {
        description: `Your ${selectedPackage.name} (KES ${selectedPackage.price.toLocaleString()}) has been received and sent to platform admin for immediate publishing.`
      });
      setIsBookingModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit promotion request');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  return (
    <CreatorLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3 h-3 text-red-500" /> Official Platform Advertising
                </span>
                <span className="text-[10px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  Subscribers Feed Placement
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Promote Your Profile to All Subscribers
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
                Pay platform management to feature your profile directly in the subscriber home feed.
                Reach thousands of active Kenyan gentlemen fans, boost monthly subscriptions, and maximize your pay-per-view revenue.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-500 text-white font-black px-6 py-3.5 rounded-2xl text-sm transition-all shadow-xl shadow-red-600/30 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Book Profile Promotion</span>
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 font-semibold text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Guaranteed Feed Impressions</span>
              </div>
            </div>
          </div>

          {/* Quick value props pill strip */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>5x Profile Discovery</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <Megaphone className="w-4 h-4 text-red-400 shrink-0" />
              <span>Every 3 Feed Posts</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Verified Sponsored Badge</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <CreditCard className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Instant M-Pesa Billing</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Profile Promotions vs Brand Deals */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-2xl border border-border w-full sm:w-auto">
            <button
              onClick={() => setActiveMainTab('promote')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMainTab === 'promote'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Promote My Profile</span>
              {myOrders.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeMainTab === 'promote' ? 'bg-black/30 text-white' : 'bg-muted text-foreground'}`}>
                  {myOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveMainTab('deals')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMainTab === 'deals'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Brand Deals & Perks</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeMainTab === 'deals' ? 'bg-black/30 text-white' : 'bg-muted text-foreground'}`}>
                {ads.length}
              </span>
            </button>
          </div>

          {activeMainTab === 'deals' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search sponsorships..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500/80 transition-colors"
              />
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PROMOTE MY PROFILE */}
        {/* ========================================================= */}
        {activeMainTab === 'promote' && (
          <div className="space-y-8">
            {/* Promotion Packages Cards */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Available Promotion Packages</h2>
                  <p className="text-xs text-muted-foreground font-medium">Select a sponsorship tier to feature your profile to all subscribers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PROMOTION_PACKAGES.map(pkg => (
                  <div
                    key={pkg.id}
                    className={`relative bg-card border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md ${
                      pkg.popular
                        ? 'border-red-500/60 ring-2 ring-red-500/20'
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-3 py-1 rounded-full shadow-lg">
                        🔥 Most Popular Choice
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${pkg.badgeClass}`}>
                          {pkg.tag}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">{pkg.days} Days Exposure</span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-foreground">{pkg.name}</h3>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-black text-foreground">
                            KES {pkg.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">/ flat fee</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border space-y-2">
                        {pkg.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 mt-4 border-t border-border/60">
                      <button
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setIsBookingModalOpen(true);
                        }}
                        className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          pkg.popular
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                            : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                        }`}
                      >
                        <span>Choose {pkg.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My Active & Past Promotion Orders */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Your Promotion Requests & Live Ads</h2>
                  <p className="text-xs text-muted-foreground font-medium">Track your paid profile promotions currently live in Subscriber Feeds</p>
                </div>
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New Campaign
                </button>
              </div>

              {myLiveAds.length === 0 && myOrders.length === 0 ? (
                <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">No Profile Promotions Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    You haven't booked any platform sponsored ads yet. Promoted creators get placed directly in front of thousands of gentlemen subscribers on their main feeds!
                  </p>
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Book Your First Promotion
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Live Platform Ads posted by Admin */}
                  {myLiveAds.map(ad => (
                    <div
                      key={ad.id}
                      className="bg-card border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-md bg-gradient-to-r from-emerald-950/10 via-card to-card"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-14 h-14 rounded-xl object-cover border border-emerald-500/30 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-foreground">{ad.title}</h4>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-semibold">
                              Placement: {ad.target_audience === 'all' ? 'All Platform Subscribers & Discover' : 'Subscriber Feeds'}
                            </span>
                          </div>
                        </div>

                        <span className="self-start px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Live in Subscriber Feeds (Posted by Admin)
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {ad.description}
                      </p>

                      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 font-bold text-foreground">
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            {ad.impressions || 0} Views by Subscribers
                          </span>
                          <span className="flex items-center gap-1.5 font-bold text-foreground">
                            <MousePointer className="w-3.5 h-3.5 text-sky-400" />
                            {ad.clicks || 0} Profile Clicks
                          </span>
                        </div>
                        {ad.expires_at && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Active until {new Date(ad.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Promotion Orders Queue */}
                  {myOrders.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myOrders.map(order => (
                        <div
                          key={order.id}
                          className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm hover:border-border/80 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={order.image_url}
                                alt={order.title}
                                className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                              />
                              <div>
                                <h4 className="text-sm font-black text-foreground line-clamp-1">{order.title}</h4>
                                <span className="text-[11px] text-muted-foreground font-semibold">{order.package_name} ({order.duration_days} days)</span>
                              </div>
                            </div>

                            {order.status === 'published' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live in Feeds
                              </span>
                            ) : order.status === 'rejected' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-500 border border-rose-500/30">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Admin Review
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {order.description}
                          </p>

                          <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                              <span>KES {order.amount.toLocaleString()}</span>
                              <span className="text-[10px] font-normal text-muted-foreground">• M-Pesa {order.phone}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BRAND DEALS & PERKS */}
        {/* ========================================================= */}
        {activeMainTab === 'deals' && (
          <div className="space-y-6">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CREATOR_CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-foreground text-background border border-foreground shadow-sm'
                        : 'bg-card text-muted-foreground hover:text-foreground border border-border hover:border-border/80'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="p-16 text-center text-muted-foreground font-bold text-sm">
                Loading creator campaigns...
              </div>
            ) : filteredAds.length === 0 ? (
              <div className="p-16 text-center bg-card border border-border rounded-3xl shadow-sm">
                <Handshake className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-bold text-foreground text-base">No brand deals found in this category</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Platform admins are curating new paid fashion shoots and studio sponsorships. Check back shortly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAds.map(ad => {
                  const applied = hasApplied(ad.id);

                  return (
                    <div
                      key={ad.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col justify-between hover:border-border/80 transition-all duration-300 group shadow-sm hover:shadow-md"
                    >
                      {/* Banner Image */}
                      <div>
                        <div className="h-48 w-full relative bg-muted overflow-hidden">
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                          {/* Sponsor & Badge */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/10 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-red-500" />
                              {ad.sponsor_name}
                            </span>

                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/30">
                              {ad.badge || 'Sponsored'}
                            </span>
                          </div>

                          {/* Perk Tag */}
                          {ad.perk_value && (
                            <div className="absolute bottom-3 left-3">
                              <span className="text-xs font-black text-white bg-red-600/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-red-500/30">
                                {ad.perk_value}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-3">
                          <h3 className="text-base font-bold text-foreground group-hover:text-red-500 transition-colors line-clamp-1">
                            {ad.title}
                          </h3>

                          <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2">
                            {ad.description}
                          </p>

                          {/* Deliverables */}
                          {ad.requirements && ad.requirements.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Campaign Deliverables:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {ad.requirements.map((req, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-semibold text-foreground bg-muted border border-border px-2 py-0.5 rounded-md"
                                  >
                                    {req}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="p-5 pt-0">
                        {applied ? (
                          <div className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold py-2.5 rounded-xl text-xs">
                            <Check className="w-3.5 h-3.5" />
                            <span>Application Submitted</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenApplicationModal(ad)}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
                          >
                            <span>{ad.cta_text || 'Apply for Deal'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: BOOK PROFILE PROMOTION */}
        {/* ========================================================= */}
        {isBookingModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-card border border-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-6">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20">
                    <Megaphone className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-foreground">Book Profile Promotion Ad</h3>
                    <p className="text-xs text-muted-foreground">Admin will post you as a sponsored ad for all subscribers</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBookingModalOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleBookPromotionSubmit} className="p-6 space-y-5">
                {/* 1. Package selector */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-2">
                    Select Promotion Duration & Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PROMOTION_PACKAGES.map(pkg => {
                      const isSelected = selectedPackage.id === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-500/10 border-red-500 ring-2 ring-red-500/20'
                              : 'bg-muted/40 border-border hover:border-border/80'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-muted-foreground block">{pkg.days} Days</span>
                          <span className="text-sm font-black text-foreground block mt-0.5">KES {pkg.price.toLocaleString()}</span>
                          <span className="text-[9px] font-semibold text-red-500 block mt-1">{pkg.tag}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Promotion Headline */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Ad Headline / Pitch
                  </label>
                  <input
                    type="text"
                    value={promoHeadline}
                    onChange={e => setPromoHeadline(e.target.value)}
                    placeholder="e.g. Subscribe to Wairimu for Exclusive Daily VIP Content"
                    required
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                {/* 3. Description / Call to Action note */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Ad Bio / Offer Note
                  </label>
                  <textarea
                    rows={2}
                    value={promoDescription}
                    onChange={e => setPromoDescription(e.target.value)}
                    placeholder="Brief description of what subscribers unlock on your profile..."
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                </div>

                {/* 4. Banner image URL */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Promo Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={promoImage}
                    onChange={e => setPromoImage(e.target.value)}
                    placeholder="https://..."
                    required
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                {/* 5. M-Pesa billing number */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    M-Pesa Phone Number for Billing
                  </label>
                  <input
                    type="tel"
                    value={promoPhone}
                    onChange={e => setPromoPhone(e.target.value)}
                    placeholder="07XXXXXXXX or 2547XXXXXXXX"
                    required
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    An STK push for KES {selectedPackage.price.toLocaleString()} will be billed upon admin approval.
                  </p>
                </div>

                {/* Live Card Preview */}
                <div className="bg-muted/30 border border-border rounded-2xl p-3.5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Live Feed Card Preview:
                  </span>
                  <div className="bg-background border border-border rounded-xl p-3 flex items-center gap-3">
                    <img
                      src={promoImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                      alt="Preview"
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground truncate">{creatorName}</span>
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-500 text-[9px] font-bold rounded">
                          Sponsored
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{promoHeadline || 'Your headline here...'}</p>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBookingSubmitting}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-red-600/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isBookingSubmitting ? 'Submitting...' : `Submit Request (KES ${selectedPackage.price.toLocaleString()})`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: CREATOR APPLICATION FOR BRAND DEAL */}
        {/* ========================================================= */}
        {selectedAdForApplication && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-red-600/10 text-red-500 rounded-lg border border-red-500/20">
                    <Handshake className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-foreground">Brand Deal Application</h3>
                    <p className="text-xs text-muted-foreground">Direct proposal to {selectedAdForApplication.sponsor_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAdForApplication(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleApplicationSubmit} className="p-6 space-y-4">
                <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      {selectedAdForApplication.sponsor_name}
                    </span>
                    {selectedAdForApplication.perk_value && (
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {selectedAdForApplication.perk_value}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    {selectedAdForApplication.title}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-xl border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Applicant</span>
                    <span className="font-bold text-foreground">{creatorName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Channel Handle</span>
                    <span className="font-bold text-red-500">{creatorHandle}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Proposal Note / Availability
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell the brand why you are a great fit, your preferred dates, or links to your best content..."
                    value={pitchText}
                    onChange={e => setPitchText(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  By submitting this application, you agree to fulfill the agreed deliverables if selected. Platform administrators review and notify creators within 24-48 hours.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedAdForApplication(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-red-600/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Proposal'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CreatorLayout>
  );
};

export default CreatorAds;
