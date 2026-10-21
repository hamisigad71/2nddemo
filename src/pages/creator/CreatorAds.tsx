import React, { useState, useEffect, useMemo } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import {
  Handshake,
  Search,
  CheckCircle2,
  Send,
  X,
  Check,
  ArrowRight
} from 'lucide-react';
import {
  getPlatformAds,
  trackAdImpression,
  trackAdClick,
  applyForCreatorBrandDeal,
  getCreatorBrandDealApplications
} from '../../lib/db';
import type { PlatformAd, AdApplication } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';

const CREATOR_CATEGORIES = [
  { id: 'all', label: 'All Opportunities' },
  { id: 'brand_deal', label: 'Paid Brand Deals' },
  { id: 'creator_perk', label: 'Studio & Production' },
  { id: 'sponsorship', label: 'VIP Shoots & Events' },
];

const CreatorAds: React.FC = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<PlatformAd[]>([]);
  const [applications, setApplications] = useState<AdApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Application Modal state
  const [selectedAdForApplication, setSelectedAdForApplication] = useState<PlatformAd | null>(null);
  const [pitchText, setPitchText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const creatorId = user?.id || 'creator-default';
  const creatorName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Creator';
  const creatorHandle = `@${creatorName.toLowerCase().replace(/\s+/g, '')}`;

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedAds, fetchedApps] = await Promise.all([
        getPlatformAds('creators', false),
        getCreatorBrandDealApplications(creatorId),
      ]);
      setAds(fetchedAds);
      setApplications(fetchedApps);

      // Track impressions
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
    return () => {
      window.removeEventListener('tgd_ads_updated', handleUpdate);
      window.removeEventListener('tgd_applications_updated', handleUpdate);
    };
  }, [creatorId]);

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

  // Check if current creator applied for an ad
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

  return (
    <CreatorLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 bg-red-600/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                Brand Collaborations
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Brand Deals & Creator Perks
            </h1>
            <p className="text-sm text-zinc-400 font-medium mt-1.5 max-w-xl leading-relaxed">
              Paid sponsorship campaigns, luxury shoot invitations, and complimentary studio access verified by platform management.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search sponsorships..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500/80 transition-colors"
            />
          </div>
        </div>

        {/* Highlight Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Available Campaigns</span>
            <span className="text-xl font-black text-foreground mt-1 block">{ads.length} Brand Deals</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Max Opportunity</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">KES 75,000+</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Studio Grants</span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block">100% Free Access</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Your Applications</span>
            <span className="text-xl font-black text-foreground mt-1 block">{applications.length} Submitted</span>
          </div>
        </div>

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

                      <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-2">
                        {ad.description}
                      </p>

                      {/* Deliverables Pills */}
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

        {/* Modal: Creator Application */}
        {selectedAdForApplication && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
              {/* Header */}
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

              {/* Form */}
              <form onSubmit={handleApplicationSubmit} className="p-6 space-y-4">
                {/* Campaign Summary Card */}
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

                {/* Creator Details Preview */}
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

                {/* Pitch / Message */}
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

                {/* Guidelines acknowledgement */}
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  By submitting this application, you agree to fulfill the agreed deliverables if selected. Platform administrators review and notify creators within 24-48 hours.
                </p>

                {/* Submit Buttons */}
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
