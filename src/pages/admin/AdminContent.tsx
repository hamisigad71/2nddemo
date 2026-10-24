import { useState, useEffect } from 'react';
import { Flag, Eye, Check, X, ShieldAlert, Search, Trash2, Loader2, MessageSquare, Send } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAdminContentPosts, deletePost, sendAdminMessage } from '../../lib/db';
import { toast } from '../../context/ToastContext';
import { resolveUserAvatar } from '../../lib/avatar';



const statusStyles: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  reviewing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  cleared: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  removed: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const reasonColors: Record<string, string> = {
  'Inappropriate Content': 'text-orange-400 bg-orange-500/10',
  'Misleading Information': 'text-blue-400 bg-blue-500/10',
  'Spam': 'text-zinc-400 bg-zinc-500/10',
  'Explicit Content': 'text-red-500 bg-red-600/10 font-black',
  'Fraud / Scam': 'text-red-400 bg-red-500/10',
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

  const isVideoUrl = (url: string) =>
    Boolean(url && (/\.(mp4|webm|mov|m4v|ogg|ogv|mkv|avi)($|\?)/i.test(url) || url.includes('/video/') || url.includes('video/')));

  const isVideoPost = (item: any) => {
    if (!item) return false;
    const type = String(item.type || '').toLowerCase();
    const mediaType = String(item.media_type || '').toLowerCase();
    if (type === 'video' || mediaType === 'video') return true;
    return isVideoUrl(item.media_url || item.img || '');
  };

  const isPhotoPost = (item: any) => {
    if (!item || isVideoPost(item)) return false;
    const type = String(item.type || '').toLowerCase();
    const mediaType = String(item.media_type || '').toLowerCase();
    if (type === 'photo' || mediaType === 'image' || mediaType === 'photo') return true;
    const url = item.media_url || item.img || '';
    return Boolean(url && (/\.(jpe?g|png|gif|webp|svg|avif|bmp)($|\?)/i.test(url) || url.startsWith('http')));
  };

  const getMediaUrl = (item: any) => {
    return item?.media_url || item?.img || '';
  };

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
      } catch (err) {
        console.error("Failed to delete post:", err);
        // Revert status if deletion fails
        setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'pending' } : item));
        toast.error("Failed to remove post from database.");
      }
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
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-[#0d0e12] to-[#0d0e12] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Content Moderation</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">Review and moderate flagged posts, photos, and videos from creators across the platform.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Flagged', value: items.filter(i => i.status === 'pending').length, color: 'text-red-400' },
            { label: 'Under Review', value: items.filter(i => i.status === 'reviewing').length, color: 'text-blue-400' },
            { label: 'Cleared', value: items.filter(i => i.status === 'cleared').length, color: 'text-emerald-400' },
            { label: 'Removed', value: items.filter(i => i.status === 'removed').length, color: 'text-zinc-400' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6">
              <div className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2">{label}</div>
              <div className={`text-3xl font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search content..."
              className="w-full bg-[#0d0e12] border border-zinc-800 pl-11 pr-4 py-3.5 rounded-2xl text-white text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="flex bg-[#0d0e12] border border-zinc-800 p-1.5 rounded-2xl">
            {['all', 'pending', 'reviewing', 'cleared', 'removed'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  filter === s ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content Cards */}
        <div className="space-y-4">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center text-zinc-500 bg-[#0d0e12] border border-zinc-800 rounded-3xl">
               <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-4" />
               <div className="font-bold">Fetching latest platform posts...</div>
             </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 font-medium bg-[#0d0e12] border border-zinc-800 rounded-3xl">No flagged content found.</div>
          ) : filtered.map(item => (
            <div key={item.id} className="bg-[#0d0e12] border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors group cursor-pointer" onClick={() => setSelectedPost(item)}>
              <div className="flex items-start gap-5">
                {/* Thumbnail — video or image */}
                <div className="relative w-14 h-14 shrink-0">
                  {isVideoPost(item) && getMediaUrl(item) ? (
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-zinc-800 group-hover:border-red-500/30 transition-colors flex items-center justify-center overflow-hidden">
                      <video
                        src={getMediaUrl(item)}
                        className="w-full h-full object-cover rounded-2xl pointer-events-none"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                        <Eye className="w-5 h-5 text-white/80" />
                      </span>
                    </div>
                  ) : isPhotoPost(item) && getMediaUrl(item) ? (
                    <img
                      src={getMediaUrl(item)}
                      alt="Thumbnail"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-zinc-800 group-hover:border-red-500/30 transition-colors"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center text-zinc-600">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  )}
                  {/* Video badge */}
                  {isVideoPost(item) && (
                    <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide shadow">▶</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <div className="font-black text-white text-base mb-0.5 group-hover:text-red-400 transition-colors">{item.title}</div>
                      <div className="text-xs text-zinc-500 font-medium">{item.creator} · <span className="text-zinc-600">{isVideoPost(item) ? 'Video' : isPhotoPost(item) ? 'Photo' : 'Post'}</span> · {item.time}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${reasonColors[item.reason] ?? 'text-zinc-400 bg-zinc-800'}`}>{item.reason}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border ${statusStyles[item.status]}`}>{item.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 text-xs text-red-400 font-black bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                      <Flag className="w-3 h-3" /> {item.reports} {item.reports === 1 ? 'report' : 'reports'}
                    </span>
                  </div>
                  {item.status !== 'cleared' && item.status !== 'removed' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'reviewing'); setSelectedPost(item); }}
                        className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Review
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'cleared'); }}
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Clear
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'removed'); }}
                        className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Remove Post
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Post Review Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPost(null)}></div>
          <div className="relative w-full max-w-2xl bg-[#0d0e12] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-4">
                <img
                  src={selectedPost.creatorAvatar || resolveUserAvatar('', selectedPost.creator)}
                  alt={selectedPost.creator}
                  className="w-10 h-10 rounded-xl object-cover border border-zinc-800"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPost.creator || 'Creator')}&background=18181b&color=ffffff&bold=true`;
                  }}
                />
                <div>
                  <div className="text-white font-black">{selectedPost.creator}</div>
                  <div className="text-xs text-zinc-500 font-bold">{selectedPost.time}</div>
                </div>
              </div>
              <button onClick={() => setSelectedPost(null)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="text-white text-base leading-relaxed break-words">{selectedPost.title}</div>
              <div className="w-full rounded-2xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center bg-zinc-900 min-h-[300px]">
                {isVideoPost(selectedPost) && getMediaUrl(selectedPost) ? (
                  <video
                    src={getMediaUrl(selectedPost)}
                    controls
                    playsInline
                    preload="auto"
                    className="w-full max-h-[500px] object-contain"
                  />
                ) : isPhotoPost(selectedPost) && getMediaUrl(selectedPost) ? (
                  <img
                    src={getMediaUrl(selectedPost)}
                    alt="Post media"
                    className="w-full max-h-[500px] object-contain"
                  />
                ) : (
                   <div className="text-zinc-600 font-black uppercase tracking-widest text-sm py-20">Text Only Post</div>
                )}
              </div>
              
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-500 font-black text-sm">
                  <ShieldAlert className="w-4 h-4" /> Moderation Context
                </div>
                <div className="text-zinc-400 text-sm">
                  This post has been flagged <strong className="text-white">{selectedPost.reports} times</strong> for <strong className="text-white">{selectedPost.reason}</strong>.
                  Currently marked as <span className={`uppercase tracking-wider text-[10px] font-black px-2 py-0.5 rounded-full ${statusStyles[selectedPost.status]}`}>{selectedPost.status}</span>.
                </div>
              </div>
              
              {/* Message Composer Area */}
              {isMessaging && (
                <div className="p-4 rounded-xl bg-zinc-900 border border-blue-500/30 shadow-lg shadow-blue-500/5 animate-in slide-in-from-top-4 fade-in duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" /> Direct Message to {selectedPost.creator}
                    </label>
                  </div>
                  <textarea
                    autoFocus
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="E.g., Your post violates our community guidelines..."
                    className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none h-24 mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsMessaging(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSendMessage} className="px-4 py-2 text-xs font-black bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-md flex items-center gap-2 transition-all">
                      <Send className="w-3.5 h-3.5" /> Send Warning
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-zinc-800 shrink-0 flex items-center justify-between bg-[#0d0e12] rounded-b-3xl">
              <button onClick={() => setIsMessaging(true)} className="px-5 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black text-sm hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Message Creator
              </button>
              
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedPost(null); setIsMessaging(false); }} className="px-5 py-2.5 rounded-xl text-zinc-400 font-black text-sm hover:bg-zinc-800 hover:text-white transition-colors">
                  Close
                </button>
                {selectedPost.status !== 'cleared' && (
                  <button onClick={() => { updateStatus(selectedPost.id, 'cleared'); setSelectedPost(null); setIsMessaging(false); }} className="px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-sm hover:bg-emerald-500 hover:text-white transition-colors">
                    Clear Flag
                  </button>
                )}
                {selectedPost.status !== 'removed' && (
                  <button onClick={() => { updateStatus(selectedPost.id, 'removed'); setSelectedPost(null); setIsMessaging(false); }} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-black text-sm hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
                    Remove Post
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
