import React, { useState, useEffect, useId } from "react";
import {
  X,
  Send,
  Lock,
  Users,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  UploadCloud,
  Tag,
} from "lucide-react";
import {
  getCreatorBroadcastAudience,
  sendMassPPVMessage,
  type MassPPVMessageResult,
} from "../lib/db";
import { resolveUserAvatar } from "../lib/avatar";
import { validateChatMessage } from "../lib/chatFilter";

interface MassPPVModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName?: string;
  onSuccess?: (result: MassPPVMessageResult) => void;
}

export const MassPPVModal: React.FC<MassPPVModalProps> = ({
  isOpen,
  onClose,
  creatorId,
  creatorName = "Creator",
  onSuccess,
}) => {
  const modalId = useId();
  const [audienceTab, setAudienceTab] = useState<
    "all" | "active_subscribers" | "recent_tippers"
  >("active_subscribers");
  const [audienceData, setAudienceData] = useState<{
    all: any[];
    activeSubscribers: any[];
    topTippers: any[];
    recentChats: any[];
  }>({
    all: [],
    activeSubscribers: [],
    topTippers: [],
    recentChats: [],
  });
  const [loadingAudience, setLoadingAudience] = useState(true);

  // Form states
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState(
    "https://i.pinimg.com/736x/21/4c/1b/214c1b53137efff7f8e4e995d7fe8b11.jpg?auto=format&fit=crop&w=1200&q=80",
  );
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [ppvPrice, setPpvPrice] = useState("500");
  const [hasFreeTeaser, setHasFreeTeaser] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  // Sending & Progress states
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [completedResult, setCompletedResult] =
    useState<MassPPVMessageResult | null>(null);

  // Load creator's actual fan audience
  useEffect(() => {
    if (!isOpen || !creatorId) return;

    let isMounted = true;
    async function loadAudience() {
      setLoadingAudience(true);
      try {
        const data = await getCreatorBroadcastAudience(creatorId);
        if (isMounted) {
          setAudienceData(data);
        }
      } catch (err) {
        console.error("Failed loading broadcast audience:", err);
      } finally {
        if (isMounted) setLoadingAudience(false);
      }
    }

    loadAudience();
    return () => {
      isMounted = false;
    };
  }, [isOpen, creatorId]);

  if (!isOpen) return null;

  const currentAudience =
    audienceTab === "all"
      ? audienceData.all
      : audienceTab === "recent_tippers"
        ? audienceData.topTippers
        : audienceData.activeSubscribers;

  const recipientCount = currentAudience.length;
  const numericPrice = Math.max(100, Number(ppvPrice) || 500);
  const creatorSplitPerUnlock = Math.round(numericPrice * 0.7);

  // Projected earnings
  const potential25 = Math.round(recipientCount * 0.25) * numericPrice;
  const potential50 = Math.round(recipientCount * 0.5) * numericPrice;
  const potential100 = recipientCount * numericPrice;

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    const validation = validateChatMessage(raw);
    if (validation.hadDigits || !validation.isValid) {
      setWarning(
        validation.reason ||
          "Numbers and contact details are automatically restricted.",
      );
      setTimeout(() => setWarning(null), 3500);
    }
    setCaption(validation.sanitized.slice(0, 1000));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      setMediaType("image");
    }

    // Create local object preview
    const objectUrl = URL.createObjectURL(file);
    setMediaUrl(objectUrl);
  };

  const handleDispatchBlast = async () => {
    if (!creatorId || isSending) return;
    if (!mediaUrl) {
      setWarning("Please attach a photo or video for this Pay-Per-View drop.");
      return;
    }

    setIsSending(true);
    setSendProgress(15);

    // Simulate animated sending progression for OnlyFans-style smooth feedback
    const p1 = setTimeout(() => setSendProgress(45), 300);
    const p2 = setTimeout(() => setSendProgress(80), 700);

    try {
      const result = await sendMassPPVMessage({
        creator_id: creatorId,
        content:
          caption.trim() ||
          "Exclusive Pay-Per-View drop for my VIP subscribers 💋",
        media_url: mediaUrl,
        media_type: mediaType,
        ppv_price: numericPrice,
        target_audience: audienceTab,
      });

      clearTimeout(p1);
      clearTimeout(p2);
      setSendProgress(100);
      setCompletedResult(result);
      if (onSuccess) onSuccess(result);
    } catch (err: any) {
      setWarning(err?.message || "Failed to dispatch mass PPV drop.");
      setIsSending(false);
      setSendProgress(0);
    }
  };

  const handleResetAndClose = () => {
    setIsSending(false);
    setSendProgress(0);
    setCompletedResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#0E0F15] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white"
        role="dialog"
        aria-labelledby={`${modalId}-title`}
      >
        {/* OnlyFans Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetAndClose}
              disabled={isSending && !completedResult}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2
                id={`${modalId}-title`}
                className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2"
              >
                New Mass Message
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white">
                  PPV Blast
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                {creatorName} • {recipientCount}{" "}
                {recipientCount === 1 ? "subscriber" : "subscribers"} will
                receive this locked media in their private chat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-300">
              <Users className="w-3.5 h-3.5 text-red-400" />
              <span>{recipientCount} Fans</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-sleek">
          {completedResult ? (
            /* Success Screen */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  Mass PPV Dispatched!
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Your locked media has been delivered to{" "}
                  <strong>{completedResult.sentCount} subscribers</strong>. Fans
                  unlock instantly via M-Pesa.
                </p>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 max-w-md mx-auto grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Recipients
                  </span>
                  <span className="text-sm font-black text-white">
                    {completedResult.sentCount} Fans
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Unlock Price
                  </span>
                  <span className="text-sm font-black text-red-400">
                    KES {numericPrice.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Creator Share
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    KES {creatorSplitPerUnlock.toLocaleString()} / unlock
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Max Potential
                  </span>
                  <span className="text-sm font-black text-amber-400">
                    KES {completedResult.potentialRevenue.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleResetAndClose}
                className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-600/30"
              >
                Back to Inbox
              </button>
            </div>
          ) : isSending ? (
            /* Sending Screen with Progress Bar */
            <div className="py-12 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 animate-pulse">
                <Send className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Broadcasting PPV Drop...
                </h3>
                <p className="text-xs text-zinc-400">
                  Notifying {recipientCount} subscribers and dispatching
                  encrypted media payloads.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto w-full space-y-2">
                <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300 rounded-full"
                    style={{ width: `${sendProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-zinc-500">
                  <span>Dispatching to inboxes</span>
                  <span>{sendProgress}%</span>
                </div>
              </div>
            </div>
          ) : (
            /* Composer Form */
            <>
              {/* 1. OnlyFans Audience Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Select Audience
                  </label>
                  <span className="text-[11px] font-bold text-zinc-400">
                    {recipientCount}{" "}
                    {recipientCount === 1 ? "Recipient" : "Recipients"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceTab("active_subscribers")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      audienceTab === "active_subscribers"
                        ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20"
                        : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:bg-zinc-800"
                    }`}
                  >
                    <span>⭐ All Active</span>
                    <span className="text-[10px] opacity-80">
                      ({audienceData.activeSubscribers.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceTab("recent_tippers")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      audienceTab === "recent_tippers"
                        ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20"
                        : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:bg-zinc-800"
                    }`}
                  >
                    <span>💎 Top Tippers</span>
                    <span className="text-[10px] opacity-80">
                      ({audienceData.topTippers.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceTab("all")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      audienceTab === "all"
                        ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20"
                        : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:bg-zinc-800"
                    }`}
                  >
                    <span>💬 All Fans</span>
                    <span className="text-[10px] opacity-80">
                      ({audienceData.all.length})
                    </span>
                  </button>
                </div>

                {/* Overlapping Avatar Stack Preview */}
                {loadingAudience ? (
                  <div className="py-2 text-center text-zinc-500 text-xs flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                    <span>Loading subscriber list...</span>
                  </div>
                ) : recipientCount > 0 ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex -space-x-2 overflow-hidden">
                      {currentAudience.slice(0, 5).map((fan, idx) => (
                        <img
                          key={fan.id || idx}
                          src={resolveUserAvatar(fan.avatar, fan.name)}
                          alt={fan.name}
                          className="inline-block h-7 w-7 rounded-full ring-2 ring-[#0E0F15] object-cover"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {currentAudience
                        .slice(0, 2)
                        .map((f) => f.name)
                        .join(", ")}
                      {recipientCount > 2
                        ? ` and ${recipientCount - 2} other subscribers`
                        : ""}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* 2. Text Caption Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Message Caption
                  </label>
                  <span className="text-[10px] font-bold text-zinc-500">
                    {caption.length} / 1000
                  </span>
                </div>

                <textarea
                  value={caption}
                  onChange={handleCaptionChange}
                  placeholder="e.g. Midnight poolside photoshoot 💋 Unlock to see all uncensored 4K photos and private video clip!"
                  rows={3}
                  className="w-full p-3.5 bg-zinc-950/80 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
                />

                {warning && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                )}
              </div>

              {/* 3. Media Attachment & Lock Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Attached Media (Locked)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMediaType("image")}
                      className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                        mediaType === "image"
                          ? "bg-white/15 text-white"
                          : "text-zinc-500"
                      }`}
                    >
                      Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType("video")}
                      className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                        mediaType === "video"
                          ? "bg-white/15 text-white"
                          : "text-zinc-500"
                      }`}
                    >
                      Video
                    </button>
                  </div>
                </div>

                {/* Media Preview Card */}
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 h-52 group">
                  <img
                    src={mediaUrl}
                    alt="PPV Preview"
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      hasFreeTeaser
                        ? "blur-[8px] opacity-60 scale-105"
                        : "blur-xl opacity-40 scale-110"
                    }`}
                  />

                  {/* Lock Watermark Overlay */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-black/70 border border-red-500/40 flex items-center justify-center text-red-500 mb-2 shadow-lg shadow-red-600/20">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-black text-white tracking-tight">
                      KES {numericPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 mt-0.5">
                      Pay-Per-View Lock
                    </span>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1">
                      {mediaType === "video" ? (
                        <Video className="w-3 h-3 text-red-400" />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-red-400" />
                      )}
                      <span>{mediaType}</span>
                    </span>
                  </div>

                  {/* Upload Change Trigger */}
                  <label className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold border border-white/10 cursor-pointer transition-all flex items-center gap-1.5 backdrop-blur-md shadow-md">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Change File</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Quick Presets for Demo / Testing */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
                    Presets:
                  </span>
                  {[
                    {
                      label: "Poolside Shoot",
                      url: "https://i.pinimg.com/736x/21/4c/1b/214c1b53137efff7f8e4e995d7fe8b11.jpg?auto=format&fit=crop&w=1200&q=80",
                      type: "image" as const,
                    },
                    {
                      label: "VIP Lounge",
                      url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
                      type: "image" as const,
                    },
                    {
                      label: "Exclusive Video Reel",
                      url: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=80",
                      type: "video" as const,
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMediaUrl(preset.url);
                        setMediaType(preset.type);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-medium text-zinc-300 border border-white/5 transition-colors shrink-0 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Pay-Per-View Lock Price Selector */}
              <div className="space-y-3 p-4 rounded-2xl bg-zinc-950/70 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        Pay-Per-View Price
                      </h4>
                      <p className="text-[10px] text-zinc-400">
                        Amount subscribers must pay via M-Pesa to unlock
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 font-black text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl">
                    <span>KES</span>
                    <input
                      type="number"
                      min={100}
                      step={50}
                      value={ppvPrice}
                      onChange={(e) => setPpvPrice(e.target.value)}
                      className="w-16 bg-transparent text-right font-black text-white outline-none"
                    />
                  </div>
                </div>

                {/* Quick Price Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {["250", "500", "1000", "1500", "2500"].map((price) => (
                    <button
                      key={price}
                      type="button"
                      onClick={() => setPpvPrice(price)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        ppvPrice === price
                          ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-white/5"
                      }`}
                    >
                      KES {price}
                    </button>
                  ))}
                </div>

                {/* Projected Earnings Breakdown */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">
                      Creator Earnings per unlock (70%):
                    </span>
                    <span className="font-bold text-emerald-400">
                      KES {creatorSplitPerUnlock.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block">
                        25% Unlock
                      </span>
                      <span className="text-xs font-black text-white">
                        KES {potential25.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block">
                        50% Unlock
                      </span>
                      <span className="text-xs font-black text-amber-300">
                        KES {potential50.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block">
                        100% Unlock
                      </span>
                      <span className="text-xs font-black text-emerald-400">
                        KES {potential100.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Teaser Settings Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/40 border border-white/5">
                <div className="flex items-center gap-2">
                  {hasFreeTeaser ? (
                    <Eye className="w-4 h-4 text-red-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-zinc-500" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">
                      Blurred Teaser Preview
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Shows a blurred teaser silhouette before paying to
                      increase unlock conversion.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hasFreeTeaser}
                  onChange={(e) => setHasFreeTeaser(e.target.checked)}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!completedResult && (
          <div className="px-5 py-4 border-t border-white/10 bg-zinc-950/90 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetAndClose}
              disabled={isSending}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDispatchBlast}
              disabled={isSending || recipientCount === 0 || !mediaUrl}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Broadcasting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Send PPV Blast ({recipientCount} Fans • KES{" "}
                    {numericPrice.toLocaleString()})
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MassPPVModal;
