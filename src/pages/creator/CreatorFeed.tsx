import { useState, useEffect, useCallback } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import CreatePostForm from '../../components/CreatePostForm';
import { useAuth } from '../../context/AuthContext';
import { getPostsByCreator, deletePost, getPostLikes, getComments } from '../../lib/db';
import { Lock, Unlock, Trash2, PlusCircle, Loader2, ImageOff, MoreHorizontal, Heart, MessageCircle } from 'lucide-react';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  is_locked: boolean;
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

  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getPostsByCreator(user.id);
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
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
            {posts.length > 0 ? `${posts.length} post${posts.length !== 1 ? 's' : ''} published` : 'No posts yet'}
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
          {posts.map(post => (
            <div key={post.id} className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${post.is_locked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {post.is_locked
                      ? <><Lock className="w-3 h-3" /> KES {post.price}</>
                      : <><Unlock className="w-3 h-3" /> Free</>
                    }
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
                      <div className="absolute right-0 top-10 z-10 w-40 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
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
                <div className="relative">
                  <img
                    src={post.media_url}
                    alt="post media"
                    className="w-full max-h-[480px] object-cover"
                  />
                  {post.is_locked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                      <Lock className="w-8 h-8 text-white mb-2" />
                      <span className="text-white font-bold text-sm">Pay-Per-View · KES {post.price}</span>
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
                  {post.is_locked ? `Paid · KES ${post.price}` : 'Free post'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </CreatorLayout>
  );
};

export default CreatorFeed;
