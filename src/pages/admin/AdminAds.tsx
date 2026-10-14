import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from './AdminLayout';
import {
  Megaphone,
  Plus,
  Search,
  Eye,
  MousePointerClick,
  TrendingUp,
  Trash2,
  ExternalLink,
  Power,
  X,
  CheckCircle2,
  Users,
  UserCheck,
  Globe,
  Copy,
  Check
} from 'lucide-react';
import {
  getPlatformAds,
  createPlatformAd,
  updatePlatformAd,
  deletePlatformAd
} from '../../lib/db';
import type { PlatformAd } from '../../lib/db';
import { toast } from '../../context/ToastContext';

const PRESET_BANNERS = [
  {
    name: 'Penthouse Lounge',
    url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    category: 'nightlife',
  },
  {
    name: 'Luxury Beachfront Villa',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    category: 'luxury',
  },
  {
    name: 'Champagne & Fine Spirits',
    url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
    category: 'lifestyle',
  },
  {
    name: 'High-Fashion Studio',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    category: 'brand_deal',
  },
  {
    name: 'Cinema Production Loft',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    category: 'creator_perk',
  },
  {
    name: 'Catamaran & Yacht Shoot',
    url: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80',
    category: 'sponsorship',
  },
];

const AdminAds: React.FC = () => {
  const [ads, setAds] = useState<PlatformAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'users' | 'creators'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewAd, setPreviewAd] = useState<PlatformAd | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: PRESET_BANNERS[0].url,
    target_audience: 'all' as 'all' | 'users' | 'creators',
    category: 'luxury' as PlatformAd['category'],
    sponsor_name: '',
    badge: 'Exclusive Offer',
    perk_value: '',
    cta_text: 'Claim Perk',
    cta_url: 'https://',
    requirementsText: '',
    status: 'active' as 'active' | 'paused',
    durationDays: 30,
  });

  const loadAds = async () => {
    setLoading(true);
    try {
      const data = await getPlatformAds('all', true);
      setAds(data);
    } catch (err) {
      console.error('Failed to load ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();

    const handleUpdate = () => loadAds();
    window.addEventListener('tgd_ads_updated', handleUpdate);
    return () => window.removeEventListener('tgd_ads_updated', handleUpdate);
  }, []);

  // Filtered ads
  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      const matchesSearch =
        ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.sponsor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAudience =
        audienceFilter === 'all' ? true : ad.target_audience === audienceFilter || ad.target_audience === 'all';

      const matchesStatus =
        statusFilter === 'all' ? true : ad.status === statusFilter;

      return matchesSearch && matchesAudience && matchesStatus;
    });
  }, [ads, searchQuery, audienceFilter, statusFilter]);

  // Overall analytics
  const stats = useMemo(() => {
    const totalActive = ads.filter(a => a.status === 'active').length;
    const totalImpressions = ads.reduce((acc, a) => acc + (a.impressions || 0), 0);
    const totalClicks = ads.reduce((acc, a) => acc + (a.clicks || 0), 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
    return { totalActive, totalImpressions, totalClicks, avgCTR };
  }, [ads]);

  // Toggle active / paused
  const handleToggleStatus = async (ad: PlatformAd) => {
    const nextStatus = ad.status === 'active' ? 'paused' : 'active';
    try {
      await updatePlatformAd(ad.id, { status: nextStatus });
      toast.success(`Ad campaign ${nextStatus === 'active' ? 'resumed' : 'paused'}`);
      loadAds();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Delete Ad
  const handleDeleteAd = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deletePlatformAd(id);
      toast.success('Ad deleted successfully');
      loadAds();
    } catch {
      toast.error('Failed to delete ad');
    }
  };

  // Copy link
  const handleCopyLink = (ad: PlatformAd) => {
    navigator.clipboard.writeText(ad.cta_url || window.location.origin);
    setCopiedId(ad.id);
    toast.success('Ad link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle form submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.sponsor_name.trim()) {
      toast.error('Please fill in the title and sponsor name');
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (formData.durationDays || 30));

      const reqArray = formData.requirementsText
        ? formData.requirementsText.split('\n').map(s => s.trim()).filter(Boolean)
        : [];

      await createPlatformAd({
        title: formData.title.trim(),
        description: formData.description.trim(),
        image_url: formData.image_url.trim(),
        target_audience: formData.target_audience,
        category: formData.category,
        sponsor_name: formData.sponsor_name.trim(),
        badge: formData.badge.trim() || 'Featured Deal',
        perk_value: formData.perk_value.trim() || undefined,
        cta_text: formData.cta_text.trim() || 'Claim Offer',
        cta_url: formData.cta_url.trim() || '#',
        requirements: reqArray.length > 0 ? reqArray : undefined,
        status: formData.status,
        expires_at: expiresAt.toISOString(),
      });

      toast.success('New Ad Campaign published successfully!');
      setIsCreateModalOpen(false);
      // Reset form
      setFormData({
        title: '',
        description: '',
        image_url: PRESET_BANNERS[0].url,
        target_audience: 'all',
        category: 'luxury',
        sponsor_name: '',
        badge: 'Exclusive Offer',
        perk_value: '',
        cta_text: 'Claim Perk',
        cta_url: 'https://',
        requirementsText: '',
        status: 'active',
        durationDays: 30,
      });
      loadAds();
    } catch (err) {
      console.error(err);
      toast.error('Error creating ad campaign');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20">
                <Megaphone className="w-5 h-5" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Ads & Brand Sponsorships
              </h1>
            </div>
            <p className="text-xs md:text-sm text-zinc-400 font-medium mt-1">
              Create and manage sponsor advertisements, VIP partner deals, and creator brand collaborations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Ad</span>
            </button>
          </div>
        </div>

        {/* Analytics Top Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0D0E12] border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Campaigns</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mt-2">
              {stats.totalActive}
            </div>
            <p className="text-[11px] font-medium text-zinc-500 mt-1">
              Out of {ads.length} total ads
            </p>
          </div>

          <div className="bg-[#0D0E12] border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Impressions</span>
              <Eye className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mt-2">
              {stats.totalImpressions.toLocaleString()}
            </div>
            <p className="text-[11px] font-medium text-zinc-500 mt-1">
              Views on user & creator pages
            </p>
          </div>

          <div className="bg-[#0D0E12] border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Clicks</span>
              <MousePointerClick className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mt-2">
              {stats.totalClicks.toLocaleString()}
            </div>
            <p className="text-[11px] font-medium text-zinc-500 mt-1">
              Direct engagements & claims
            </p>
          </div>

          <div className="bg-[#0D0E12] border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Average CTR</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mt-2">
              {stats.avgCTR}%
            </div>
            <p className="text-[11px] font-medium text-zinc-500 mt-1">
              Click-through performance
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0D0E12] border border-zinc-800/80 p-4 rounded-2xl">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search campaigns, sponsors, or perks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#14151B] border border-zinc-700/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
            />
          </div>

          {/* Segmented Audience Filter */}
          <div className="flex items-center gap-1.5 bg-[#14151B] border border-zinc-800 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setAudienceFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                audienceFilter === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Audiences
            </button>
            <button
              onClick={() => setAudienceFilter('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                audienceFilter === 'users'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Users (Fans)</span>
            </button>
            <button
              onClick={() => setAudienceFilter('creators')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                audienceFilter === 'creators'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Creators</span>
            </button>
          </div>

          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-[#14151B] border border-zinc-800 text-xs font-bold text-zinc-300 rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
          </select>
        </div>

        {/* Ads Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-zinc-500 font-bold text-sm">
            Loading campaigns...
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="p-16 text-center bg-[#0D0E12] border border-zinc-800/80 rounded-2xl">
            <Megaphone className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
            <p className="font-bold text-white text-base">No advertising campaigns found</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Click &quot;Post New Ad&quot; to publish your first sponsor campaign to users or creators.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAds.map(ad => {
              const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';

              return (
                <div
                  key={ad.id}
                  className={`bg-[#0D0E12] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 group ${
                    ad.status === 'active'
                      ? 'border-zinc-800/90 hover:border-zinc-700'
                      : 'border-zinc-800/40 opacity-75'
                  }`}
                >
                  {/* Banner Header */}
                  <div>
                    <div className="h-44 w-full relative bg-zinc-900 overflow-hidden">
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E12] via-transparent to-black/60" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/10">
                          {ad.sponsor_name}
                        </span>

                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                            ad.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ad.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                            }`}
                          />
                          {ad.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      {/* Bottom Banner Tag */}
                      {ad.perk_value && (
                        <div className="absolute bottom-3 left-3">
                          <span className="text-xs font-black text-white bg-red-600/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-red-500/30 shadow-md">
                            {ad.perk_value}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        {ad.target_audience === 'users' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            <Users className="w-3 h-3" /> Fan Deals Page
                          </span>
                        ) : ad.target_audience === 'creators' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            <UserCheck className="w-3 h-3" /> Creator Deals Page
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Globe className="w-3 h-3" /> All Pages
                          </span>
                        )}

                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          {ad.category}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                        {ad.title}
                      </h3>

                      <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-2">
                        {ad.description}
                      </p>
                    </div>
                  </div>

                  {/* Performance Metrics & Actions */}
                  <div className="p-5 pt-0 border-t border-zinc-800/80 mt-2 space-y-3">
                    <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                      <div className="bg-[#14151B] p-2 rounded-xl border border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 block">Views</span>
                        <span className="text-xs font-black text-white">{ad.impressions || 0}</span>
                      </div>
                      <div className="bg-[#14151B] p-2 rounded-xl border border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 block">Clicks</span>
                        <span className="text-xs font-black text-white">{ad.clicks || 0}</span>
                      </div>
                      <div className="bg-[#14151B] p-2 rounded-xl border border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 block">CTR</span>
                        <span className="text-xs font-black text-emerald-400">{ctr}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(ad)}
                          title={ad.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            ad.status === 'active'
                              ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setPreviewAd(ad)}
                          title="Preview Ad"
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleCopyLink(ad)}
                          title="Copy Link"
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          {copiedId === ad.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteAd(ad.id, ad.title)}
                        title="Delete Ad"
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create New Ad */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#0D0E12] border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20">
                    <Plus className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">Create & Publish Ad</h2>
                    <p className="text-xs text-zinc-400">Post a new campaign visible on user or creator deal portals.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {/* Title & Sponsor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Campaign Headline *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 20% Privilege Dining at Onyx Lounge"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Sponsor / Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. The Onyx Club Nairobi"
                      value={formData.sponsor_name}
                      onChange={e => setFormData({ ...formData, sponsor_name: e.target.value })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Target Audience & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Target Audience *
                    </label>
                    <select
                      value={formData.target_audience}
                      onChange={e => setFormData({ ...formData, target_audience: e.target.value as any })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="all">All (Both Users & Creators)</option>
                      <option value="users">Users / Fans Deals Page Only</option>
                      <option value="creators">Creators Sponsorships & Deals Page Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Ad Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="luxury">Luxury & Travel</option>
                      <option value="nightlife">VIP Nightlife & Clubs</option>
                      <option value="lifestyle">Fine Dining & Spirits</option>
                      <option value="brand_deal">Paid Brand Deal (Creators)</option>
                      <option value="creator_perk">Studio & Production Perk</option>
                      <option value="sponsorship">High-Tier Event Sponsorship</option>
                    </select>
                  </div>
                </div>

                {/* Promotional Copy / Description */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    Ad Copy / Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the offer or partnership benefits in clear, engaging language..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#14151B] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                </div>

                {/* Banner Presets or Custom URL */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    Banner Image Preset
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                    {PRESET_BANNERS.map(preset => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => setFormData({ ...formData, image_url: preset.url })}
                        className={`relative rounded-xl overflow-hidden h-14 border transition-all cursor-pointer ${
                          formData.image_url === preset.url
                            ? 'border-red-500 ring-2 ring-red-500/30'
                            : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-black/40 flex items-end p-1 text-[8px] font-bold text-white truncate">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <input
                    type="url"
                    placeholder="Or enter custom image URL (https://...)"
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                {/* Perk Value & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Perk / Compensation Badge
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KES 35,000 Payout OR 20% Discount"
                      value={formData.perk_value}
                      onChange={e => setFormData({ ...formData, perk_value: e.target.value })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Top Header Badge
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VIP Exclusive or Paid Sponsorship"
                      value={formData.badge}
                      onChange={e => setFormData({ ...formData, badge: e.target.value })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Call to Action Button & URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Claim Perk / Apply for Deal"
                      value={formData.cta_text}
                      onChange={e => setFormData({ ...formData, cta_text: e.target.value })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Destination Link / Action URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://... or #apply"
                      value={formData.cta_url}
                      onChange={e => setFormData({ ...formData, cta_url: e.target.value })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Deliverables for Creator Deals */}
                {formData.target_audience !== 'users' && (
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Creator Deliverables / Requirements (One per line)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g.&#10;1 High-res Feed Post&#10;2 Story Highlights&#10;Tag @Sponsor"
                      value={formData.requirementsText}
                      onChange={e => setFormData({ ...formData, requirementsText: e.target.value })}
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>
                )}

                {/* Duration */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    Campaign Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={formData.durationDays}
                    onChange={e => setFormData({ ...formData, durationDays: Number(e.target.value) || 30 })}
                    className="w-32 bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Campaign</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Ad Preview */}
        {previewAd && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0D0E12] border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Live Ad Preview</span>
                <button
                  onClick={() => setPreviewAd(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#14151B] shadow-xl">
                  <div className="h-48 relative">
                    <img src={previewAd.image_url} alt={previewAd.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14151B] via-transparent to-black/50" />
                    <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-[10px] font-black text-white px-2.5 py-1 rounded-md border border-white/10">
                      {previewAd.sponsor_name}
                    </span>
                    {previewAd.perk_value && (
                      <span className="absolute bottom-3 left-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                        {previewAd.perk_value}
                      </span>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-black text-white">{previewAd.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{previewAd.description}</p>
                    <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5">
                      <span>{previewAd.cta_text}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAds;
