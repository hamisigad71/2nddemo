import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Loader2, Rss, Send, CheckCircle2, Lock } from 'lucide-react';
import TipModal from '../../components/TipModal';
import SubscribeModal from '../../components/SubscribeModal';
import { useAuth } from '../../context/AuthContext';
import { getFanFeed, getPostLikes, toggleLike, getComments, addComment, getStoredCreatorProfile, getCreatorProfile } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { getEscorts } from '../../lib/mockData';
import FeedImage from '../../components/FeedImage';
import { resolveUserAvatar } from '../../lib/avatar';
import LiveNowTray from '../../components/LiveNowTray';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users?: { name: string; avatar: string | null };
}

// ─── Feed Post Component ──────────────────────────────────────────────────────

const feedProfileResolutionCache = new Map<string, { name: string; avatar: string | null }>();

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
  const localProfile = getStoredCreatorProfile(post.creator_id);
  const escort = getEscorts().find(e => e.id === post.creator_id);

  // Dynamic async resolution state if post initially loaded with generic "Creator"
  const [resolvedProfile, setResolvedProfile] = useState<{ name: string; avatar: string | null } | null>(() => {
    return (post.creator_id && feedProfileResolutionCache.get(post.creator_id)) || null;
  });

  useEffect(() => {
    const currentName = creator?.name || localProfile?.name || localProfile?.display_name || escort?.name;
    if (currentName && currentName !== 'Creator') return;

    if (!post.creator_id) return;

    const cached = feedProfileResolutionCache.get(post.creator_id);
    if (cached) {
      setResolvedProfile(cached);
      return;
    }

    let isMounted = true;
    getCreatorProfile(post.creator_id).then((prof) => {
      if (isMounted && prof && prof.name && prof.name !== 'Creator') {
        const resolvedData = {
          name: prof.name,
          avatar: prof.avatar || null,
        };
        feedProfileResolutionCache.set(post.creator_id, resolvedData);
        setResolvedProfile(resolvedData);

        // Also fix the local cache in tgd_all_posts so future renders keep the real creator name
        try {
          const cachedPosts = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
          let changed = false;
          const updated = cachedPosts.map((p: any) => {
            if (p.id === post.id && (!p.users?.name || p.users.name === 'Creator')) {
              changed = true;
              return {
                ...p,
                users: {
                  ...p.users,
                  name: prof.name,
                  avatar: prof.avatar || p.users?.avatar || null,
                }
              };
            }
            return p;
          });
          if (changed) {
            localStorage.setItem('tgd_all_posts', JSON.stringify(updated));
          }
        } catch {}
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [post.creator_id, post.id, creator?.name, localProfile?.name, escort?.name]);

  const creatorName = (resolvedProfile?.name && resolvedProfile.name !== 'Creator' ? resolvedProfile.name : null)
    || (creator?.name && creator.name !== 'Creator' ? creator.name : null)
    || (localProfile?.name && localProfile.name !== 'Creator' ? localProfile.name : null)
    || localProfile?.display_name
    || escort?.name
    || 'Creator';

  const avatarUrl = resolveUserAvatar(
    resolvedProfile?.avatar || creator?.avatar || localProfile?.avatar || localProfile?.avatar_url || escort?.avatar,
    creatorName
  );

  const creatorHandle = escort
    ? `@${escort.name.replace(/\s+/g, '').toLowerCase()}`
    : `@${creatorName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'creator'}`;

  const profileRoute = `/creator/${post.creator_id || escort?.id || 'escort-1'}`;
  const isPpvPost = post.visibility === 'ppv' || post.is_locked;
  const shouldLockMedia = !post.media_access_granted && (isPpvPost || post.visibility === 'subscribers');
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
      <article className="bg-card border border-border overflow-hidden shadow-sm flex flex-col transition-all duration-300 hover:border-border/80 -mx-1 sm:mx-0 rounded-3xl sm:rounded-[20px]">

        {/* Single creator header */}
        <div
          onClick={() => navigate(profileRoute)}
          className="relative h-20 sm:h-24 w-full overflow-hidden cursor-pointer group/creator border-b border-border bg-card select-none"
        >
          <div className="relative z-10 h-full flex items-center justify-between gap-3 px-4 sm:px-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={avatarUrl}
                  alt={creatorName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-border shadow-md transition-all group-hover/creator:ring-primary/50"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm sm:text-base text-foreground flex items-center gap-1 drop-shadow-sm">
                  <span className="truncate">{creatorName}</span>
                  <CheckCircle2 className="w-4 h-4 text-white fill-blue-500 shrink-0" />
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{creatorHandle}</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">{timeAgo}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!post.is_locked && !(post.visibility === 'subscribers' && post.media_access_granted) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSubscribeOpen(true);
                  }}
                  className="inline-flex items-center text-[10px] sm:text-[11px] font-black text-white bg-red-600 hover:bg-red-500 border border-red-500/80 px-2.5 sm:px-3 py-1.5 rounded-full shadow-[0_2px_10px_rgba(220,38,38,0.4)] transition-all active:scale-95 cursor-pointer"
                >
                  Subscribe
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(profileRoute);
                }}
                className="p-1.5 text-zinc-300 hover:text-white transition-colors"
                title="View profile"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Media */}
        {(post.media_url || shouldLockMedia) && (
          <div className="relative bg-black overflow-hidden group select-none min-h-[320px] sm:min-h-[400px] flex items-center justify-center">
            {shouldLockMedia ? (
              <>
                {/* Safe ambient backdrop using creator avatar/cover only, never secret locked media */}
                <div 
                  className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-125 pointer-events-none"
                  style={{ backgroundImage: `url(${avatarUrl})` }}
                />
                <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm pointer-events-none" />

                {/* Secure Locked Paywall Card - raw media tag is completely unmounted */}
                <div className="relative z-30 flex flex-col items-center justify-center p-4 text-center max-w-[300px] w-full">
                  <div className="backdrop-blur-md bg-black/85 border border-white/15 rounded-2xl px-6 py-6 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col items-center w-full">
                    <div className="w-12 h-12 rounded-2xl bg-black/90 border border-red-500/50 flex items-center justify-center mb-3 shadow-lg text-red-500">
                      <Lock className="w-6 h-6" />
                    </div>

                    <p className="text-white font-black text-sm tracking-tight mb-1">
                      {isPpvPost ? 'Pay-Per-View Content' : 'Subscribers Only'}
                    </p>
                    <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
                      {isPpvPost 
                        ? `Unlock this exclusive post for KES ${post.price || 0}.` 
                        : 'Join this creator’s VIP subscription to unlock all posts.'}
                    </p>

                    <button 
                      onClick={() => isPpvPost ? navigate(profileRoute) : setIsSubscribeOpen(true)}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wider uppercase py-2.5 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/30 cursor-pointer"
                    >
                      {isPpvPost ? `Unlock for KES ${post.price || 0}` : 'Subscribe to Unlock'}
                    </button>
                  </div>
                </div>
              </>
            ) : post.media_url ? (
              <FeedImage
                src={post.media_url}
                alt="post"
                priority={priority}
                isLocked={false}
              />
            ) : (
              <div className="w-full min-h-[320px] sm:min-h-[400px] bg-zinc-900 flex items-center justify-center">
                <Lock className="w-8 h-8 text-zinc-600" />
              </div>
            )}
          </div>
        )}

        {/* ── Actions Bar Matching OnlyFans Screenshot ── */}
        <div className="px-4 sm:px-5 py-3 flex items-center justify-between bg-card border-b border-border/50">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Heart / Like */}
            <button
              onClick={handleToggleLike}
              className={`transition-all active:scale-75 cursor-pointer ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
              title="Like"
            >
              <Heart className={`w-6 h-6 transition-transform ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'group-hover:scale-105'}`} />
            </button>

            {/* Comment */}
            <button
              onClick={handleToggleComments}
              className={`flex items-center gap-1.5 transition-all active:scale-75 cursor-pointer ${showComments ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Comment"
            >
              <MessageCircle className="w-6 h-6" />
              {commentsCount > 0 && <span className="text-xs font-bold">{commentsCount}</span>}
            </button>

            {/* $ SEND TIP pill button */}
            <button
              onClick={() => setIsTipOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-black tracking-wider uppercase transition-all hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] active:scale-95 cursor-pointer"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-black">$</span>
              <span>SEND TIP</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${isSaved ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
              title="Save Post"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Like Counter & Caption ── */}
        <div className="px-4 sm:px-5 pt-3 pb-4 bg-card flex flex-col gap-1.5">
          <div className="text-xs font-black text-foreground tracking-wide">
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </div>

          {post.content && (
            <p className="text-[13px] leading-relaxed text-foreground/90">
              <span
                onClick={() => navigate(profileRoute)}
                className="font-black text-foreground mr-2 hover:text-red-500 cursor-pointer transition-colors"
              >
                {creatorName}
              </span>
              {post.content}
            </p>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-border/50 px-5 py-4 flex flex-col gap-3">
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
                  const commenterName = (c.user_id === currentUserId
                    ? (localStorage.getItem(`tgd_user_name_${currentUserId}`) || c.users?.name)
                    : c.users?.name) || 'User';
                  const rawAvatar = c.user_id === currentUserId
                    ? (localStorage.getItem(`tgd_user_avatar_${currentUserId}`) || c.users?.avatar)
                    : c.users?.avatar;
                  const commenterAvatar = resolveUserAvatar(rawAvatar, commenterName);
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
    const handlePostsUpdated = (e: any) => {
      const deletedId = e?.detail?.postId;
      if (deletedId) {
        setPosts(prev => prev.filter(p => p.id !== deletedId));
      }
      const fanId = user?.id || '';
      getFanFeed(fanId, 0, LIMIT).then(freshPosts => {
        if (freshPosts) {
          setPosts(freshPosts);
        }
      });
    };

    window.addEventListener('posts_updated', handlePostsUpdated);
    window.addEventListener('post_deleted', handlePostsUpdated);

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
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setPosts(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('posts_updated', handlePostsUpdated);
      window.removeEventListener('post_deleted', handlePostsUpdated);
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
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-100 mb-1">
          Your Feed
        </h1>
        <p className="text-zinc-500 text-sm">
          Latest posts from creators you subscribe to
        </p>
      </div>

      {/* Live Broadcasts Stories Tray */}
      <div className="max-w-xl mx-auto mb-8">
        <LiveNowTray />
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
