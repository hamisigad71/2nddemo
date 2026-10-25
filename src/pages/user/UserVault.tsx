import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import {
  PlayCircle,
  Image as ImageIcon,
  FolderHeart,
  ShoppingBag,
  ExternalLink,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { getEscorts } from "../../lib/mockData";

interface VaultItem {
  id: string;
  type: "image" | "video";
  url: string;
  title: string;
  creatorId: string;
  creatorName: string;
  date: string;
}

const UserVault = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [activeMedia, setActiveMedia] = useState<VaultItem | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVault() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const unlockedKeys: string[] = [];
      try {
        const local = JSON.parse(
          localStorage.getItem(`unlocked_ppv_${user.id}`) || "[]",
        );
        if (Array.isArray(local)) unlockedKeys.push(...local);
      } catch {
        // ignore
      }

      // Check transactions in Supabase for ppv_unlock
      try {
        const { data: txs } = await supabase
          .from("transactions")
          .select("*")
          .eq("from_user_id", user.id)
          .eq("type", "ppv_unlock")
          .eq("status", "completed");

        if (txs) {
          txs.forEach((t: any) => {
            if (t.post_id && !unlockedKeys.includes(t.post_id)) {
              unlockedKeys.push(t.post_id);
            }
          });
        }
      } catch {
        // ignore
      }

      const escorts = getEscorts();
      const escortsMap = new Map(escorts.map((e) => [e.id, e]));

      // Build vault items
      const loaded: VaultItem[] = [];

      // Check if unlocked keys correspond to real posts
      if (unlockedKeys.length > 0) {
        try {
          const { data: realPosts } = await supabase
            .from("posts")
            .select("*")
            .in("id", unlockedKeys);

          if (realPosts) {
            for (const p of realPosts) {
              const escort = escortsMap.get(p.creator_id);
              loaded.push({
                id: p.id,
                type:
                  p.media_type === "video" || p.media_url?.includes(".mp4")
                    ? "video"
                    : "image",
                url: p.media_url,
                title: p.content
                  ? p.content.slice(0, 40) + "..."
                  : "Exclusive PPV Content",
                creatorId: p.creator_id,
                creatorName: escort?.name || "Creator",
                date: new Date(p.created_at).toLocaleDateString(),
              });
            }
          }
        } catch {
          // ignore
        }
      }

      // If user has unlocked demo items from creator profiles, show them
      unlockedKeys.forEach((key) => {
        if (!loaded.find((l) => l.id === key)) {
          // Check if it's an escort demo key e.g. escort-1-m-1
          const match = key.match(/^(.+)-m-(\d+)$/);
          if (match) {
            const escortId = match[1];
            const escort = escortsMap.get(escortId);
            const isVideo = Number(match[2]) % 2 === 1;
            loaded.push({
              id: key,
              type: isVideo ? "video" : "image",
              url:
                escort?.avatar ||
                escort?.cover_image ||
                "/placeholder-cover.jpg",
              title: `VIP Unlocked Set #${match[2]}`,
              creatorId: escortId,
              creatorName: escort?.name || "Dollhouse Creator",
              date: "Recently Unlocked",
            });
          }
        }
      });

      setItems(loaded);
      setLoading(false);
    }

    loadVault();
  }, [user?.id]);

  const filteredItems = items.filter((i) => {
    if (filter === "image") return i.type === "image";
    if (filter === "video") return i.type === "video";
    return true;
  });

  return (
    <UserLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
            Your Purchases <ShoppingBag className="w-5 h-5 text-red-500" />
          </h1>
          <p className="text-sm text-zinc-400">
            All Pay-Per-View videos and photo sets you have unlocked across all
            creators.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-[#0d0e12] border border-white/10 p-1.5 rounded-2xl self-start sm:self-auto">
          {(["all", "image", "video"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                filter === tab
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab === "all" ? "All" : tab === "image" ? "Photos" : "Videos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">
          Loading your unlocked media...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-[#0d0e12] border border-dashed border-white/10 rounded-3xl p-12 text-center mt-6">
          <FolderHeart className="w-16 h-16 text-zinc-600 mb-4 opacity-50" />
          <h3 className="font-bold text-lg text-white mb-1">
            No unlocked purchases yet
          </h3>
          <p className="text-sm text-zinc-400 max-w-sm mb-6">
            When you unlock exclusive pay-per-view videos or photos on a
            creator's profile, they are permanently stored in your vault.
          </p>
          <Link
            to="/discover"
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/20"
          >
            Explore Creators
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveMedia(item)}
              className="group relative aspect-[4/5] bg-zinc-950 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 ring-1 ring-white/10 hover:ring-red-500"
            >
              {item.type === "video" ? (
                <div className="w-full h-full relative bg-zinc-900">
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}

              {/* Badges */}
              <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[10px] font-bold ring-1 ring-white/20 flex items-center gap-1">
                {item.type === "video" ? (
                  <PlayCircle className="w-3 h-3 text-red-500" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-red-500" />
                )}
                {item.type === "video" ? "VIDEO" : "PHOTO"}
              </div>

              {/* Gradient & Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

              <div className="absolute inset-0 flex flex-col justify-end p-3.5">
                <span className="text-white text-xs sm:text-sm font-bold truncate leading-tight group-hover:text-red-400 transition-colors">
                  {item.title}
                </span>
                <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                  <Link
                    to={`/creator/${item.creatorId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-white font-medium truncate max-w-[100px] flex items-center gap-1"
                  >
                    {item.creatorName}{" "}
                    <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                  </Link>
                  <span className="text-[10px] text-zinc-500">{item.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#0D0E12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">
                  {activeMedia.title}
                </h3>
                <Link
                  to={`/creator/${activeMedia.creatorId}`}
                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  By {activeMedia.creatorName}
                </Link>
              </div>
              <button
                onClick={() => setActiveMedia(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[75vh] flex items-center justify-center bg-black overflow-hidden">
              {activeMedia.type === "video" ? (
                <video
                  src={activeMedia.url}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-full object-contain"
                />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={activeMedia.title}
                  className="max-h-[75vh] w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default UserVault;
