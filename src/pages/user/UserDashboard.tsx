import { useState, useEffect, useRef, useCallback } from 'react';
import UserLayout from '../../components/UserLayout';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Loader2, Rss } from 'lucide-react';
import TipModal from '../../components/TipModal';
import { useAuth } from '../../context/AuthContext';
import { getFanFeed } from '../../lib/db';
import { supabase } from '../../lib/supabase';

// ─── Feed Post Component ─────────────────────────────────────────────────────

const FeedPost = ({ post }: { post: any }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);

  const creator = post.users;
  const avatarUrl = creator?.avatar || `https://i.pravatar.cc/150?u=${post.creator_id}`;
  const creatorName = creator?.name || 'Creator';
  const timeAgo = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
    : '';

  const toggleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount((prev: number) => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <>
      <article className="bg-background border border-border/50 rounded-2xl overflow-hidden shadow-md hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col">

        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt={creatorName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
            />
            <div>
              <div className="font-bold text-sm leading-tight">{creatorName}</div>
              <div className="text-[11px] text-muted-foreground">{timeAgo}</div>
            </div>
          </div>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Media */}
        {post.media_url && (
          <div className="relative bg-black overflow-hidden">
            <img
              src={post.media_url}
              alt="post"
              referrerPolicy="no-referrer"
              className="w-full object-cover max-h-[600px]"
            />
            {post.is_locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 backdrop-blur-xl bg-black/60">
                <span className="text-2xl">🔒</span>
                <p className="text-white font-bold text-sm">Subscribe to unlock</p>
                <p className="text-white/70 text-xs">KES {post.price}</p>
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        {post.content && (
          <div className="px-4 py-3">
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="font-bold mr-1">{creatorName}</span>
              {post.content}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-border/30 mt-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 transition-colors group ${isLiked ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Heart className={`w-5 h-5 transition-transform active:scale-90 ${isLiked ? 'fill-primary text-primary' : 'group-hover:text-primary'}`} />
              <span className="text-xs font-bold">{likesCount}</span>
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-bold">0</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTipOpen(true)}
              className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-full px-3 py-1 font-bold text-[11px] ring-1 ring-primary/30 hover:ring-primary active:scale-95"
            >
              Tip 💸
            </button>
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-1.5 rounded-full transition-colors active:scale-95 ${isSaved ? 'text-foreground bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </article>

      <TipModal
        isOpen={isTipOpen}
        onClose={() => setIsTipOpen(false)}
        creatorName={creatorName}
      />
    </>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyFeed = () => (
  <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
      <Rss className="w-8 h-8 text-muted-foreground" />
    </div>
    <div>
      <h3 className="font-bold text-lg mb-1">Your feed is empty</h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        Subscribe to your favourite creators to start seeing their posts here in real-time.
      </p>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const LIMIT = 10;

const UserDashboard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!user || loading || !hasMore) return;
    setLoading(true);
    try {
      const newPosts = await getFanFeed(user.id, page, LIMIT);
      if (newPosts.length < LIMIT) setHasMore(false);
      setPosts(prev => [...prev, ...newPosts]);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, page, loading, hasMore]);

  // Initial load
  useEffect(() => {
    if (user) loadMore();
  }, [user]);

  // Realtime subscription for new creator posts
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const newPost = payload.new;
          // Fetch creator user details for the new post
          const { data: creator } = await supabase
            .from('users')
            .select('name, avatar')
            .eq('uid', newPost.creator_id)
            .single();

          const formattedPost = {
            ...newPost,
            users: creator || { name: 'Creator', avatar: null }
          };

          setPosts((prev) => [formattedPost, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <UserLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
          Your Feed
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Latest posts from creators you subscribe to
        </p>
      </div>

      {/* Feed — single column, IG-style */}
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        {posts.length === 0 && !loading && <EmptyFeed />}

        {posts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* End of feed message */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center text-xs text-muted-foreground py-8 font-medium tracking-wide">
            ✦ You're all caught up ✦
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
