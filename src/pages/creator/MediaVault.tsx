import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CreatorLayout from '../../components/CreatorLayout';
import { UploadCloud, PlayCircle, Image as ImageIcon, Lock, Eye, Trash2, X, Plus, Sparkles, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPostsByCreator, deletePost } from '../../lib/db';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  title: string;
  date: string;
  isLocked: boolean;
  price: number;
}

const MediaVault = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'locked' | 'free'>('all');
  const [activeLightbox, setActiveLightbox] = useState<MediaItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMedia = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const posts = await getPostsByCreator(user.id);
      const mediaPosts = (posts || [])
        .filter((p: any) => p.media_url)
        .map((p: any) => ({
          id: p.id,
          type: (p.media_type === 'video' || p.media_url?.includes('.mp4') ? 'video' : 'image') as 'image' | 'video',
          url: p.media_url,
          title: p.content ? p.content.slice(0, 40) + '...' : 'Media Drop',
          date: new Date(p.created_at).toLocaleDateString(),
          isLocked: p.is_locked,
          price: p.price || 0,
        }));

      // Fallback demo items if creator is brand new so they see what the vault looks like
      if (mediaPosts.length === 0) {
        setItems([
          { id: 'sample-1', type: 'image', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800', title: 'Studio Portrait Series', date: 'Yesterday', isLocked: false, price: 0 },
          { id: 'sample-2', type: 'video', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', title: 'Behind the Scenes Vlog', date: '3 days ago', isLocked: true, price: 250 },
          { id: 'sample-3', type: 'image', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', title: 'Golden Hour Photoset', date: '5 days ago', isLocked: true, price: 200 },
        ]);
      } else {
        setItems(mediaPosts);
      }
    } catch (err) {
      console.error('Error loading vault media:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleDelete = async (itemId: string) => {
    if (itemId.startsWith('sample-')) {
      setItems(prev => prev.filter(i => i.id !== itemId));
      return;
    }
    if (!confirm('Are you sure you want to delete this media item? It will be removed from your profile and feed.')) return;
    setDeletingId(itemId);
    try {
      await deletePost(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      if (activeLightbox?.id === itemId) setActiveLightbox(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const photosCount = items.filter(i => i.type === 'image').length;
  const videosCount = items.filter(i => i.type === 'video').length;
  const lockedCount = items.filter(i => i.isLocked).length;
  const freeCount = items.filter(i => !i.isLocked).length;

  const filteredItems = items.filter(i => {
    if (activeTab === 'image') return i.type === 'image';
    if (activeTab === 'video') return i.type === 'video';
    if (activeTab === 'locked') return i.isLocked;
    if (activeTab === 'free') return !i.isLocked;
    return true;
  });

  return (
    <CreatorLayout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
              Media Vault <Sparkles className="w-6 h-6 text-red-500" />
            </h1>
            <p className="text-zinc-400 text-sm">
              Manage all photos, videos, free teasers, and pay-per-view content visible to your subscribers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.id && (
              <Link
                to={`/creator/${user.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border border-white/10 text-xs font-bold transition-all shadow-md"
              >
                <Eye className="w-4 h-4 text-red-500" /> View Public Page <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Link>
            )}
            <Link
              to="/create-post"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Upload Media
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {[
            { id: 'all', label: `All Media (${items.length})` },
            { id: 'image', label: `Photos (${photosCount})` },
            { id: 'video', label: `Videos (${videosCount})` },
            { id: 'locked', label: `Locked PPV (${lockedCount})` },
            { id: 'free', label: `Free Teasers (${freeCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-[#0d0e12] border border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">
            Loading your media vault...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-[#0d0e12] border border-dashed border-white/10 rounded-3xl p-12 text-center mt-6">
            <UploadCloud className="w-16 h-16 text-zinc-600 mb-4 opacity-50" />
            <h3 className="font-bold text-lg text-white mb-1">No media found in this filter</h3>
            <p className="text-sm text-zinc-400 max-w-sm mb-6">
              Upload photos or videos as free teasers or locked pay-per-view drops for your subscribers.
            </p>
            <Link
              to="/create-post"
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/20"
            >
              Upload Your First Post
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setActiveLightbox(item)}
                className="group relative aspect-[4/5] bg-zinc-950 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 ring-1 ring-white/10 hover:ring-red-500"
              >
                {item.type === 'video' ? (
                  <div className="w-full h-full relative bg-zinc-900">
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <PlayCircle className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  {item.isLocked ? (
                    <span className="bg-red-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-white text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-1">
                      <Lock className="w-3 h-3" /> KES {item.price}
                    </span>
                  ) : (
                    <span className="bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-white text-[10px] font-black uppercase tracking-wider shadow">
                      FREE
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md p-1.5 rounded-lg text-white shadow ring-1 ring-white/10">
                  {item.type === 'video' ? <PlayCircle className="w-3.5 h-3.5 text-red-400" /> : <ImageIcon className="w-3.5 h-3.5 text-red-400" />}
                </div>

                {/* Gradient & Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Bottom Overlay Info & Delete */}
                <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold truncate">{item.title}</span>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                    <span>{item.date}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      disabled={deletingId === item.id}
                      className="p-1 rounded bg-black/60 hover:bg-red-600 text-zinc-400 hover:text-white transition-colors"
                      title="Delete Media"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Modal */}
        {activeLightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setActiveLightbox(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-[#0D0E12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                    activeLightbox.isLocked ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {activeLightbox.isLocked ? `🔒 Locked · KES ${activeLightbox.price} PPV` : '🌐 Free Public Post'}
                  </span>
                  <span className="text-xs text-zinc-400">{activeLightbox.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(activeLightbox.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveLightbox(null)}
                    className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] flex items-center justify-center bg-black overflow-hidden">
                {activeLightbox.type === 'video' ? (
                  <video src={activeLightbox.url} controls autoPlay className="max-h-[70vh] w-full object-contain" />
                ) : (
                  <img src={activeLightbox.url} alt={activeLightbox.title} className="max-h-[70vh] w-full object-contain" />
                )}
              </div>

              {activeLightbox.title && (
                <div className="p-4 bg-zinc-950 text-sm text-zinc-300 border-t border-white/5">
                  {activeLightbox.title}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CreatorLayout>
  );
};

export default MediaVault;
