import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Loader2, Rss, Send, CheckCircle2 } from 'lucide-react';
import TipModal from '../../components/TipModal';
import SubscribeModal from '../../components/SubscribeModal';
import { useAuth } from '../../context/AuthContext';
import { getFanFeed, getPostLikes, toggleLike, getComments, addComment } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { getEscorts } from '../../lib/mockData';
import FeedImage from '../../components/FeedImage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users?: { name: string; avatar: string | null };
}

// ─── Feed Post Component ──────────────────────────────────────────────────────

const FeedPost = ({ post, currentUserId, priority = false }: { post: any; currentUserId: string; priority?: boolean }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);

  // Comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  const creator = post.users;
  const avatarUrl = creator?.avatar || `https://i.pravatar.cc/150?u=${post.creator_id}`;
  const creatorName = creator?.name || 'Creator';

  // Find corresponding escort/creator profile for banner & cover
  const escort = getEscorts().find(e => e.id === post.creator_id || (e.name && e.name.toLowerCase().includes(creatorName.toLowerCase().replace(/[^a-z]/g, ''))));
  const coverUrl = escort?.cover_image || post.media_url || avatarUrl;
  const creatorHandle = escort ? `@${escort.name.replace(/\s+/g, '').toLowerCase()}` : `@${creatorName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'creator'}`;
  const profileRoute = `/creator/${escort?.id || post.creator_id || 'escort-1'}`;
  const formatPostTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const datePart = date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    const timePart = date.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} · ${timePart}`;
  };
  const timeAgo = formatPostTime(post.created_at);

  // Load real like state on mount
  useEffect(() => {
    if (!post.id || post.id.startsWith('demo-')) return;
    getPostLikes(post.id, currentUserId).then(({ count, userHasLiked }) => {
      setLikesCount(count);
      setIsLiked(userHasLiked);
    });
  }, [post.id, currentUserId]);

  // Load comment count on mount
  useEffect(() => {
    if (!post.id || post.id.startsWith('demo-')) {
      setCommentsCount(post.likes_count ? Math.floor(post.likes_count / 5) : 0);
      return;
    }
    getComments(post.id).then((data) => setCommentsCount(data.length));
  }, [post.id]);

  const handleToggleLike = async () => {
    if (!currentUserId || post.id.startsWith('demo-')) {
      setIsLiked(v => !v);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      return;
    }
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    await toggleLike(post.id, currentUserId, !newLiked);
  };

  const handleToggleComments = async () => {
    setShowComments(v => !v);
    if (!showComments && comments.length === 0 && !post.id.startsWith('demo-')) {
      setLoadingComments(true);
      const data = await getComments(post.id);
      setComments(data);
      setCommentsCount(data.length);
      setLoadingComments(false);
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !currentUserId || post.id.startsWith('demo-')) return;
    setSendingComment(true);
    try {
      const newComment = await addComment(post.id, currentUserId, commentText.trim());
      setComments(prev => [...prev, newComment]);
      setCommentsCount(prev => prev + 1);
      setCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <>
      <article className="bg-zinc-950 border border-white/[0.06] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300 hover:border-white/10 -mx-1 sm:mx-0 rounded-3xl sm:rounded-[20px]">

        {/* Top Header */}
        <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between bg-zinc-950/90 border-b border-white/5">
          <div
            onClick={() => navigate(profileRoute)}
            className="flex items-center gap-3 cursor-pointer group/header"
          >
            <div className="relative">
              <img
                src={avatarUrl}
                alt={creatorName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500/50 ring-offset-2 ring-offset-zinc-950 group-hover/header:ring-red-500 transition-all"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black" />
            </div>
            <div>
              <div className="font-bold text-[14px] text-white leading-tight tracking-tight flex items-center gap-1 group-hover/header:text-red-400 transition-colors">
                <span>{creatorName}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-white fill-blue-500" />
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{timeAgo}</div>
            </div>
          </div>
          <button
            onClick={() => navigate(profileRoute)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            title="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Media */}
        {post.media_url && (
          <div className="relative bg-black overflow-hidden group">
            <FeedImage
              src={post.media_url}
              alt="post"
              priority={priority}
              isLocked={post.is_locked}
            />
            {post.is_locked && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 text-center bg-black/30 backdrop-blur-[2px]">
                <div className="backdrop-blur-md bg-black/80 border border-white/15 rounded-2xl px-6 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col items-center max-w-[280px] w-full">
                  <div className="w-12 h-12 rounded-2xl bg-black/90 border border-red-500/50 flex items-center justify-center mb-3 shadow-lg text-red-500">
                    <span className="text-xl">🔒</span>
                  </div>

                  <p className="text-white font-black text-sm tracking-tight mb-0.5">
                    Subscribe to Unlock
                  </p>
                  <p className="text-zinc-400 text-[11px] mb-4">
                    VIP Sneak Peek · Subscriber Exclusive
                  </p>

                  <button 
                    onClick={() => setIsSubscribeOpen(true)}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wider uppercase py-2.5 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/30 cursor-pointer"
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Enticing Creator Mini-Profile Banner Card (OnlyFans Style) ── */}
        <div
          onClick={() => navigate(profileRoute)}
          className="relative h-20 sm:h-24 w-full overflow-hidden cursor-pointer group/creator border-y border-white/10 select-none"
        >
          {/* Creator cover photo background */}
          <img
            src={coverUrl}
            alt="Creator cover"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/creator:scale-105"
          />
          {/* Dark gradient overlay so avatar & text contrast beautifully */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/40 backdrop-blur-[0.5px]" />

          {/* Banner items */}
          <div className="relative z-10 h-full flex items-center justify-between px-4 sm:px-5">
            <div className="flex items-center gap-3.5">
              {/* Large circular avatar with online status badge */}
              <div className="relative shrink-0">
                <img
                  src={avatarUrl}
                  alt={creatorName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-white/30 shadow-2xl transition-all duration-300 group-hover/creator:ring-red-500 group-hover/creator:scale-105"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              </div>

              <div>
                <div className="font-black text-base sm:text-lg text-white flex items-center gap-1.5 drop-shadow group-hover/creator:text-red-400 transition-colors">
                  <span>{creatorName}</span>
                  <CheckCircle2 className="w-4 h-4 text-white fill-blue-500 shrink-0" />
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 font-medium drop-shadow-sm">
                  {creatorHandle}
                </p>
              </div>
            </div>

            {/* Right side: View profile pill button */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-white bg-black/60 border border-white/20 hover:border-red-500/60 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-md transition-all group-hover/creator:bg-red-600 group-hover/creator:border-red-600">
                View Profile →
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(profileRoute);
                }}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                title="Profile Options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Actions Bar Matching OnlyFans Screenshot ── */}
        <div className="px-4 sm:px-5 py-3 flex items-center justify-between bg-zinc-950 border-b border-white/5">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Heart / Like */}
            <button
              onClick={handleToggleLike}
              className={`transition-all active:scale-75 cursor-pointer ${isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
              title="Like"
            >
              <Heart className={`w-6 h-6 transition-transform ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'group-hover:scale-105'}`} />
            </button>

            {/* Comment */}
            <button
              onClick={handleToggleComments}
              className={`flex items-center gap-1.5 transition-all active:scale-75 cursor-pointer ${showComments ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
              title="Comment"
            >
              <MessageCircle className="w-6 h-6" />
              {commentsCount > 0 && <span className="text-xs font-bold">{commentsCount}</span>}
            </button>

            {/* $ SEND TIP pill button */}
            <button
              onClick={() => setIsTipOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white border border-white/15 text-xs font-black tracking-wider uppercase transition-all hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] active:scale-95 cursor-pointer"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">$</span>
              <span>SEND TIP</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!post.is_locked && (
              <button
                onClick={() => setIsSubscribeOpen(true)}
                className="hidden sm:flex bg-red-600 hover:bg-red-500 text-white transition-all rounded-full px-4 py-1.5 font-black text-xs shadow-[0_2px_12px_rgba(220,38,38,0.35)] active:scale-95 tracking-wide items-center gap-1 cursor-pointer"
              >
                Subscribe
              </button>
            )}
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${isSaved ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
              title="Save Post"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Like Counter & Caption ── */}
        <div className="px-4 sm:px-5 pt-3 pb-4 bg-zinc-950 flex flex-col gap-1.5">
          <div className="text-xs font-black text-white tracking-wide">
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </div>

          {post.content && (
            <p className="text-[13px] leading-relaxed text-zinc-300">
              <span
                onClick={() => navigate(profileRoute)}
                className="font-black text-white mr-2 hover:text-red-400 cursor-pointer transition-colors"
              >
                {creatorName}
              </span>
              {post.content}
            </p>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-white/[0.06] px-5 py-4 flex flex-col gap-3">
            {/* Existing comments */}
            {loadingComments ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-2">No comments yet. Be the first!</p>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto">
                {comments.map(c => {
                  const commenterAvatar = c.users?.avatar || `https://i.pravatar.cc/60?u=${c.user_id}`;
                  const commenterName = c.users?.name || 'User';
                  return (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <img
                        src={commenterAvatar}
                        alt={commenterName}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                        <span className="font-semibold text-xs text-zinc-200 mr-1.5">{commenterName}</span>
                        <span className="text-xs text-zinc-400">{c.content}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New comment input */}
            <div className="flex items-center gap-2 mt-1">
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 placeholder:text-zinc-600 transition-all"
              />
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || sendingComment}
                className="p-2 bg-yellow-500 text-black rounded-full disabled:opacity-30 hover:bg-yellow-400 active:scale-95 transition-all"
              >
                {sendingComment
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
        )}
      </article>

      <TipModal
        isOpen={isTipOpen}
        onClose={() => setIsTipOpen(false)}
        creatorName={creatorName}
        creatorId={post.creator_id}
      />
      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        creatorName={creatorName}
        creatorId={post.creator_id}
        price={post.price || 1000}
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

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const LIMIT = 30;

const UserDashboard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const fanId = user?.id || '';
      const newPosts = await getFanFeed(fanId, page, LIMIT);
      if (newPosts.length < LIMIT) setHasMore(false);
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = newPosts.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      setPage(prev => prev + 1);
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, loading, hasMore]);

  useEffect(() => {
    loadMore();
  }, [user?.id]);

  // Realtime & local post updates
  useEffect(() => {
    const handlePostsUpdated = () => {
      const fanId = user?.id || '';
      getFanFeed(fanId, 0, LIMIT).then(freshPosts => {
        if (freshPosts && freshPosts.length > 0) {
          setPosts(freshPosts);
        }
      });
    };

    window.addEventListener('posts_updated', handlePostsUpdated);

    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const newPost = payload.new;
          const { data: creator } = await supabase
            .from('users')
            .select('name, avatar')
            .eq('uid', newPost.creator_id)
            .maybeSingle();
          setPosts(prev => [{ ...newPost, users: creator || { name: 'Creator', avatar: null } }, ...prev.filter(p => p.id !== newPost.id)]);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('posts_updated', handlePostsUpdated);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const rootContainer = sentinel.closest('main');
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: rootContainer, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-100 mb-1">
          Your Feed
        </h1>
        <p className="text-zinc-500 text-sm">
          Latest posts from creators you subscribe to
        </p>
      </div>

      <div className="max-w-xl mx-auto flex flex-col gap-5">
        {posts.length === 0 && !loading && <EmptyFeed />}

        {posts.map((post, index) => (
          <FeedPost key={post.id} post={post} currentUserId={user?.id || ''} priority={index < 2} />
        ))}

        <div ref={sentinelRef} className="h-4" />

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
          </div>
        )}

        {hasMore && !loading && posts.length > 0 && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMore}
              className="text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-white/10 hover:border-white/20 rounded-full px-5 py-2 transition-all active:scale-95"
            >
              Load more posts
            </button>
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="text-center text-xs text-zinc-600 py-8 tracking-wide">
            You're all caught up
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
