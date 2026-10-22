import { useState, useEffect } from "react";
import {
  MapPin,
  Share,
  Lock,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Heart,
  DollarSign,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Video,
  Eye,
  X,
  Flame,
  PlayCircle,
  Sparkles,
  LayoutDashboard,
  Plus,
  Edit3,
  Crown,
  FolderHeart,
  Radio,
  Trash2,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  getCreatorProfile,
  getPostsByCreator,
  checkUserSubscription,
  deletePost,
  getUserProfile,
  getCreatorSubscriberCount,
} from "../../lib/db";
import { getDefaultAvatar } from "../../lib/avatar";
import { useAuth } from "../../context/AuthContext";
import TipModal from "../../components/TipModal";
import SubscribeModal from "../../components/SubscribeModal";
import PPVUnlockModal, {
  type PPVMediaItem,
} from "../../components/PPVUnlockModal";
import { toast } from "../../context/ToastContext";

export default function CreatorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creator, setCreator] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [previewAsFan, setPreviewAsFan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "about">(
    "posts",
  );
  const [mediaFilter, setMediaFilter] = useState<"all" | "photo" | "video">(
    "all",
  );
  const [subscriberCount, setSubscriberCount] = useState<number>(0);

  // Subscription status
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<
    string | null
  >(null);
  const [isBundlesOpen, setIsBundlesOpen] = useState(false);

  // Modals
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [subscribePrice, setSubscribePrice] = useState(1000);
  const [subscribeDuration, setSubscribeDuration] = useState(30);
  const [subscribeTierName, setSubscribeTierName] = useState("VIP Monthly");
  const [redirectToChatAfterSub, setRedirectToChatAfterSub] = useState(false);

  // PPV Unlock
  const [selectedPPVItem, setSelectedPPVItem] = useState<PPVMediaItem | null>(
    null,
  );
  const [unlockedMediaIds, setUnlockedMediaIds] = useState<Set<string>>(() => {
    const combined = new Set<string>();
    try {
      const globalStored = localStorage.getItem("tgd_ppv_unlocked_global");
      if (globalStored) {
        (JSON.parse(globalStored) as string[]).forEach((id) => combined.add(id));
      }
      if (user?.id) {
        const userStored = localStorage.getItem(`tgd_ppv_unlocked_${user.id}`);
        if (userStored) {
          (JSON.parse(userStored) as string[]).forEach((id) => combined.add(id));
        }
      }
    } catch {}
    return combined;
  });

  // Lightbox for unlocked media
  const [activeLightbox, setActiveLightbox] = useState<{
    url: string;
    type: "image" | "video";
    title: string;
  } | null>(null);

  // Fetch creator profile and subscription status
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!id) return;
      setLoading(true);

      try {
        const profile = await getCreatorProfile(id);
        if (!isMounted) return;

        if (!profile) {
          setCreator(null);
          setLoading(false);
          return;
        }

        setCreator(profile);
        setSubscribePrice(profile.price_hr || 1000);

        // Fetch real active subscriber count
        try {
          const count = await getCreatorSubscriberCount(id);
          if (isMounted) {
            setSubscriberCount(count);
          }
        } catch {
          if (isMounted) {
            setSubscriberCount((profile as any).total_subscribers || 0);
          }
        }

        // Fetch creator posts
        const creatorPosts = await getPostsByCreator(id, user?.id);
        if (isMounted) {
          setPosts((creatorPosts || []).filter((post: any) => post.status !== "draft"));
        }

        // Check current user profile & role
        if (user?.id) {
          try {
            const up = await getUserProfile(user.id);
            if (isMounted && up) {
              setCurrentUserProfile(up);
            }
          } catch (e) {
            console.warn("Could not load user profile:", e);
          }

          const sub = await checkUserSubscription(user.id, id);
          if (isMounted && sub) {
            setIsSubscribed(true);
            setSubscriptionTier(sub.tier_name || "VIP Tier");
            if (sub.expires_at) {
              setSubscriptionExpiresAt(sub.expires_at);
            }
          }
        }
      } catch (err) {
        console.error("Error loading creator profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, user?.id]);

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Delete this post? It will be permanently removed from all feeds.")) return;
    setDeletingPostId(postId);
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted successfully");
    } catch (err: any) {
      console.error("Delete post error:", err);
      toast.error(err?.message || "Failed to delete post");
    } finally {
      setDeletingPostId(null);
    }
  };

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const deletedId = e?.detail?.postId;
      if (deletedId) {
        setPosts((prev) => prev.filter((p) => p.id !== deletedId));
      }
    };
    window.addEventListener("posts_updated", handleUpdate);
    window.addEventListener("post_deleted", handleUpdate);
    return () => {
      window.removeEventListener("posts_updated", handleUpdate);
      window.removeEventListener("post_deleted", handleUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-foreground flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
        <p className="text-zinc-400 text-sm font-medium">
          Loading creator profile...
        </p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5 text-red-500">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Creator Profile Not Found
        </h2>
        <p className="text-zinc-400 text-sm max-w-sm mb-6">
          This creator profile doesn't exist or is currently unavailable.
        </p>
        <button
          onClick={() => navigate("/discover")}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30"
        >
          Explore Creators
        </button>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${creator.name} on The Gents Dollhouse`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Profile link copied to clipboard!");
    }
  };

  const creatorPrice = creator.price_hr || 1000;

  const handleMessageClick = () => {
    if (!creator) return;

    if (isSubscribed) {
      navigate(`/user/messages?creator=${id}`);
      return;
    }

    if (!user) {
      toast.error(`Please sign in to subscribe and chat with ${creator.name}`);
      navigate(`/login?redirect=/creator/${id}`);
      return;
    }

    // Must subscribe before accessing chat (minimum KES 500)
    const requiredPrice = Math.max(500, creatorPrice || 500);
    setSubscribePrice(requiredPrice);
    setSubscribeDuration(30);
    setSubscribeTierName("VIP Chat & Channel Access");
    setRedirectToChatAfterSub(true);
    setIsSubscribeOpen(true);
    toast.info(
      `Subscribe to ${creator.name}'s channel (KES ${requiredPrice.toLocaleString()}) to unlock direct 1-on-1 private messaging.`,
    );
  };

  // Check if this is a hardcoded demo/escort profile vs a real registered creator
  const isEscortDemo = Boolean(creator?.isEscort || String(creator?.id || '').startsWith('escort-'));

  // Check if current user is signed up/logged in as a subscriber (role 'user' or 'subscriber')
  const userRole = currentUserProfile?.role || user?.user_metadata?.role || (typeof window !== 'undefined' ? localStorage.getItem('pendingAuthRole') : null);
  const isSubscriberUser = userRole === 'user' || userRole === 'subscriber';

  // Check if current logged-in user is the owner of this creator profile (or pseudo creator account)
  // A subscriber must NEVER be treated as a creator owner!
  const isOwner = Boolean(
    !isSubscriberUser &&
    user?.id && (
      user.id === id ||
      user.id === creator?.id ||
      user.id === creator?.user_id ||
      user.id === creator?.uid ||
      (user.email && creator?.email && user.email.toLowerCase() === creator.email.toLowerCase())
    )
  );

  // When owner has previewAsFan turned on, view the page as a public subscriber
  const isOwnerActive = isOwner && !previewAsFan;

  const realPostMedia: PPVMediaItem[] = posts
    .filter((p) => p.media_url)
    .map((p) => {
      const visibility = p.visibility || (p.is_locked ? (p.price > 0 ? "ppv" : "subscribers") : "public");
      return {
        id: p.id,
        type: (p.media_type === "video" || p.media_url?.includes(".mp4")
          ? "video"
          : "image") as "video" | "image",
        url: p.media_url || creator.avatar,
        duration: p.media_type === "video" ? "0:30" : undefined,
        photoCount: p.media_type !== "video" ? 1 : undefined,
        title: visibility === "public" && p.content
          ? p.content.slice(0, 40) + "..."
          : "Exclusive content",
        price: p.price || 200,
        visibility,
        isLocked: !isOwnerActive && !p.media_access_granted && !isSubscribed && (
          visibility === "subscribers" ||
          (visibility === "ppv" && !unlockedMediaIds.has(p.id))
        ),
      };
    });

  const realGalleryMedia: PPVMediaItem[] = (creator.gallery && Array.isArray(creator.gallery) ? creator.gallery : [])
    .map((url: string, idx: number) => ({
      id: `${creator.id}-g-${idx}`,
      type: (url.includes('.mp4') ? 'video' : 'image') as 'video' | 'image',
      url,
      photoCount: 1,
      title: `${creator.name} Gallery Item #${idx + 1}`,
      price: 150,
      isLocked: !isOwnerActive && !isSubscribed && !unlockedMediaIds.has(`${creator.id}-g-${idx}`),
    }));

  const demoMedia: PPVMediaItem[] = isEscortDemo ? [
    {
      id: `${creator.id}-m-1`,
      type: "video",
      url: creator.gallery?.[0] || "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
      duration: "9:28",
      title: "Midnight Poolside Shoot & Q&A",
      price: 250,
      isLocked: !isSubscribed && !unlockedMediaIds.has(`${creator.id}-m-1`),
    },
    {
      id: `${creator.id}-m-2`,
      type: "image",
      url: creator.gallery?.[1] || "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
      photoCount: 1,
      title: "Golden Hour Silhouette Photoset",
      price: 150,
      isLocked: !isSubscribed && !unlockedMediaIds.has(`${creator.id}-m-2`),
    },
    {
      id: `${creator.id}-m-3`,
      type: "image",
      url: creator.gallery?.[2] || "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80",
      photoCount: 4,
      title: "VIP Velvet Lounge Exclusive (4 Photos)",
      price: 200,
      isLocked: !isSubscribed && !unlockedMediaIds.has(`${creator.id}-m-3`),
    },
    {
      id: `${creator.id}-m-4`,
      type: "video",
      url: creator.gallery?.[3] || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
      duration: "4:15",
      title: "Private Workout & Stretch Routine",
      price: 300,
      isLocked: !isSubscribed && !unlockedMediaIds.has(`${creator.id}-m-4`),
    },
    {
      id: `${creator.id}-m-5`,
      type: "video",
      url: creator.gallery?.[4] || "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80",
      duration: "12:40",
      title: "Exclusive Weekend Vlog & Behind The Scenes",
      price: 350,
      isLocked: !isSubscribed && !unlockedMediaIds.has(`${creator.id}-m-5`),
    },
    {
      id: `${creator.id}-m-6`,
      type: "image",
      url: creator.gallery?.[5] || "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
      photoCount: 6,
      title: "Lingerie Studio Series (Full Set)",
      price: 250,
      isLocked: !isSubscribed && !unlockedMediaIds.has(`${creator.id}-m-6`),
    },
  ] : [];

  const mediaItems: PPVMediaItem[] = [...realPostMedia, ...realGalleryMedia, ...demoMedia];

  const photosCount = mediaItems.filter((m) => m.type === "image").length;
  const videosCount = mediaItems.filter((m) => m.type === "video").length;

  const filteredMedia = mediaItems.filter((m) => {
    if (mediaFilter === "photo") return m.type === "image";
    if (mediaFilter === "video") return m.type === "video";
    return true;
  });

  const handleMediaClick = (item: PPVMediaItem) => {
    if (item.isLocked && !isOwnerActive) {
      if (item.visibility === "subscribers") {
        setSubscribePrice(creatorPrice);
        setSubscribeDuration(30);
        setSubscribeTierName("VIP Monthly");
        setIsSubscribeOpen(true);
      } else {
        setSelectedPPVItem(item);
      }
    } else {
      setActiveLightbox({ url: item.url, type: item.type, title: item.title });
    }
  };

  const handleMediaUnlocked = async (mediaId: string) => {
    setUnlockedMediaIds((prev) => {
      const next = new Set(prev);
      next.add(mediaId);
      try {
        const globalStored = localStorage.getItem("tgd_ppv_unlocked_global");
        const globalSet = new Set(globalStored ? JSON.parse(globalStored) : []);
        globalSet.add(mediaId);
        localStorage.setItem(
          "tgd_ppv_unlocked_global",
          JSON.stringify(Array.from(globalSet)),
        );

        if (user?.id) {
          localStorage.setItem(
            `tgd_ppv_unlocked_${user.id}`,
            JSON.stringify(Array.from(next)),
          );
        }
      } catch (err) {
        console.error("Error saving unlocked PPV items:", err);
      }
      return next;
    });

    const refreshedPosts = id
      ? await getPostsByCreator(id, user?.id)
      : [];
    setPosts(refreshedPosts.filter((post: any) => post.status !== "draft"));
    const targetItem = mediaItems.find((m) => m.id === mediaId);
    const refreshedPost = refreshedPosts.find((post: any) => post.id === mediaId);
    if (targetItem) {
      setActiveLightbox({
        url: refreshedPost?.media_url || targetItem.url,
        type: targetItem.type,
        title: targetItem.title,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Creator Owner Quick Toggle Bar (only visible to the actual creator) */}
      {isOwner && (
        <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-black text-white px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 border-b border-red-500/30 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-zinc-200 text-xs">
              {previewAsFan ? (
                <span className="text-emerald-400 font-bold">Subscriber Preview Mode (Viewing as a Fan)</span>
              ) : (
                <span className="text-red-400 font-bold">Creator Mode (Owner of @{creator.username || creator.name})</span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPreviewAsFan(!previewAsFan)}
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
              previewAsFan
                ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md"
                : "bg-red-600/30 hover:bg-red-600/50 text-white border-red-500/40"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewAsFan ? "Exit Fan Preview" : "👁️ View as Subscriber"}</span>
          </button>
        </div>
      )}

      {/* Cover Image & Top Navigation Bar */}
      <div className="h-52 md:h-72 lg:h-80 w-full relative bg-zinc-900 overflow-hidden">
        <img
          src={
            (creator.cover_image && !/\.(mp4|webm|mov|m4v)/i.test(creator.cover_image) && !creator.cover_image.startsWith("blob:") && !creator.cover_image.includes("photo-1549490349-8643362247b5"))
              ? creator.cover_image
              : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80"
          }
          alt="Cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80";
          }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-black/40 to-black/60" />

        <nav className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link
              to="/"
              className="text-lg md:text-xl font-black tracking-tight text-white drop-shadow"
            >
              The Gents Dollhouse<span className="text-red-500">.</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isOwnerActive && (
              <Link
                to="/dashboard"
                className="h-10 px-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 backdrop-blur-md transition-all cursor-pointer"
                title="Creator Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer"
              title="Share Profile"
            >
              <Share className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-16 md:-mt-20">
        {/* Creator Identity Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div className="flex items-end gap-4 md:gap-5 z-10">
            <div className="relative">
              <img
                src={creator.avatar}
                alt={creator.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getDefaultAvatar(creator.name);
                }}
                className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-[#0A0A0C] object-cover bg-zinc-900 shadow-2xl ring-2 ring-red-500/40"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0A0A0C] shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            </div>

            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                  {creator.name}
                  {creator.isVerified && (
                    <CheckCircle2 className="w-5 h-5 text-white fill-blue-500 shrink-0" />
                  )}
                </h1>
                {isSubscribed && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider px-3 py-1 rounded-full font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Subscribed ({subscriptionTier || "VIP Tier"})
                    {subscriptionExpiresAt && (
                      <span className="text-[10px] text-zinc-300 font-bold ml-1">
                        · Expires{" "}
                        {new Date(subscriptionExpiresAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <p className="text-zinc-400 font-medium text-sm md:text-base">
                @{creator.name.replace(/\s+/g, "").toLowerCase()}
                <span className="text-xs text-emerald-400 font-semibold ml-2 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active now
                </span>
              </p>
              <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2 flex-wrap">
                {creator.age && (
                  <>
                    <span>{creator.age} yrs</span>
                    <span>•</span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-500" />{" "}
                  {creator.location}
                </span>
                <span>•</span>
                <span className="text-zinc-300 font-semibold">
                  {subscriberCount.toLocaleString()} {subscriberCount === 1 ? "subscriber" : "subscribers"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Creator Owner Controls vs Fan Visitor Actions */}
          {isOwnerActive ? (
            <div className="flex items-center gap-2 w-full md:w-auto pb-1 z-10 flex-wrap">
              <Link
                to="/create-post"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(220,38,38,0.4)] text-xs uppercase tracking-wider active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Upload Content
              </Link>
              <Link
                to="/dashboard"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-red-500" /> Dashboard
              </Link>
              <Link
                to="/edit-profile"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-300 hover:text-white font-bold px-3 py-2.5 rounded-xl transition-colors text-xs uppercase tracking-wider cursor-pointer"
                title="Edit Profile"
              >
                <Edit3 className="w-4 h-4 text-zinc-400" /> Edit Profile
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 w-full md:w-auto pb-1 z-10 flex-wrap">
              <button
                onClick={() => setIsTipOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                <DollarSign className="w-4 h-4 text-amber-400" /> Send Tip
              </button>
              <button
                type="button"
                onClick={handleMessageClick}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 border font-bold px-4 py-2.5 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer active:scale-95 ${
                  isSubscribed
                    ? "bg-zinc-900 hover:bg-zinc-800 border-white/10 text-white"
                    : "bg-zinc-900 hover:bg-zinc-800 border-red-500/40 hover:border-red-500 text-white shadow-sm"
                }`}
              >
                {isSubscribed ? (
                  <>
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>Message</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-red-500" />
                    <span>Message </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Creator Owner Management Section (Boss Request: View Dashboard & Upload Content) ── */}
        {isOwnerActive ? (
          <div className="bg-gradient-to-b from-zinc-900/90 via-[#111115]/95 to-black border border-red-500/30 rounded-3xl p-5 md:p-6 mb-8 shadow-2xl relative overflow-hidden">
            {/* Ambient accent glow */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header bar */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Crown className="w-4 h-4" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Creator Control Hub
                </span>
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 uppercase tracking-wider">
                  Owner Mode
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsFan(true)}
                className="text-[11px] text-zinc-300 hover:text-white flex items-center gap-1.5 font-bold bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/15 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" /> View as Subscriber
              </button>
            </div>

            {/* Primary Action Grid: Upload Content & View Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* 1. Upload Content Button / Card */}
              <Link
                to="/create-post"
                className="group p-4 rounded-2xl bg-gradient-to-br from-red-600/25 via-red-950/30 to-zinc-900/80 border border-red-500/40 hover:border-red-500 transition-all flex items-center justify-between cursor-pointer hover:shadow-[0_4px_24px_rgba(220,38,38,0.3)] active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-600/50 group-hover:scale-105 transition-transform shrink-0">
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                      Upload Content
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Post photos, videos, or PPV clips
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-red-400 group-hover:translate-x-1 transition-transform px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30">
                  Upload →
                </span>
              </Link>

              {/* 2. View Dashboard Button / Card */}
              <Link
                to="/dashboard"
                className="group p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-white/10 hover:border-white/25 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform shrink-0">
                    <LayoutDashboard className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-zinc-200 transition-colors flex items-center gap-1.5">
                      View Dashboard
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Earnings, subscribers & analytics
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-zinc-300 group-hover:translate-x-1 transition-transform px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  Open →
                </span>
              </Link>
            </div>

            {/* Secondary Toolbar: Edit Profile, Vault, Go Live */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] flex-wrap">
                <span>Fan Price: <strong className="text-white font-bold">KES {creatorPrice.toLocaleString()}/mo</strong></span>
                <span>•</span>
                <span>{posts.length} {posts.length === 1 ? "Post" : "Posts"} published</span>
                <span>•</span>
                <span><strong className="text-white font-bold">{subscriberCount.toLocaleString()}</strong> {subscriberCount === 1 ? "Subscriber" : "Subscribers"}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to="/edit-profile"
                  className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white font-bold text-[11px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-red-500" /> Edit Profile & Pricing
                </Link>
                <Link
                  to="/vault"
                  className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white font-bold text-[11px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  <FolderHeart className="w-3.5 h-3.5 text-pink-400" /> Vault
                </Link>
                <Link
                  to="/creator/live"
                  className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white font-bold text-[11px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-red-500" /> Go Live <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">Soon</span>
                </Link>
              </div>
            </div>

            {/* Fan preview explanation */}
            <div className="mt-3 pt-2 text-center border-t border-white/5">
              <p className="text-[11px] text-zinc-500">
                Notice: Visitors and fans see your subscription offer (KES {creatorPrice.toLocaleString()} / 30 days) and tip options in this space.
              </p>
            </div>
          </div>
        ) : !isSubscribed ? (
          <div className="bg-black/95 border border-white/15 rounded-3xl p-5 md:p-6 mb-8 shadow-2xl">
            {/* Limited Offer Promo Header */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Subscription
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-black uppercase tracking-wider">
                <Flame className="w-3 h-3" /> Limited Offer
              </span>
            </div>

            {creator.promo_active !== false ? (
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-black text-white">
                  Special Offer — {creator.promo_discount || 50}% OFF for 30
                  days!
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Limited-time promotion · Instant M-Pesa push
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-black text-white">
                  VIP Monthly Subscription
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Full access to all exclusive posts, videos & private DMs
                </p>
              </div>
            )}

            {/* Primary Subscription Button */}
            <button
              onClick={() => {
                setSubscribePrice(creatorPrice);
                setSubscribeDuration(30);
                setSubscribeTierName("VIP Monthly");
                setIsSubscribeOpen(true);
              }}
              className="w-full py-4 px-6 bg-red-600 hover:bg-red-500 text-white font-black text-sm md:text-base rounded-2xl transition-all shadow-[0_4px_25px_rgba(220,38,38,0.45)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between cursor-pointer group"
            >
              <span className="tracking-wide uppercase">Subscribe</span>
              <span className="bg-black/30 px-3 py-1 rounded-xl text-white font-extrabold text-sm">
                KES {creatorPrice.toLocaleString()} for 30 days
              </span>
            </button>
            <p className="text-center text-[11px] text-zinc-500 mt-2">
              {creator.promo_active !== false
                ? `Regular price KES ${(creatorPrice * 1.5).toLocaleString()} /month · Instant M-Pesa push`
                : `Renews monthly · Instant M-Pesa push`}
            </p>

            {/* Subscription Bundles Accordion */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <button
                onClick={() => setIsBundlesOpen((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white transition-colors cursor-pointer py-1"
              >
                <span className="flex items-center gap-2">
                  <span>Subscription Bundles</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-bold">
                    Save up to 35%
                  </span>
                </span>
                {isBundlesOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {isBundlesOpen && (
                <div className="mt-3 space-y-2.5 animate-in fade-in">
                  {/* 3 Months Bundle */}
                  <button
                    onClick={() => {
                      setSubscribePrice(Math.round(creatorPrice * 3 * 0.85));
                      setSubscribeDuration(90);
                      setSubscribeTierName("VIP 3 Months (15% OFF)");
                      setIsSubscribeOpen(true);
                    }}
                    className="w-full py-3 px-4 bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-red-500/50 rounded-xl flex items-center justify-between transition-all cursor-pointer text-xs font-bold"
                  >
                    <span className="text-white">3 Months (15% OFF)</span>
                    <span className="text-red-400 font-extrabold">
                      KES {Math.round(creatorPrice * 3 * 0.85).toLocaleString()}{" "}
                      total
                    </span>
                  </button>

                  {/* 6 Months Bundle */}
                  <button
                    onClick={() => {
                      setSubscribePrice(Math.round(creatorPrice * 6 * 0.75));
                      setSubscribeDuration(180);
                      setSubscribeTierName("VIP 6 Months (25% OFF)");
                      setIsSubscribeOpen(true);
                    }}
                    className="w-full py-3 px-4 bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-red-500/50 rounded-xl flex items-center justify-between transition-all cursor-pointer text-xs font-bold"
                  >
                    <span className="text-white">6 Months (25% OFF)</span>
                    <span className="text-red-400 font-extrabold">
                      KES {Math.round(creatorPrice * 6 * 0.75).toLocaleString()}{" "}
                      total
                    </span>
                  </button>

                  {/* 12 Months Bundle */}
                  <button
                    onClick={() => {
                      setSubscribePrice(Math.round(creatorPrice * 12 * 0.65));
                      setSubscribeDuration(365);
                      setSubscribeTierName("VIP 12 Months (35% OFF)");
                      setIsSubscribeOpen(true);
                    }}
                    className="w-full py-3 px-4 bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-red-500/50 rounded-xl flex items-center justify-between transition-all cursor-pointer text-xs font-bold"
                  >
                    <span className="text-white">12 Months (35% OFF)</span>
                    <span className="text-red-400 font-extrabold">
                      KES{" "}
                      {Math.round(creatorPrice * 12 * 0.65).toLocaleString()}{" "}
                      total
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ── Main Tab Row Matching OnlyFans Screenshots (294 POSTS · 279 MEDIA) ── */}
        <div className="flex border-b border-white/15 mb-6">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 pb-3 text-center text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "posts"
                ? "border-red-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {posts.length} {posts.length === 1 ? "Post" : "Posts"}
          </button>

          <button
            onClick={() => setActiveTab("media")}
            className={`flex-1 pb-3 text-center text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "media"
                ? "border-red-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {mediaItems.length} Media
          </button>

          <button
            onClick={() => setActiveTab("about")}
            className={`flex-1 pb-3 text-center text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "about"
                ? "border-red-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            About
          </button>
        </div>

        {/* ── MEDIA TAB: 3-Column Grid Matching Screenshot 2 ── */}
        {activeTab === "media" && (
          <div className="space-y-5">
            {/* Sub-Filters (All 279, Photo 41, Video 238) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setMediaFilter("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mediaFilter === "all"
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
                }`}
              >
                All {mediaItems.length}
              </button>

              <button
                onClick={() => setMediaFilter("photo")}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mediaFilter === "photo"
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
                }`}
              >
                Photos {photosCount}
              </button>

              <button
                onClick={() => setMediaFilter("video")}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mediaFilter === "video"
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
                }`}
              >
                Videos {videosCount}
              </button>
            </div>

            {/* 3-Column Grid Matching Screenshot 2 */}
            {filteredMedia.length === 0 ? (
              <div className="bg-zinc-950/60 border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-500/10">
                  <PlayCircle className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">No Media Available</h3>
                <p className="text-zinc-400 text-sm max-w-sm mb-4 leading-relaxed">
                  {creator.name} hasn't uploaded any photo or video content yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {filteredMedia.map((item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleMediaClick(item)}
                      className="relative aspect-[4/5] sm:aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 group cursor-pointer shadow-lg hover:border-red-500/50 transition-all select-none"
                    >
                      {/* Delete button for Owner */}
                      {isOwnerActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(item.id);
                          }}
                          disabled={deletingPostId === item.id}
                          className="absolute top-2 left-2 z-30 p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-white transition-colors border border-white/20"
                          title="Delete media"
                        >
                          {deletingPostId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </button>
                      )}

                      {/* Thumbnail / Teaser Background */}
                      <img
                        src={item.url}
                        alt={item.title}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          item.isLocked
                            ? "filter blur-lg scale-110 opacity-40"
                            : "group-hover:scale-105"
                        }`}
                      />

                      {/* Locked State: Centered Padlock & Price Tag (Screenshot 2) */}
                      {item.isLocked ? (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center">
                          {/* Centered Large Padlock Icon */}
                          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-black/80 border border-white/20 group-hover:border-red-500/60 flex items-center justify-center text-red-500 shadow-xl transition-transform group-hover:scale-110">
                            <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>

                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-600/90 text-white font-black text-[10px] shadow">
                            {item.visibility === "subscribers" ? "SUBSCRIBERS" : `KES ${item.price}`}
                          </div>

                          {/* Bottom Metadata Badges */}
                          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white/90 text-[10px] sm:text-[11px] font-black bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                            {item.type === "video" ? (
                              <>
                                <Video className="w-3 h-3 text-red-400" />
                                <span>{item.duration || "Video"}</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3 h-3 text-zinc-300" />
                                <span>{item.photoCount || 1}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Unlocked State */
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 sm:p-2.5">
                          <div className="flex items-center justify-between text-white text-[10px] sm:text-[11px] font-bold">
                            <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-md">
                              {item.type === "video" ? (
                                <>
                                  <Play className="w-3 h-3 text-red-500 fill-red-500" />
                                  <span>{item.duration || "Watch"}</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 text-zinc-300" />
                                  <span>View</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                              {isSubscribed ? "VIP ALL UNLOCKED" : `PAID (KES ${item.price})`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── POSTS TAB ── */}
        {activeTab === "posts" && (
          <div className="flex flex-col gap-6">
            {/* Real Posts from DB */}
            {posts.length > 0 &&
              posts.map((post: any) => {
                const isPostLocked =
                  !isOwnerActive &&
                  ((post.visibility === "subscribers" && !isSubscribed && !post.media_access_granted) ||
                  (post.is_locked && !post.media_access_granted && !isSubscribed && !unlockedMediaIds.has(post.id)));
                return (
                  <div
                    key={post.id}
                    className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={creator.avatar}
                          alt="avatar"
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-red-500/30"
                        />
                        <div>
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            {creator.name}
                            {creator.isVerified && (
                              <CheckCircle2 className="w-4 h-4 text-white fill-blue-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {isOwnerActive && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deletingPostId === post.id}
                          className="px-3 py-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-transparent hover:border-red-500/20"
                          title="Delete post"
                        >
                          {deletingPostId === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-red-400">Delete</span>
                        </button>
                      )}
                    </div>

                    <div className="px-4 pb-3">
                      <p className="text-sm text-zinc-200 leading-relaxed">
                        {isPostLocked ? "Exclusive content — unlock to view this post." : post.content}
                      </p>
                    </div>

                    {post.media_url && (
                      <div className="relative w-full bg-zinc-950 flex justify-center items-center overflow-hidden max-h-[550px] border-y border-white/10">
                        {isPostLocked ? (
                          <div className="relative w-full aspect-video flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-md">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                              <Lock className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-black text-white mb-1">
                              {post.visibility === "subscribers" ? "Subscriber-Only Content" : "Pay-Per-View Content"}
                            </h4>
                            <p className="text-xs text-zinc-400 mb-4 max-w-xs">
                              {post.visibility === "subscribers"
                                ? `Subscribe for KES ${creatorPrice.toLocaleString()}/month to view this post.`
                                : `Unlock this post for KES ${post.price}.`}
                            </p>
                            <button
                              onClick={() => {
                                if (post.visibility === "subscribers") {
                                  setIsSubscribeOpen(true);
                                } else {
                                  setSelectedPPVItem({
                                    id: post.id,
                                    type: post.media_type === "video" ? "video" : "image",
                                    url: post.media_url,
                                    title: post.content || "Exclusive content",
                                    price: post.price,
                                    isLocked: true,
                                    visibility: "ppv",
                                  });
                                }
                              }}
                              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 hover:scale-105 cursor-pointer"
                            >
                              {post.visibility === "subscribers" ? "Subscribe to Unlock" : "Unlock for KES " + post.price}
                            </button>
                          </div>
                        ) : post.media_type === "video" ? (
                          <video
                            src={post.media_url}
                            controls
                            className="w-full max-h-[550px] object-contain"
                          />
                        ) : (
                          <img
                            src={post.media_url}
                            alt="post media"
                            className="w-full max-h-[550px] object-contain"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Empty state for real creators with zero posts */}
            {posts.length === 0 && !isEscortDemo && (
              <div className="bg-zinc-950/60 border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-500/10">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">No Posts Yet</h3>
                <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
                  {isOwnerActive
                    ? "You haven't uploaded any posts yet. Start sharing exclusive content with your fans now!"
                    : `${creator.name} hasn't published any posts yet. Subscribe to receive instant updates when they drop new content.`}
                </p>
                {isOwnerActive ? (
                  <Link
                    to="/create-post"
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-red-600/30 text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Upload Your First Post
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setSubscribePrice(creatorPrice);
                      setSubscribeDuration(30);
                      setSubscribeTierName("VIP Monthly");
                      setIsSubscribeOpen(true);
                    }}
                    className="px-6 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Subscribe for Updates
                  </button>
                )}
              </div>
            )}

            {/* Demo Escort Showcase Posts ONLY for hardcoded demo profiles */}
            {isEscortDemo && (
              <>
                {/* Free Public Post */}
                <div className="bg-black border border-white/10 rounded-2xl shadow-lg overflow-hidden flex flex-col">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={creator.avatar}
                        alt="avatar"
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-red-500/30"
                      />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          {creator.name}
                          {creator.isVerified && (
                            <CheckCircle2 className="w-4 h-4 text-white fill-blue-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          Public Teaser Drop
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-3">
                    <p className="text-sm text-zinc-200 leading-relaxed">
                      Welcome to my official page! Here's a free preview. Subscribe
                      to unlock all full videos and private DMs!
                    </p>
                  </div>

                  <div className="relative w-full bg-zinc-950 flex justify-center items-center overflow-hidden max-h-[550px] border-y border-white/10">
                    <img
                      src={creator.gallery?.[0] || creator.avatar}
                      alt="post media"
                      className="w-full max-h-[550px] object-contain"
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between bg-black/60 text-zinc-400 text-xs font-bold">
                    <div className="flex items-center gap-1 text-red-500">
                      <Heart className="w-4 h-4 fill-red-500" /> Free Public Preview
                    </div>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      <Share className="w-3.5 h-3.5" /> Share
                    </button>
                  </div>
                </div>

                {/* Locked VIP Post */}
                <div className="bg-black border border-white/10 rounded-2xl shadow-lg overflow-hidden flex flex-col">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={creator.avatar}
                        alt="avatar"
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-red-500/30"
                      />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          {creator.name}
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black bg-red-500/10 text-red-400 border border-red-500/30">
                            VIP Exclusive
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Subscriber Vault
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-3">
                    <p className="text-sm text-zinc-200 leading-relaxed">
                      Exclusive behind-the-scenes content & private high-resolution
                      gallery just for my subscribers!
                    </p>
                  </div>

                  <div className="relative w-full max-h-[550px] flex justify-center items-center border-y border-white/10 overflow-hidden bg-black aspect-[4/5] sm:aspect-video">
                    {isSubscribed ? (
                      <img
                        src={creator.cover_image || creator.avatar}
                        alt="VIP content"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <div
                          className="absolute inset-0 opacity-40 blur-2xl scale-110"
                          style={{
                            backgroundImage: `url(${creator.cover_image || creator.avatar})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                          }}
                        />
                        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-md w-full mx-auto backdrop-blur-md bg-black/60 border border-white/15 rounded-2xl shadow-2xl m-4">
                          <div className="bg-red-500/20 text-red-400 p-4 rounded-full mb-4 shadow-[0_0_30px_rgba(220,38,38,0.3)] border border-red-500/30">
                            <Lock className="w-8 h-8" />
                          </div>
                          <h4 className="text-xl md:text-2xl font-black mb-2 text-white">
                            Subscribe to Unlock
                          </h4>
                          <p className="text-xs md:text-sm text-zinc-300 mb-6 max-w-xs mx-auto leading-relaxed">
                            Join for KES {creatorPrice.toLocaleString()}/month to
                            unlock all exclusive posts and media from {creator.name}
                            .
                          </p>
                          <button
                            onClick={() => setIsSubscribeOpen(true)}
                            className="w-full max-w-xs flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-black px-6 py-3.5 rounded-xl transition-all shadow-[0_0_25px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95 text-sm uppercase tracking-wider cursor-pointer"
                          >
                            Unlock Full Content
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-4 flex items-center justify-between bg-black/60 text-zinc-400 text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Lock className="w-3.5 h-3.5 text-red-500" />
                      {isSubscribed
                        ? "Unlocked with VIP Subscription"
                        : "Subscribers Only"}
                    </div>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      <Share className="w-3.5 h-3.5" /> Share
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ABOUT TAB ── */}
        {activeTab === "about" && (
          <div className="bg-black border border-white/10 p-6 md:p-8 rounded-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">
                About {creator.name.split(" ")[0]}
              </h3>
              <p className="text-zinc-300 leading-relaxed text-sm md:text-base">
                {creator.bio}
              </p>
            </div>

            {creator.services && creator.services.length > 0 && (
              <div>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">
                  Services & Highlights
                </p>
                <div className="flex flex-wrap gap-2">
                  {creator.services.map((s: string) => (
                    <span
                      key={s}
                      className="text-xs font-bold px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-full text-zinc-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-8 pt-4 border-t border-white/10 text-sm">
              <div className="flex items-center gap-2 text-zinc-300">
                <MapPin className="w-4 h-4 text-red-500" /> {creator.location}
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="font-extrabold text-white text-base">
                  {subscriberCount.toLocaleString()}
                </span>
                <span className="text-zinc-500">
                  {subscriberCount === 1 ? "Subscriber" : "Subscribers"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tip Modal */}
        <TipModal
          isOpen={isTipOpen}
          onClose={() => setIsTipOpen(false)}
          creatorName={creator.name}
          creatorId={creator.id}
        />

        {/* Subscribe Modal with Support for Bundles */}
        <SubscribeModal
          isOpen={isSubscribeOpen}
          onClose={() => {
            setIsSubscribeOpen(false);
            if (user?.id) {
              checkUserSubscription(user.id, creator.id).then((sub) => {
                if (sub) {
                  setIsSubscribed(true);
                  setSubscriptionTier(sub.tier_name || "VIP Tier");
                  if (sub.expires_at) setSubscriptionExpiresAt(sub.expires_at);
                }
              });
            }
          }}
          creatorName={creator.name}
          creatorId={creator.id}
          price={subscribePrice}
          durationDays={subscribeDuration}
          tierName={subscribeTierName}
          onSuccess={(sub) => {
            setIsSubscribed(true);
            setSubscriptionTier(sub.tierName);
            setSubscriptionExpiresAt(sub.expiresAt);
            setSubscriberCount((prev) => prev + 1);
            if (id) {
              getPostsByCreator(id, user?.id).then((updatedPosts) =>
                setPosts(updatedPosts.filter((post: any) => post.status !== "draft")),
              );
            }
            toast.success(
              `Welcome to ${creator.name}'s VIP Club! All content is now unlocked for ${sub.durationDays} days.`,
            );
            if (redirectToChatAfterSub) {
              setRedirectToChatAfterSub(false);
              navigate(`/user/messages?creator=${id}`);
            }
          }}
        />

        {/* Pay-Per-View Unlock Modal */}
        <PPVUnlockModal
          isOpen={!!selectedPPVItem}
          onClose={() => setSelectedPPVItem(null)}
          mediaItem={selectedPPVItem}
          creatorName={creator.name}
          creatorId={creator.id}
          monthlyPrice={creatorPrice}
          onUnlocked={handleMediaUnlocked}
          onViewNow={(item) => {
            setSelectedPPVItem(null);
            setActiveLightbox({
              url: item.url,
              type: item.type,
              title: item.title,
            });
          }}
          onSubscribeClick={() => {
            setSelectedPPVItem(null);
            setIsSubscribeOpen(true);
          }}
        />

        {/* Fullscreen Media Viewer Lightbox */}
        {activeLightbox && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
            <button
              onClick={() => setActiveLightbox(null)}
              className="absolute top-5 right-5 p-2 text-white bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="max-w-3xl w-full flex flex-col items-center">
              {activeLightbox.type === "video" ? (
                <video
                  src={activeLightbox.url}
                  controls
                  autoPlay
                  className="w-full max-h-[80vh] object-contain rounded-2xl"
                />
              ) : (
                <img
                  src={activeLightbox.url}
                  alt={activeLightbox.title}
                  className="w-full max-h-[80vh] object-contain rounded-2xl"
                />
              )}
              <h3 className="text-white font-bold text-base mt-4 text-center">
                {activeLightbox.title}
              </h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
