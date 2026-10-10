import { useState, useEffect, useRef, useCallback } from 'react';
import UserLayout from '../../components/UserLayout';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Loader2, Rss, Send } from 'lucide-react';
import TipModal from '../../components/TipModal';
import SubscribeModal from '../../components/SubscribeModal';
import { useAuth } from '../../context/AuthContext';
import { getFanFeed, getPostLikes, toggleLike, getComments, addComment, getUserProfile } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users?: { name: string; avatar: string | null };
}

// ─── Feed Post Component ──────────────────────────────────────────────────────

const FeedPost = ({ post, currentUserId }: { post: any; currentUserId: string }) => {
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

  const creator = post.users;
  const avatarUrl = creator?.avatar || `https://i.pravatar.cc/150?u=${post.creator_id}`;
  const creatorName = creator?.name || 'Creator';
  const timeAgo = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
    : '';

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
      <article className="bg-zinc-950 border border-white/[0.06] rounded-[20px] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300 hover:border-white/10">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-zinc-950/80 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={avatarUrl}
                alt={creatorName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500/50 ring-offset-2 ring-offset-zinc-950"
              />
            </div>
            <div>
              <div className="font-semibold text-[14px] text-white leading-tight tracking-tight">{creatorName}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{timeAgo}</div>
            </div>
          </div>
          <button className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-full transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Media */}
        {post.media_url && (
          <div className="relative bg-black overflow-hidden group">
            <img
              src={post.media_url}
              alt="post"
              referrerPolicy="no-referrer"
              className={`w-full object-cover max-h-[600px] transition-transform duration-700 ${post.is_locked ? 'scale-105 filter blur-lg opacity-80' : ''}`}
            />
            {post.is_locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md bg-black/40 px-6 text-center">
                {/* Sleek Lock Badge without glow */}
                <div className="w-14 h-14 rounded-2xl bg-black/70 border border-red-500/40 flex items-center justify-center mb-4">
                  <span className="text-xl">🔒</span>
                </div>

                <p className="text-white font-bold text-base tracking-tight mb-5">
                  Subscribe to unlock
                </p>

                {/* Solid Red Button */}
                <button 
                  onClick={() => setIsSubscribeOpen(true)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide py-2.5 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Subscribe
                </button>
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        {post.content && (
          <div className="px-5 py-4 bg-zinc-950/50">
            <p className="text-[13px] leading-relaxed text-zinc-300">
              <span className="font-semibold text-white mr-1.5">{creatorName}</span>
              {post.content}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-3.5 flex items-center justify-between border-t border-white/10 bg-zinc-950/90 mt-auto">
          <div className="flex items-center gap-5">
            {/* Like */}
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 transition-all group ${isLiked ? 'text-red-500' : 'text-zinc-400'}`}
            >
              <Heart className={`w-[18px] h-[18px] transition-transform active:scale-75 ${isLiked ? 'fill-red-500 text-red-500' : 'group-hover:text-white'}`} />
              <span className="text-xs font-semibold">{likesCount}</span>
            </button>

            {/* Comment toggle */}
            <button
              onClick={handleToggleComments}
              className={`flex items-center gap-1.5 transition-all group ${showComments ? 'text-white' : 'text-zinc-400'}`}
            >
              <MessageCircle className={`w-[18px] h-[18px] ${showComments ? 'text-white' : 'group-hover:text-white'}`} />
              <span className="text-xs font-semibold">{commentsCount}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTipOpen(true)}
              className="text-white hover:bg-white/10 transition-all rounded-full px-3.5 py-1.5 font-medium text-[12px] border border-white/20 active:scale-95"
            >
              Tip 💸
            </button>
            {!post.is_locked && (
              <button
                onClick={() => setIsSubscribeOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white transition-all rounded-full px-4 py-1.5 font-bold text-[12px] shadow-[0_2px_12px_rgba(220,38,38,0.3)] active:scale-95 tracking-wide flex items-center gap-1"
              >
                Subscribe <span className="text-[10px]">⭐</span>
              </button>
            )}
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-1.5 rounded-full transition-all active:scale-90 ${isSaved ? 'text-red-500' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <Bookmark className={`w-[18px] h-[18px] ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
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
        price={post.price || 500}
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

const LIMIT = 10;

const UserDashboard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [kycStatus, setKycStatus] = useState<string>('verified'); // Default verified to avoid flash, then update

  useEffect(() => {
    if (user?.id) {
      getUserProfile(user.id).then(profile => {
        setKycStatus(profile?.kyc_status || 'unverified');
      });
    }
  }, [user]);

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

  useEffect(() => {
    if (user) loadMore();
  }, [user]);

  // Realtime: new post arrives
  useEffect(() => {
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
            .single();
          setPosts(prev => [{ ...newPost, users: creator || { name: 'Creator', avatar: null } }, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Infinite scroll
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
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-100 mb-1">
          Your Feed
        </h1>
        <p className="text-zinc-500 text-sm">
          Latest posts from creators you subscribe to
        </p>
      </div>

      {kycStatus !== 'verified' && (
        <div className="mb-8 bg-black/40 border border-red-500/30 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-[0_0_30px_rgba(220,38,38,0.1)]">
           <div>
             <h3 className="font-bold text-red-500 flex items-center gap-2 mb-1">
               <ShieldAlert className="w-5 h-5" /> Verification Required
             </h3>
             <p className="text-sm text-zinc-400">To access premium features like subscribing and tipping, please complete your identity verification.</p>
           </div>
           <Link to="/user/settings" className="shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]">
             Verify Now
           </Link>
        </div>
      )}

      <div className="max-w-xl mx-auto flex flex-col gap-5">
        {posts.length === 0 && !loading && <EmptyFeed />}

        {posts.map((post) => (
          <FeedPost key={post.id} post={post} currentUserId={user?.id || ''} />
        ))}

        <div ref={sentinelRef} className="h-4" />

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
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
