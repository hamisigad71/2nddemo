import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import {
  Megaphone,
  Plus,
  Search,
  Eye,
  MousePointerClick,
  Trash2,
  Power,
  X,
  CheckCircle2,
  Users,
  Copy,
  Check,
  Rocket,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
  Crown,
} from "lucide-react";
import {
  getPlatformAds,
  createPlatformAd,
  updatePlatformAd,
  deletePlatformAd,
  getCreatorAdOrders,
  updateCreatorAdOrderStatus,
  getAdminCreators,
} from "../../lib/db";
import type { PlatformAd, CreatorAdOrder } from "../../lib/db";
import { toast } from "../../context/ToastContext";

const PRESET_BANNERS = [
  {
    name: "Official Platform Pass",
    url: "https://i.pinimg.com/736x/0a/34/ae/0a34ae553f30d611f2401bb0174ed46b.jpg",
    category: "company",
  },
  {
    name: "Swimwear & Glamour",
    url: "https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg",
    category: "creator_spotlight",
  },
  {
    name: "Fitness & Lifestyle",
    url: "https://i.pinimg.com/736x/63/d3/79/63d3791235f63c60e78d9a868b6bea67.jpg",
    category: "creator_spotlight",
  },
  {
    name: "Luxury Beach Retreat",
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    category: "luxury",
  },
  {
    name: "Champagne & VIP Dining",
    url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
    category: "nightlife",
  },
  {
    name: "High Fashion Studio",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    category: "creator_spotlight",
  },
];

const AdminAds: React.FC = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<PlatformAd[]>([]);
  const [creatorOrders, setCreatorOrders] = useState<CreatorAdOrder[]>([]);
  const [creatorsList, setCreatorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab
  const [currentTab, setCurrentTab] = useState<"campaigns" | "orders">(
    "campaigns",
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "creator" | "company">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">(
    "all",
  );

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewAd, setPreviewAd] = useState<PlatformAd | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Form state for creating Ad
  const [formData, setFormData] = useState({
    ad_type: "creator" as "creator" | "company",
    selectedCreatorId: "",
    title: "",
    description: "",
    image_url: PRESET_BANNERS[1].url,
    target_audience: "all" as "all" | "users" | "creators",
    category: "creator_spotlight" as PlatformAd["category"],
    sponsor_name: "",
    badge: "Sponsored Creator",
    perk_value: "",
    cta_text: "View Profile & Subscribe",
    cta_url: "/creator/",
    price_paid: 1500,
    status: "active" as "active" | "paused",
    durationDays: 7,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedAds, fetchedOrders, fetchedCreators] = await Promise.all([
        getPlatformAds("all", true),
        getCreatorAdOrders(),
        getAdminCreators(),
      ]);
      setAds(fetchedAds);
      setCreatorOrders(fetchedOrders);
      setCreatorsList(fetchedCreators || []);
    } catch (err) {
      console.error("Failed to load admin ads data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("tgd_ads_updated", handleUpdate);
    window.addEventListener("tgd_ad_orders_updated", handleUpdate);
    return () => {
      window.removeEventListener("tgd_ads_updated", handleUpdate);
      window.removeEventListener("tgd_ad_orders_updated", handleUpdate);
    };
  }, []);

  // Filtered ads
  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ad.title.toLowerCase().includes(q) ||
        ad.sponsor_name.toLowerCase().includes(q) ||
        ad.description.toLowerCase().includes(q) ||
        (ad.creator_name && ad.creator_name.toLowerCase().includes(q));

      const matchesType =
        typeFilter === "all"
          ? true
          : (ad.ad_type ||
              (ad.category === "creator_spotlight" ? "creator" : "company")) ===
            typeFilter;

      const matchesStatus =
        statusFilter === "all" ? true : ad.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [ads, searchQuery, typeFilter, statusFilter]);

  // Overall analytics
  const stats = useMemo(() => {
    const totalActive = ads.filter((a) => a.status === "active").length;
    const totalImpressions = ads.reduce(
      (acc, a) => acc + (a.impressions || 0),
      0,
    );
    const totalClicks = ads.reduce((acc, a) => acc + (a.clicks || 0), 0);
    const avgCTR =
      totalImpressions > 0
        ? ((totalClicks / totalImpressions) * 100).toFixed(1)
        : "0.0";
    const totalAdRevenue =
      ads.reduce((acc, a) => acc + (a.price_paid || 0), 0) +
      creatorOrders
        .filter((o) => o.payment_status === "paid")
        .reduce((acc, o) => acc + (o.amount || 0), 0);

    return {
      totalActive,
      totalImpressions,
      totalClicks,
      avgCTR,
      totalAdRevenue,
    };
  }, [ads, creatorOrders]);

  // Auto-populate form when selecting a Creator
  const handleSelectCreator = (creatorId: string) => {
    const creator = creatorsList.find((c) => c.id === creatorId);
    if (!creator) return;

    const bannerUrl = creator.coverUrl || creator.img || PRESET_BANNERS[1].url;
    setFormData((prev) => ({
      ...prev,
      selectedCreatorId: creator.id,
      sponsor_name: `${creator.name} Official`,
      title: `Featured Creator: ${creator.name} ✨`,
      description: creator.category
        ? `Catch exclusive ${creator.category.toLowerCase()} shoots, VIP live streams, and backstage content. Subscribe now to unlock full feed access!`
        : `Explore private photos, VIP broadcasts, and interactive shows. Join ${creator.name}'s inner circle today!`,
      image_url: bannerUrl,
      badge: "Sponsored Creator",
      perk_value: creator.revenue ? "Instant Access" : "VIP Access",
      cta_text: "View Profile & Subscribe",
      cta_url: `/creator/${creator.id}`,
      target_audience: "all",
      category: "creator_spotlight",
    }));
  };

  // Switch between Creator Ad and Company Ad mode
  const handleTypeToggle = (type: "creator" | "company") => {
    if (type === "creator") {
      const defaultCreator = creatorsList[0];
      setFormData((prev) => ({
        ...prev,
        ad_type: "creator",
        category: "creator_spotlight",
        badge: "Sponsored Creator",
        cta_text: "View Profile & Subscribe",
        target_audience: "all",
        title: defaultCreator
          ? `Featured Creator: ${defaultCreator.name} ✨`
          : "Featured Creator Spotlight",
        sponsor_name: defaultCreator
          ? `${defaultCreator.name} Official`
          : "Creator Promotion",
        cta_url: defaultCreator ? `/creator/${defaultCreator.id}` : "/discover",
        image_url:
          defaultCreator?.coverUrl ||
          defaultCreator?.img ||
          PRESET_BANNERS[1].url,
        selectedCreatorId: defaultCreator?.id || "",
        price_paid: 1500,
        durationDays: 7,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        ad_type: "company",
        category: "company",
        badge: "Official Platform Promo",
        title: "The Gents DollHouse Official VIP Experience",
        sponsor_name: "The Gents DollHouse Official",
        description:
          "Unlock unrestricted access to verified Kenyan creators, live video broadcasts, and exclusive platform privileges.",
        image_url: PRESET_BANNERS[0].url,
        cta_text: "Explore All Creators",
        cta_url: "/discover",
        target_audience: "all",
        selectedCreatorId: "",
        price_paid: 0,
        durationDays: 30,
      }));
    }
  };

  // Open modal pre-filled from a Creator Ad Order
  const handleOpenFromOrder = (order: CreatorAdOrder) => {
    setActiveOrderId(order.id);
    setFormData({
      ad_type: "creator",
      selectedCreatorId: order.creator_id,
      title: order.title || `Featured Creator: ${order.creator_name}`,
      description:
        order.description ||
        `Special sponsored feature for ${order.creator_name}. Check out her private feed & subscribe today!`,
      image_url: order.image_url || PRESET_BANNERS[1].url,
      target_audience: "all",
      category: "creator_spotlight",
      sponsor_name: `${order.creator_name} Spotlight`,
      badge: "Sponsored Creator",
      perk_value: order.package_name,
      cta_text: "View Profile & Subscribe",
      cta_url: `/creator/${order.creator_id}`,
      price_paid: order.amount || 1500,
      status: "active",
      durationDays: order.duration_days || 7,
    });
    setIsCreateModalOpen(true);
  };

  // Toggle active / paused
  const handleToggleStatus = async (ad: PlatformAd) => {
    const nextStatus = ad.status === "active" ? "paused" : "active";
    try {
      await updatePlatformAd(ad.id, { status: nextStatus });
      toast.success(
        `Ad campaign ${nextStatus === "active" ? "resumed" : "paused"}`,
      );
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Delete Ad
  const handleDeleteAd = async (id: string, title: string) => {
    if (
      !window.confirm(`Are you sure you want to permanently delete "${title}"?`)
    )
      return;
    try {
      await deletePlatformAd(id);
      toast.success("Ad campaign deleted successfully");
      loadData();
    } catch {
      toast.error("Failed to delete ad");
    }
  };

  // Copy link
  const handleCopyLink = (ad: PlatformAd) => {
    const fullUrl = ad.cta_url.startsWith("http")
      ? ad.cta_url
      : `${window.location.origin}${ad.cta_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(ad.id);
    toast.success("Ad direct link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle form submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.sponsor_name.trim()) {
      toast.error("Please fill in the title and sponsor name");
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (formData.durationDays || 7));

      const matchedCreator = creatorsList.find(
        (c) => c.id === formData.selectedCreatorId,
      );

      const created = await createPlatformAd({
        ad_type: formData.ad_type,
        creator_id:
          formData.ad_type === "creator"
            ? formData.selectedCreatorId || undefined
            : undefined,
        creator_name:
          formData.ad_type === "creator"
            ? matchedCreator?.name || formData.sponsor_name
            : undefined,
        creator_avatar:
          formData.ad_type === "creator"
            ? matchedCreator?.img || null
            : undefined,
        creator_handle:
          formData.ad_type === "creator"
            ? `@${(matchedCreator?.name || "creator").toLowerCase().replace(/[^a-z0-9]/g, "")}`
            : undefined,
        price_paid: formData.ad_type === "creator" ? formData.price_paid : 0,
        duration_days: formData.durationDays,
        title: formData.title.trim(),
        description: formData.description.trim(),
        image_url: formData.image_url.trim(),
        target_audience: formData.target_audience,
        category: formData.category,
        sponsor_name: formData.sponsor_name.trim(),
        badge:
          formData.badge.trim() ||
          (formData.ad_type === "creator"
            ? "Sponsored Creator"
            : "Platform Promo"),
        perk_value: formData.perk_value.trim() || undefined,
        cta_text: formData.cta_text.trim() || "View Profile & Subscribe",
        cta_url: formData.cta_url.trim() || "/discover",
        status: formData.status,
        expires_at: expiresAt.toISOString(),
      });

      if (activeOrderId) {
        await updateCreatorAdOrderStatus(
          activeOrderId,
          "published",
          created.id,
        );
        setActiveOrderId(null);
      }

      toast.success(
        formData.ad_type === "creator"
          ? `🎉 Sponsored Ad for ${matchedCreator?.name || "Creator"} published for all subscribers!`
          : "Official Company Announcement published successfully!",
      );

      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error creating ad campaign");
    }
  };

  const pendingOrdersCount = creatorOrders.filter(
    (o) => o.status === "pending",
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6 pt-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-red-600/10 text-red-500 rounded-2xl border border-red-500/20 shadow-inner">
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  Ads &amp; Campaigns
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Live Engine
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
                  Post company announcements or promote paying creators to all
                  subscribers across the platform.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setActiveOrderId(null);
                handleTypeToggle("creator");
                setIsCreateModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black px-4 sm:px-5 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer min-h-11"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Ad</span>
            </button>
          </div>
        </div>

        {/* Analytics Top Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0D0E12] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Active Ads
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.totalActive}
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 mt-1 truncate">
              {ads.length} total campaigns on file
            </p>
          </div>

          <div className="bg-[#0D0E12] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Ad Impressions
              </span>
              <Eye className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.totalImpressions.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 mt-1 truncate">
              Feed &amp; Discover impressions
            </p>
          </div>

          <div className="bg-[#0D0E12] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Ad Clicks
              </span>
              <MousePointerClick className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.totalClicks.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 mt-1 truncate">
              Avg CTR: {stats.avgCTR}%
            </p>
          </div>

          <div className="bg-[#0D0E12] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Promo Revenue
              </span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 truncate">
              KES {stats.totalAdRevenue.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 mt-1 truncate">
              Paid by creators &amp; partners
            </p>
          </div>
        </div>

        {/* Main Tab Navigation: Active Campaigns vs Creator Ad Orders */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setCurrentTab("campaigns")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap min-h-11 ${
              currentTab === "campaigns"
                ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
            }`}
          >
            <Layers className="w-4 h-4 text-red-500" />
            <span>Active &amp; Scheduled Ads ({ads.length})</span>
          </button>

          <button
            onClick={() => setCurrentTab("orders")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap min-h-11 relative ${
              currentTab === "orders"
                ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
            }`}
          >
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>Creator Promotion Orders</span>
            {pendingOrdersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black animate-pulse">
                {pendingOrdersCount} New
              </span>
            )}
          </button>
        </div>

        {currentTab === "campaigns" && (
          <>
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0D0E12] border border-zinc-800/80 p-3 sm:p-4 rounded-2xl">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search ads, creators, or announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#14151B] border border-zinc-700/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {/* Segmented Type Filter */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#14151B] border border-zinc-800 p-1 rounded-xl">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    typeFilter === "all"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All Ads
                </button>
                <button
                  onClick={() => setTypeFilter("creator")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    typeFilter === "creator"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Promoted Creators</span>
                </button>
                <button
                  onClick={() => setTypeFilter("company")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    typeFilter === "company"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  <span>Company Ads</span>
                </button>
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#14151B] border border-zinc-800 text-xs font-bold text-zinc-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-zinc-700"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Visible)</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            {/* Ads Cards Grid */}
            {loading ? (
              <div className="p-16 text-center text-zinc-500 font-bold text-sm">
                Loading campaigns...
              </div>
            ) : filteredAds.length === 0 ? (
              <div className="p-16 text-center bg-[#0D0E12] border border-zinc-800/80 rounded-3xl">
                <Megaphone className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
                <p className="font-bold text-white text-base">
                  No advertising campaigns found
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Click &quot;Post New Ad&quot; to publish an ad for a creator
                  or company announcement.
                </p>
                <button
                  onClick={() => {
                    handleTypeToggle("creator");
                    setIsCreateModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Post First Creator Ad
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAds.map((ad) => {
                  const ctr =
                    ad.impressions > 0
                      ? ((ad.clicks / ad.impressions) * 100).toFixed(1)
                      : "0.0";
                  const isCreatorAd =
                    ad.ad_type === "creator" ||
                    ad.category === "creator_spotlight";

                  return (
                    <div
                      key={ad.id}
                      className={`bg-[#0D0E12] border rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-200 group ${
                        ad.status === "active"
                          ? "border-zinc-800/90 hover:border-zinc-700 shadow-xl"
                          : "border-zinc-800/40 opacity-70"
                      }`}
                    >
                      {/* Media Header */}
                      <div className="relative h-44 sm:h-48 overflow-hidden bg-zinc-950">
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E12] via-transparent to-black/60" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 ${
                              isCreatorAd
                                ? "bg-amber-500 text-black border border-amber-300"
                                : "bg-rose-600 text-white border border-rose-400"
                            }`}
                          >
                            {isCreatorAd ? (
                              <Crown className="w-3 h-3 fill-black" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            {ad.badge ||
                              (isCreatorAd
                                ? "Sponsored Creator"
                                : "Company Promo")}
                          </span>

                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              ad.status === "active"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                            }`}
                          >
                            {ad.status}
                          </span>
                        </div>

                        {/* Creator / Sponsor Identity Pill */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                          <div className="flex items-center gap-2 min-w-0 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                            {ad.creator_avatar ? (
                              <img
                                src={ad.creator_avatar}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover border border-white/20 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-red-600/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {ad.sponsor_name[0]}
                              </div>
                            )}
                            <span className="text-xs font-black truncate">
                              {ad.sponsor_name}
                            </span>
                          </div>

                          {ad.price_paid ? (
                            <span className="bg-emerald-600/90 text-white text-[10px] font-black px-2 py-1 rounded-lg backdrop-blur-md border border-emerald-400/30">
                              Paid: KES {ad.price_paid.toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-white group-hover:text-red-400 transition-colors line-clamp-2">
                            {ad.title}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {ad.description}
                          </p>
                        </div>

                        {/* Target & Performance Metrics */}
                        <div className="pt-3 border-t border-zinc-800/80">
                          <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#14151B] rounded-xl text-center">
                            <div>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase">
                                Views
                              </div>
                              <div className="text-xs font-black text-white mt-0.5">
                                {ad.impressions.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase">
                                Clicks
                              </div>
                              <div className="text-xs font-black text-white mt-0.5">
                                {ad.clicks.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase">
                                CTR
                              </div>
                              <div className="text-xs font-black text-emerald-400 mt-0.5">
                                {ctr}%
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 px-1">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-zinc-500" />
                              Audience:{" "}
                              <strong className="text-zinc-200 capitalize">
                                {ad.target_audience}
                              </strong>
                            </span>
                            {ad.expires_at && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <Clock className="w-3 h-3" />
                                {new Date(ad.expires_at).toLocaleDateString(
                                  [],
                                  { month: "short", day: "numeric" },
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(ad)}
                              title={
                                ad.status === "active"
                                  ? "Pause Campaign"
                                  : "Resume Campaign"
                              }
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                ad.status === "active"
                                  ? "bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setPreviewAd(ad)}
                              title="Preview Ad in Feed"
                              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleCopyLink(ad)}
                              title="Copy Profile / Action Link"
                              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                            >
                              {copiedId === ad.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <button
                            onClick={() => handleDeleteAd(ad.id, ad.title)}
                            title="Delete Campaign"
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
          </>
        )}

        {currentTab === "orders" && (
          <div className="space-y-4">
            <div className="bg-[#0D0E12] border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-400" />
                    Creator Paid Promotion Queue
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Creators who paid to have the admin feature them to all
                    subscribers. Click &quot;Review &amp; Publish&quot; to push
                    their ad live immediately.
                  </p>
                </div>
              </div>

              {creatorOrders.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-medium">
                  No creator promotion orders in the queue.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/80">
                  {creatorOrders.map((order) => (
                    <div
                      key={order.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {order.creator_avatar ? (
                          <img
                            src={order.creator_avatar}
                            alt=""
                            className="w-12 h-12 rounded-2xl object-cover border border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 font-black flex items-center justify-center shrink-0">
                            {order.creator_name[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-white">
                              {order.creator_name}
                            </span>
                            <span className="text-xs text-zinc-500 font-bold">
                              {order.creator_handle ||
                                `@${order.creator_name.toLowerCase().replace(/\s+/g, "")}`}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                              {order.payment_status === "paid"
                                ? "Paid via M-Pesa"
                                : "Pending Payment"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 font-semibold mt-1">
                            {order.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                            {order.description}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1.5 font-medium">
                            <span className="text-emerald-400 font-bold">
                              KES {order.amount.toLocaleString()}
                            </span>
                            <span>&bull;</span>
                            <span>
                              {order.package_name} ({order.duration_days} Days)
                            </span>
                            <span>&bull;</span>
                            <span>Phone: {order.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        {order.status === "published" ? (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold border border-zinc-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{" "}
                            Published Live
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenFromOrder(order)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer"
                          >
                            <Rocket className="w-4 h-4" />
                            <span>Review &amp; Publish Ad</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Create & Publish Ad (Fully Responsive) */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#0D0E12] border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800 bg-zinc-950/60 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-red-600/10 text-red-500 rounded-2xl border border-red-500/20">
                    <Plus className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">
                      Create &amp; Publish Ad
                    </h2>
                    <p className="text-[11px] sm:text-xs text-zinc-400">
                      Target all subscribers across Home Feed and Discover.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form
                onSubmit={handleCreateSubmit}
                className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1"
              >
                {/* Campaign Mode Switcher */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider">
                    Select Ad Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#14151B] border border-zinc-800 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => handleTypeToggle("creator")}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        formData.ad_type === "creator"
                          ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md font-black"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      <span>Promote a Creator</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTypeToggle("company")}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        formData.ad_type === "company"
                          ? "bg-red-600 text-white shadow-md font-black"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Company Announcement</span>
                    </button>
                  </div>
                </div>

                {/* Creator Selector when in Creator Promotion Mode */}
                {formData.ad_type === "creator" && (
                  <div className="bg-[#14151B]/80 border border-amber-500/20 rounded-2xl p-3.5 space-y-2">
                    <label className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      Select Creator to Promote *
                    </label>
                    <select
                      value={formData.selectedCreatorId}
                      onChange={(e) => handleSelectCreator(e.target.value)}
                      className="w-full bg-[#0D0E12] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="">
                        -- Choose a creator from platform --
                      </option>
                      {creatorsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email || "Creator"})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-500">
                      Selecting automatically fills creator avatar, profile
                      link, and cover photo.
                    </p>
                  </div>
                )}

                {/* Title & Sponsor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Campaign Headline *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Featured Creator: Wairimu K. ✨"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      {formData.ad_type === "creator"
                        ? "Creator / Sponsor Label *"
                        : "Company Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wairimu K. Official"
                      value={formData.sponsor_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sponsor_name: e.target.value,
                        })
                      }
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Description / Bio */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    Ad Description / Creator Pitch *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Short description enticing subscribers to view and subscribe..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full bg-[#14151B] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                {/* Banner Image */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    Feature Photo / Banner URL *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                    {PRESET_BANNERS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() =>
                          setFormData({ ...formData, image_url: preset.url })
                        }
                        className={`relative rounded-xl overflow-hidden h-14 border transition-all cursor-pointer ${
                          formData.image_url === preset.url
                            ? "border-red-500 ring-2 ring-red-500/30"
                            : "border-zinc-800 hover:border-zinc-600"
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  <input
                    type="url"
                    placeholder="Or enter custom image URL (https://...)"
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                    className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                {/* Badge & Price Paid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Top Header Badge
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sponsored Creator or VIP Spotlight"
                      value={formData.badge}
                      onChange={(e) =>
                        setFormData({ ...formData, badge: e.target.value })
                      }
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Fee Paid to Admin (KES)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={formData.price_paid}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_paid: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 font-bold"
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
                      placeholder="e.g. View Profile & Subscribe"
                      value={formData.cta_text}
                      onChange={(e) =>
                        setFormData({ ...formData, cta_text: e.target.value })
                      }
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Destination Link / Action URL
                    </label>
                    <input
                      type="text"
                      placeholder="/creator/... or https://..."
                      value={formData.cta_url}
                      onChange={(e) =>
                        setFormData({ ...formData, cta_url: e.target.value })
                      }
                      className="w-full bg-[#14151B] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Target Audience & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Target Audience
                    </label>
                    <select
                      value={formData.target_audience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_audience: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#14151B] border border-zinc-800 text-xs font-bold text-zinc-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-zinc-700"
                    >
                      <option value="users">
                        Subscribers / Fans (Home Feed)
                      </option>
                      <option value="all">
                        Universal (All Platform Users)
                      </option>
                      <option value="creators">Creators Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      Duration (Days)
                    </label>
                    <select
                      value={formData.durationDays}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          durationDays: Number(e.target.value) || 7,
                        })
                      }
                      className="w-full bg-[#14151B] border border-zinc-800 text-xs font-bold text-zinc-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-zinc-700"
                    >
                      <option value={3}>3 Days (Quick Boost)</option>
                      <option value={7}>7 Days (1 Week VIP Spotlight)</option>
                      <option value={14}>14 Days (2 Weeks Campaign)</option>
                      <option value={30}>30 Days (Full Month Feature)</option>
                      <option value={60}>60 Days (Extended Deal)</option>
                    </select>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer min-h-11"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer min-h-11"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Ad Campaign</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Feed Preview */}
        {previewAd && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <div className="bg-[#0D0E12] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-red-500" /> Subscriber Feed
                  Preview
                </span>
                <button
                  onClick={() => setPreviewAd(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#14151B] shadow-2xl">
                  {/* Top Feed Header */}
                  <div className="p-3.5 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {previewAd.creator_avatar ? (
                        <img
                          src={previewAd.creator_avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-amber-500/40 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-red-600/20 text-red-400 font-bold flex items-center justify-center shrink-0">
                          {previewAd.sponsor_name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate flex items-center gap-1">
                          <span>{previewAd.sponsor_name}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0" />
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium truncate">
                          {previewAd.creator_handle || "Sponsored Promotion"}
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {previewAd.badge || "Sponsored"}
                    </span>
                  </div>

                  {/* Banner Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-black">
                    <img
                      src={previewAd.image_url}
                      alt={previewAd.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    <h4 className="text-sm font-black text-white">
                      {previewAd.title}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {previewAd.description}
                    </p>
                    <button
                      onClick={() => {
                        setPreviewAd(null);
                        navigate(previewAd.cta_url);
                      }}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{previewAd.cta_text}</span>
                      <ArrowRight className="w-4 h-4" />
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
