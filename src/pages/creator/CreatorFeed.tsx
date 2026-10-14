import { useState, useEffect, useCallback } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import CreatePostForm from '../../components/CreatePostForm';
import { useAuth } from '../../context/AuthContext';
import { getPostsByCreator, deletePost, getPostLikes, getComments, updatePostAccess, updatePostStatus } from '../../lib/db';
import { Lock, Unlock, Trash2, PlusCircle, Loader2, ImageOff, MoreHorizontal, Heart, MessageCircle } from 'lucide-react';
import FeedImage from '../../components/FeedImage';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  is_locked: boolean;
  visibility?: 'public' | 'subscribers' | 'ppv';
  status?: 'published' | 'draft';
  price: number;
  created_at: string;
  users?: { name: string; avatar: string | null };
}

const PostStats = ({ postId }: { postId: string }) => {
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);

  useEffect(() => {
    getPostLikes(postId).then(({ count }) => setLikes(count));
    getComments(postId).then(data => setComments(data.length));
  }, [postId]);

  return (
    <>
      <button className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
        <Heart className="w-4 h-4" /> <span>{likes}</span>
      </button>
      <button className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
        <MessageCircle className="w-4 h-4" /> <span>{comments}</span>
      </button>
    </>
  );
};

const CreatorFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getPostsByCreator(user.id, user.id);
    setPosts(data as Post[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setDeletingId(postId);
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
      setOpenMenuId(null);
    }
  };

  const handleAccessChange = async (post: Post, visibility: 'public' | 'subscribers' | 'ppv') => {
    if (!user?.id) return;
    let price = post.price || 0;
    if (visibility === 'ppv') {
      const enteredPrice = window.prompt('Set the pay-per-view price in KES:', String(price || 250));
      if (enteredPrice === null) return;
      price = Number(enteredPrice);
      if (!Number.isSafeInteger(price) || price < 1) {
        setActionError('Enter a whole-number PPV price of at least KES 1.');
        return;
      }
    }
    setActionError(null);
    try {
      const status = post.status || 'published';
      await updatePostAccess(post.id, user.id, visibility, status, price);
      setPosts(prev => prev.map(item => item.id === post.id
        ? { ...item, visibility, is_locked: visibility === 'ppv', price: visibility === 'ppv' ? price : 0 }
        : item));
      setOpenMenuId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update post access.');
    }
  };

  const handleStatusChange = async (post: Post) => {
    if (!user?.id) return;
    const status = post.status === 'draft' ? 'published' : 'draft';
    setActionError(null);
    try {
      await updatePostStatus(post.id, user.id, status);
      await loadPosts();
      setOpenMenuId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update post status.');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} · ${timePart}`;
  };

  const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Creator';
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <CreatorLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Feed</h1>
          <p className="text-muted-foreground">
            {posts.filter(post => post.status !== 'draft').length} published · {posts.filter(post => post.status === 'draft').length} drafts
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Create Post Form (collapsible) */}
      {showForm && (
        <div className="mb-8">
          <CreatePostForm onPostCreated={() => { setShowForm(false); loadPosts(); }} />
        </div>
      )}
      {actionError && (
        <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
          {actionError}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <ImageOff className="w-9 h-9 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Nothing here yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click <strong>New Post</strong> to publish your first piece of content.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            <PlusCircle className="w-5 h-5" /> Create First Post
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post, index) => (
            <article key={post.id} className="bg-zinc-950 border border-white/[0.06] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300 hover:border-white/10 -mx-1 sm:mx-0 rounded-3xl sm:rounded-[20px]">
              {/* Post Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <img
                    src={userAvatar || 'https://i.pravatar.cc/150?img=12'}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover border border-border"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="font-bold text-sm text-foreground">{userName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Lock badge */}
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${post.visibility && post.visibility !== 'public' || post.is_locked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {post.status === 'draft' ? 'Draft' : (post.visibility === 'subscribers'
                      ? <><Lock className="w-3 h-3" /> Subscribers</>
                      : post.is_locked || post.visibility === 'ppv'
                        ? <><Lock className="w-3 h-3" /> KES {post.price}</>
                        : <><Unlock className="w-3 h-3" /> Public</>)}
                  </span>
                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                      className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {openMenuId === post.id && (
                      <div className="absolute right-0 top-10 z-10 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <p className="px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">Visibility</p>
                          {(['public', 'subscribers', 'ppv'] as const).map(visibility => (
                            <button
                              key={visibility}
                              onClick={() => handleAccessChange(post, visibility)}
                              className="w-full text-left px-2 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-lg"
                            >
                              {visibility === 'public' ? 'Public' : visibility === 'subscribers' ? 'Subscribers only' : 'Pay per view'}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleStatusChange(post)}
                          className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors font-bold border-b border-border"
                        >
                          {post.status === 'draft' ? 'Publish Draft' : 'Move to Drafts'}
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deletingId === post.id}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors font-bold"
                        >
                          {deletingId === post.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                          Delete Post
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Media */}
              {post.media_url && (
                <div className="relative w-full bg-black/90 flex justify-center items-center overflow-hidden border-y border-border/50">
                  <FeedImage
                    src={post.media_url}
                    alt="post media"
                    priority={index < 2}
                  />
                  {(post.is_locked || post.visibility === 'subscribers') && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                      <Lock className="w-8 h-8 text-white mb-2" />
                      <span className="text-white font-bold text-sm">{post.visibility === 'subscribers' ? 'Subscribers only' : `Pay-Per-View · KES ${post.price}`}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Caption */}
              {post.content && (
                <div className="px-5 pt-4">
                  <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
                </div>
              )}

              {/* Actions — real stats */}
              <div className="flex items-center gap-5 px-5 py-4 border-t border-border mt-4">
                <PostStats postId={post.id} />
                <span className="ml-auto text-xs text-muted-foreground font-medium">
                  {post.status === 'draft' ? 'Draft' : post.visibility === 'subscribers' ? 'Subscribers only' : post.is_locked ? `PPV · KES ${post.price}` : 'Public post'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </CreatorLayout>
  );
};

export default CreatorFeed;
