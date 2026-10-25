import { useState, useEffect } from 'react';
import {
  Flag,
  Eye,
  Check,
  X,
  ShieldAlert,
  Search,
  Trash2,
  Loader2,
  MessageSquare,
  Send,
  Play,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAdminContentPosts, deletePost, sendAdminMessage } from '../../lib/db';
import { toast } from '../../context/ToastContext';
import { resolveUserAvatar } from '../../lib/avatar';

const statusStyles: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  reviewing: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  cleared: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  removed: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const reasonColors: Record<string, string> = {
  'Inappropriate Content': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Misleading Information': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'Spam': 'text-zinc-400 bg-zinc-800 border-zinc-700',
  'Explicit Content': 'text-rose-500 bg-rose-500/10 border-rose-500/20 font-black',
  'Fraud / Scam': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

export const isVideoUrl = (url: string) =>
  Boolean(url && (/\.(mp4|webm|mov|m4v|ogg|ogv|mkv|avi)($|\?)/i.test(url) || url.includes('/video/') || url.includes('video/')));

export const isVideoPost = (item: any) => {
  if (!item) return false;
  const type = String(item.type || '').toLowerCase();
  const mediaType = String(item.media_type || '').toLowerCase();
  if (type === 'video' || mediaType === 'video') return true;
  return isVideoUrl(item.media_url || item.img || '');
};

export const isPhotoPost = (item: any) => {
  if (!item || isVideoPost(item)) return false;
  const type = String(item.type || '').toLowerCase();
  const mediaType = String(item.media_type || '').toLowerCase();
  if (type === 'photo' || mediaType === 'image' || mediaType === 'photo') return true;
  const url = item.media_url || item.img || '';
  return Boolean(url && (/\.(jpe?g|png|gif|webp|svg|avif|bmp)($|\?)/i.test(url) || url.startsWith('http')));
};

export const getMediaUrl = (item: any) => {
  return item?.media_url || item?.img || '';
};

const AdminContent = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const posts = await getAdminContentPosts();

      // Normalise real Supabase posts to match the card shape
      const normalised = posts.map((p: any) => {
        const mediaUrl = p.media_url || p.img || '';
        const isVideo = p.media_type === 'video' || p.type === 'Video' || isVideoUrl(mediaUrl);
        const isPhoto = !isVideo && (p.media_type === 'image' || p.media_type === 'photo' || p.type === 'Photo' || Boolean(mediaUrl));

        return {
          ...p,
          img: mediaUrl,
          media_url: mediaUrl,
          creator: p.creator || p.users?.name || 'Unknown Creator',
          creatorAvatar: p.creatorAvatar || resolveUserAvatar(p.users?.avatar, p.creator || p.users?.name),
          creatorId: p.creator_id || p.creatorId,
          type: isVideo ? 'Video' : (isPhoto ? 'Photo' : 'Post'),
          title: p.content || p.title || (isVideo ? 'Video Upload' : isPhoto ? 'Photo Upload' : '(no caption)'),
          reports: p.reports ?? 0,
          reason: p.reason || 'General Review',
          status: p.status || 'pending',
          time: p.time || (p.created_at
            ? new Date(p.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
            : ''),
        };
      });

      setItems(normalised);
    } catch (err) {
      console.error('Error loading admin content posts:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number | string, status: string) => {
    // Optimistic UI update
    setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    
    // If the action is to remove the post, actually delete it from the live DB
    if (status === 'removed' && typeof id === 'string') {
      try {
        await deletePost(id);
        toast.success("Post removed and taken down from feeds.");
      } catch (err) {
        console.error("Failed to delete post:", err);
        // Revert status if deletion fails
        setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'pending' } : item));
        toast.error("Failed to remove post from database.");
      }
    } else if (status === 'cleared') {
      toast.success("Post cleared from flagged moderation queue.");
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedPost?.creatorId) return;
    
    try {
      await sendAdminMessage(selectedPost.creatorId, messageText);
      toast.success(`Message delivered to ${selectedPost.creator}`); 
    } catch (err) {
      toast.error("Failed to send message.");
    }
    
    setMessageText('');
    setIsMessaging(false);
  };

  const filtered = items.filter(i => {
    const matchFilter = filter === 'all' || i.status === filter;
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.creator.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-24">

        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-card via-card to-card/60 p-5 sm:p-8 rounded-3xl border border-border shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">Content Moderation</h1>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
              Inspect flagged posts, videos, and photos across the platform. Clear legitimate content or remove violations with immediate feed revocation.
            </p>
          </div>

          <button
            onClick={loadContent}
            className="self-start sm:self-auto flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground border border-border px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Posts</span>
          </button>
        </div>

        {/* Overview Metric Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Flagged Queue', value: items.filter(i => i.status === 'pending').length, color: 'text-amber-500', icon: AlertTriangle, border: 'border-amber-500/30' },
            { label: 'Under Review', value: items.filter(i => i.status === 'reviewing').length, color: 'text-sky-500', icon: Clock, border: 'border-sky-500/30' },
            { label: 'Cleared Posts', value: items.filter(i => i.status === 'cleared').length, color: 'text-emerald-500', icon: CheckCircle2, border: 'border-emerald-500/30' },
            { label: 'Removed Content', value: items.filter(i => i.status === 'removed').length, color: 'text-rose-500', icon: Trash2, border: 'border-rose-500/30' },
          ].map(({ label, value, color, icon: Icon, border }, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-2 hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
                <span className={`p-1.5 rounded-lg bg-muted text-muted-foreground ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by caption or creator..."
              className="w-full bg-card border border-border pl-10 pr-4 py-2.5 rounded-xl sm:rounded-2xl text-foreground text-xs font-medium focus:outline-none focus:border-red-500 transition-all placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex bg-card border border-border p-1 rounded-xl sm:rounded-2xl overflow-x-auto hide-scrollbar">
            {['all', 'pending', 'reviewing', 'cleared', 'removed'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  filter === s
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content Moderation Cards */}
        <div className="space-y-4">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center text-muted-foreground bg-card border border-border rounded-3xl gap-3">
               <Loader2 className="w-8 h-8 animate-spin text-red-500" />
               <span className="font-bold text-xs sm:text-sm">Fetching platform media & feed posts...</span>
             </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground font-medium bg-card border border-border rounded-3xl p-6 space-y-2">
              <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="font-bold text-foreground text-base">No content matches this filter</p>
              <p className="text-xs max-w-sm mx-auto">All reports have been moderated or no matching posts were found.</p>
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className="group relative bg-card border border-border hover:border-zinc-700 dark:hover:border-zinc-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {/* Responsive Card Body: Stacks vertically on phone, horizontal on tablet/desktop */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  
                  {/* Media Thumbnail Box */}
                  <div
                    onClick={() => setSelectedPost(item)}
                    className="relative w-full sm:w-28 md:w-32 aspect-video sm:aspect-square rounded-2xl overflow-hidden bg-black border border-border shrink-0 cursor-pointer group/media"
                  >
                    {isVideoPost(item) && getMediaUrl(item) ? (
                      <div className="w-full h-full relative flex items-center justify-center">
                        <video
                          src={getMediaUrl(item)}
                          className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300 pointer-events-none"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="w-9 h-9 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover/media:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </span>
                        </div>
                        <span className="absolute bottom-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/80 text-white border border-white/10 flex items-center gap-1">
                          <Video className="w-2.5 h-2.5 text-red-400" /> Video
                        </span>
                      </div>
                    ) : isPhotoPost(item) && getMediaUrl(item) ? (
                      <div className="w-full h-full relative">
                        <img
                          src={getMediaUrl(item)}
                          alt="Thumbnail"
                          className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <span className="absolute bottom-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/80 text-white border border-white/10 flex items-center gap-1">
                          <ImageIcon className="w-2.5 h-2.5 text-sky-400" /> Photo
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-3 bg-muted/40">
                        <ShieldAlert className="w-6 h-6 mb-1 text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Text Post</span>
                      </div>
                    )}

                    {/* Quick tap overlay indicator */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover/media:opacity-100 transition-opacity">
                      <span className="p-1 rounded-md bg-black/70 text-white border border-white/20 block shadow">
                        <Eye className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {/* Details Middle Section */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Creator Identity & Status Badges Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.creatorAvatar || resolveUserAvatar('', item.creator)}
                          alt={item.creator}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-border shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.creator || 'Creator')}&background=18181b&color=ffffff&bold=true`;
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm text-foreground truncate hover:text-red-500 transition-colors">
                              {item.creator}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium block">
                            {item.time || 'Recently posted'}
                          </span>
                        </div>
                      </div>

                      {/* Moderation Status & Reason Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${reasonColors[item.reason] ?? 'text-muted-foreground bg-muted border-border'}`}>
                          {item.reason}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-full border ${statusStyles[item.status]}`}>
                          {item.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                          {item.status === 'cleared' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Caption / Title */}
                    <div
                      onClick={() => setSelectedPost(item)}
                      className="cursor-pointer"
                    >
                      <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </div>

                    {/* Reports Flag Pill & Meta */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                        item.reports > 0
                          ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                          : 'text-muted-foreground bg-muted/50 border-border'
                      }`}>
                        <Flag className="w-3 h-3" />
                        <span>{item.reports} {item.reports === 1 ? 'Report' : 'Reports'}</span>
                      </span>

                      <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                        ID: <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">{String(item.id).slice(0, 8)}</code>
                      </span>
                    </div>
                  </div>

                  {/* Actions Column (Desktop: vertical stack on right; Mobile: clean row at bottom) */}
                  {item.status !== 'removed' && (
                    <div className="pt-3 sm:pt-0 border-t sm:border-t-0 border-border/80 grid grid-cols-3 sm:flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'reviewing'); setSelectedPost(item); }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm sm:w-32"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      {item.status !== 'cleared' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'cleared'); }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm sm:w-32"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Clear</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'removed'); }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm sm:w-32"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Take Down</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Post Review Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedPost(null)} />
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] my-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={selectedPost.creatorAvatar || resolveUserAvatar('', selectedPost.creator)}
                  alt={selectedPost.creator}
                  className="w-10 h-10 rounded-full object-cover border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPost.creator || 'Creator')}&background=18181b&color=ffffff&bold=true`;
                  }}
                />
                <div>
                  <div className="text-foreground font-black text-sm sm:text-base flex items-center gap-1.5">
                    {selectedPost.creator}
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="text-xs text-muted-foreground font-bold">{selectedPost.time || 'Recent Post'}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Media & Details */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="text-foreground text-sm sm:text-base leading-relaxed break-words font-medium">
                {selectedPost.title}
              </div>

              <div className="w-full rounded-2xl overflow-hidden border border-border bg-black flex items-center justify-center min-h-[240px] sm:min-h-[320px]">
                {isVideoPost(selectedPost) && getMediaUrl(selectedPost) ? (
                  <video
                    src={getMediaUrl(selectedPost)}
                    controls
                    playsInline
                    preload="auto"
                    className="w-full max-h-[480px] object-contain"
                  />
                ) : isPhotoPost(selectedPost) && getMediaUrl(selectedPost) ? (
                  <img
                    src={getMediaUrl(selectedPost)}
                    alt="Post media"
                    className="w-full max-h-[480px] object-contain"
                  />
                ) : (
                   <div className="text-muted-foreground font-black uppercase tracking-widest text-xs sm:text-sm py-16 text-center">
                     Text Only Post (No Attached Media)
                   </div>
                )}
              </div>
              
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-500 font-black text-xs sm:text-sm">
                  <ShieldAlert className="w-4 h-4" /> Moderation Context & Policy
                </div>
                <div className="text-muted-foreground text-xs leading-relaxed">
                  This post has been reported <strong className="text-foreground">{selectedPost.reports} times</strong> for <strong className="text-foreground">{selectedPost.reason}</strong>.
                  Currently marked as <span className={`uppercase tracking-wider text-[10px] font-black px-2 py-0.5 rounded-full border ${statusStyles[selectedPost.status]}`}>{selectedPost.status}</span>.
                </div>
              </div>
              
              {/* Message Composer Area */}
              {isMessaging && (
                <div className="p-4 rounded-2xl bg-muted/60 border border-blue-500/30 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" /> Warning / Compliance Notice to {selectedPost.creator}
                    </label>
                  </div>
                  <textarea
                    autoFocus
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="E.g., Your post has been flagged under our community standards regarding..."
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500 transition-all resize-none h-24"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsMessaging(false)}
                      className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-1.5 text-xs font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Send Notice
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 sm:p-6 border-t border-border shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card">
              <button
                onClick={() => setIsMessaging(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" /> Message Creator
              </button>
              
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setSelectedPost(null); setIsMessaging(false); }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-muted-foreground font-bold text-xs sm:text-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  Close
                </button>
                {selectedPost.status !== 'cleared' && (
                  <button
                    onClick={() => { updateStatus(selectedPost.id, 'cleared'); setSelectedPost(null); setIsMessaging(false); }}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Clear Flag
                  </button>
                )}
                {selectedPost.status !== 'removed' && (
                  <button
                    onClick={() => { updateStatus(selectedPost.id, 'removed'); setSelectedPost(null); setIsMessaging(false); }}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                  >
                    Take Down Post
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminContent;
