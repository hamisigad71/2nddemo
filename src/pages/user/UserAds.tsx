import React, { useState, useEffect, useMemo } from 'react';
import UserLayout from '../../components/UserLayout';
import {
  Megaphone,
  Search,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  ArrowRight,
  X
} from 'lucide-react';
import {
  getPlatformAds,
  trackAdImpression,
  trackAdClick
} from '../../lib/db';
import type { PlatformAd } from '../../lib/db';
import { toast } from '../../context/ToastContext';

const CATEGORIES = [
  { id: 'all', label: 'All Offers' },
  { id: 'nightlife', label: 'Nightlife & VIP' },
  { id: 'luxury', label: 'Luxury Escapes' },
  { id: 'lifestyle', label: 'Spirits & Dining' },
];

const UserAds: React.FC = () => {
  const [ads, setAds] = useState<PlatformAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdForClaim, setSelectedAdForClaim] = useState<PlatformAd | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      try {
        const data = await getPlatformAds('users', false);
        setAds(data);

        // Record impressions for visible ads
        data.forEach(ad => {
          trackAdImpression(ad.id);
        });
      } catch (err) {
        console.error('Failed to load user ads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      const matchesCategory =
        activeCategory === 'all' ? true : ad.category === activeCategory;
      const matchesSearch =
        ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.sponsor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [ads, activeCategory, searchQuery]);

  // Featured Hero Ad (first active ad or highest impressions)
  const featuredAd = filteredAds[0] || null;
  const remainingAds = filteredAds.slice(1);

  const handleClaimClick = (ad: PlatformAd) => {
    trackAdClick(ad.id);
    setSelectedAdForClaim(ad);
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('VIP Voucher Code copied to clipboard');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const generateVoucherCode = (sponsor: string, id: string) => {
    const cleanSponsor = sponsor.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
    const suffix = id.slice(-4).toUpperCase();
    return `TGD-${cleanSponsor}-${suffix}`;
  };

  return (
    <UserLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 bg-red-600/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                Curated Partner Deals
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              VIP Perks & Privileges
            </h1>
            <p className="text-sm text-zinc-400 font-medium mt-1.5 max-w-xl leading-relaxed">
              Exclusive sponsor hospitality, private table reservations, and luxury retreats reserved exclusively for The Gents DollHouse members.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search partner perks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D0E12] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'bg-[#0D0E12] text-zinc-400 hover:text-white border border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-16 text-center text-zinc-500 font-bold text-sm">
            Loading partner privileges...
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="p-16 text-center bg-[#0D0E12] border border-zinc-800/80 rounded-3xl">
            <Megaphone className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
            <p className="font-bold text-white text-base">No active partner offers in this category</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Check back soon as new verified sponsor privileges and dining discounts are added regularly.
            </p>
          </div>
        ) : (
          <>
            {/* Featured Hero Card */}
            {featuredAd && (
              <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-[#0D0E12] shadow-2xl group">
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
                  {/* Image Column */}
                  <div className="lg:col-span-7 relative h-64 lg:h-auto overflow-hidden bg-zinc-900">
                    <img
                      src={featuredAd.image_url}
                      alt={featuredAd.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E12] via-transparent to-black/40 lg:hidden" />
                    <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0D0E12]" />

                    {/* Top Tag */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-red-500" />
                        {featuredAd.sponsor_name}
                      </span>
                    </div>

                    {/* Perk Tag */}
                    {featuredAd.perk_value && (
                      <div className="absolute bottom-4 left-4">
                        <span className="text-xs font-black text-white bg-red-600 px-3 py-1.5 rounded-xl shadow-lg border border-red-500/30">
                          {featuredAd.perk_value}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                          Featured Partner Deal
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Limited Time
                        </span>
                      </div>

                      <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight">
                        {featuredAd.title}
                      </h2>

                      <p className="text-xs lg:text-sm text-zinc-400 font-medium leading-relaxed">
                        {featuredAd.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">Privilege Status</span>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified Patron Offer
                        </span>
                      </div>

                      <button
                        onClick={() => handleClaimClick(featuredAd)}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
                      >
                        <span>{featuredAd.cta_text || 'Claim Perk'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remaining Deals Grid */}
            {remainingAds.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white tracking-tight">
                  More Exclusive Privileges
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {remainingAds.map(ad => (
                    <div
                      key={ad.id}
                      className="bg-[#0D0E12] border border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all duration-300 group shadow-lg"
                    >
                      {/* Banner Image */}
                      <div>
                        <div className="h-48 w-full relative bg-zinc-900 overflow-hidden">
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E12] via-transparent to-black/50" />

                          {/* Top Tag */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/10">
                              {ad.sponsor_name}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-300 bg-zinc-900/80 px-2 py-0.5 rounded border border-white/10">
                              {ad.badge || 'VIP'}
                            </span>
                          </div>

                          {/* Perk Badge */}
                          {ad.perk_value && (
                            <div className="absolute bottom-3 left-3">
                              <span className="text-xs font-black text-white bg-red-600/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-red-500/30 shadow-md">
                                {ad.perk_value}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Text */}
                        <div className="p-5 space-y-2.5">
                          <h4 className="text-base font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                            {ad.title}
                          </h4>
                          <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-2">
                            {ad.description}
                          </p>
                        </div>
                      </div>

                      {/* Footer CTA */}
                      <div className="p-5 pt-0">
                        <button
                          onClick={() => handleClaimClick(ad)}
                          className="w-full flex items-center justify-center gap-2 bg-[#14151B] hover:bg-red-600 border border-zinc-800 hover:border-red-500 text-zinc-300 hover:text-white font-bold py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer active:scale-95"
                        >
                          <span>{ad.cta_text || 'Claim Offer'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal: Claim Privilege Voucher */}
        {selectedAdForClaim && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0D0E12] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                <span className="text-xs font-black uppercase tracking-wider text-red-500">
                  Exclusive Privilege Voucher
                </span>
                <button
                  onClick={() => setSelectedAdForClaim(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {selectedAdForClaim.sponsor_name}
                  </span>
                  <h3 className="text-xl font-black text-white">
                    {selectedAdForClaim.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {selectedAdForClaim.description}
                  </p>
                </div>

                {/* Voucher Code Box */}
                <div className="bg-[#14151B] border border-zinc-800 rounded-2xl p-4 text-center space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Your Digital Access Code
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-lg font-mono font-black tracking-widest text-red-400">
                      {generateVoucherCode(selectedAdForClaim.sponsor_name, selectedAdForClaim.id)}
                    </span>
                    <button
                      onClick={() =>
                        handleCopyVoucher(
                          generateVoucherCode(selectedAdForClaim.sponsor_name, selectedAdForClaim.id)
                        )
                      }
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all cursor-pointer"
                      title="Copy Voucher Code"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Quote this code or show your screen to claim your perk.
                  </p>
                </div>

                {/* Instructions */}
                <div className="space-y-2 text-xs text-zinc-400 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800/60">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    How to redeem:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400">
                    <li>Copy your digital voucher code above.</li>
                    <li>Click below to visit the official partner concierge.</li>
                    <li>Enter code during checkout or show code upon arrival.</li>
                  </ol>
                </div>

                {/* CTA Link */}
                <a
                  href={selectedAdForClaim.cta_url && selectedAdForClaim.cta_url !== '#' ? selectedAdForClaim.cta_url : 'https://google.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30"
                >
                  <span>Visit Partner Concierge</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserAds;
