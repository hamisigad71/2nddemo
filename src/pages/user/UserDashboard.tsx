import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Loader2, Rss, Send, CheckCircle2, Lock, Star, Megaphone, ArrowRight, Coins, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import TipModal from '../../components/TipModal';
import SubscribeModal from '../../components/SubscribeModal';
import PPVUnlockModal from '../../components/PPVUnlockModal';
import { useAuth } from '../../context/AuthContext';
import { getFanFeed, getPostLikes, toggleLike, getComments, addComment, getStoredCreatorProfile, getCreatorProfile, getPlatformAds, trackAdImpression, trackAdClick, type PlatformAd } from '../../lib/db';
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

const FeedPost = ({ post, currentUserId, priority = false, onPostUnlocked }: { post: any; currentUserId: string; priority?: boolean; onPostUnlocked?: (postId: string) => void }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [isPPVUnlockOpen, setIsPPVUnlockOpen] = useState(false);
  const [unlockedDirectly, setUnlockedDirectly] = useState(false);

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
  const shouldLockMedia = !unlockedDirectly && !post.media_access_granted && (isPpvPost || post.visibility === 'subscribers');
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
      <article className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col mb-4 sm:mb-6">

        {/* Creator Header */}
        <div
          onClick={() => navigate(profileRoute)}
          className="relative px-4 sm:px-5 py-3.5 w-full flex items-center justify-between gap-3 border-b border-border/50 bg-card select-none group/creator cursor-pointer transition-colors hover:bg-muted/20"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={creatorName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-primary/20 shadow-sm transition-all group-hover/creator:ring-primary/60"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-card shadow-sm" />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="font-black text-sm sm:text-base text-foreground flex items-center gap-1.5 leading-tight">
                <span className="truncate group-hover/creator:text-primary transition-colors">{creatorName}</span>
                {(post.isVerified || post.users?.isVerified) && (
                  <span title="Verified Creator" className="shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white fill-blue-500" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                <span className="truncate">{creatorHandle}</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="shrink-0 text-muted-foreground/80">{timeAgo}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!post.is_locked && !(post.visibility === 'subscribers' && post.media_access_granted) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSubscribeOpen(true);
                }}
                className="inline-flex items-center text-xs font-black text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 px-3.5 py-1.5 rounded-full shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
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
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors"
              title="View profile"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media */}
        {(post.media_url || shouldLockMedia) && (
          <div className={`relative bg-zinc-950 overflow-hidden group select-none flex items-center justify-center ${shouldLockMedia ? 'min-h-[360px] sm:min-h-[440px]' : 'w-full'}`}>
            {shouldLockMedia ? (
              <>
                {/* Ambient aesthetic blurred backdrop using locked video/media or creator avatar */}
                {post.media_url ? (
                  post.media_type === 'video' || post.media_url.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i) ? (
                    <video
                      src={post.media_url}
                      muted
                      playsInline
                      autoPlay
                      loop
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-125 opacity-70 pointer-events-none"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-70 pointer-events-none"
                      style={{ backgroundImage: `url(${post.media_url})` }}
                    />
                  )
                ) : (
                  <div 
                    className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-50 pointer-events-none"
                    style={{ backgroundImage: `url(${avatarUrl})` }}
                  />
                )}
                {/* Frosted glass blur overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-none" />

                {/* Secure Locked Paywall Card */}
                <div className="relative z-30 flex flex-col items-center justify-center p-4 text-center max-w-[320px] w-full">
                  <div className="backdrop-blur-xl bg-black/75 border border-white/20 rounded-2xl px-6 py-6 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col items-center w-full">
                    <div className="w-12 h-12 rounded-2xl bg-black/90 border border-red-500/50 flex items-center justify-center mb-3 shadow-lg text-red-500">
                      <Lock className="w-6 h-6" />
                    </div>

                    <p className="text-white font-black text-sm tracking-tight mb-1">
                      {isPpvPost ? 'Pay-Per-View Content' : 'Subscribers Only'}
                    </p>
                    <p className="text-zinc-300 text-xs mb-4 leading-relaxed">
                      {isPpvPost 
                        ? `Unlock this exclusive post for KES ${post.price || 0}.` 
                        : 'Join this creator’s VIP subscription to unlock all posts.'}
                    </p>

                    <button 
                      onClick={() => isPpvPost ? setIsPPVUnlockOpen(true) : setIsSubscribeOpen(true)}
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

        {/* ── Actions Bar ── */}
        <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between bg-card border-b border-border/40 select-none">
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Heart / Like Button with Inline Counter */}
            <button
              onClick={handleToggleLike}
              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-150 ease-out cursor-pointer active:scale-95 ${
                isLiked 
                  ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/15' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }`}
              title="Like"
            >
              <Heart
                className={`w-[18px] h-[18px] transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90 ${
                  isLiked ? 'fill-rose-500 text-rose-500 drop-shadow-[0_2px_8px_rgba(244,63,94,0.35)]' : ''
                }`}
              />
              <span className={`text-xs font-bold tabular-nums transition-colors ${
                isLiked ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-muted-foreground group-hover:text-foreground'
              }`}>
                {likesCount > 0 ? likesCount.toLocaleString() : 'Like'}
              </span>
            </button>

            {/* Comment Button with Inline Counter */}
            <button
              onClick={handleToggleComments}
              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-150 ease-out cursor-pointer active:scale-95 ${
                showComments 
                  ? 'bg-accent text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }`}
              title="Comment"
            >
              <MessageCircle className="w-[18px] h-[18px] transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90" />
              <span className="text-xs font-bold tabular-nums text-muted-foreground group-hover:text-foreground">
                {commentsCount > 0 ? commentsCount.toLocaleString() : 'Comment'}
              </span>
            </button>

            {/* Send Tip Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTipOpen(true)}
              className="h-8 px-3 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:border-emerald-500/40 text-[11px] font-bold tracking-tight gap-1.5 shadow-none hover:shadow-sm hover:shadow-emerald-500/10 active:scale-95 transition-all"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-500" />
              <span>Send Tip</span>
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-2 rounded-full transition-all duration-150 ease-out active:scale-90 cursor-pointer ${
                isSaved ? 'text-rose-500 bg-rose-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }`}
              title="Save Post"
            >
              <Bookmark className={`w-[18px] h-[18px] ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Caption & Interactions ── */}
        <div className="px-4 sm:px-5 py-3 bg-card space-y-2">
          {post.content && (
            <div className="text-[13px] sm:text-sm leading-relaxed text-foreground">
              <span
                onClick={() => navigate(profileRoute)}
                className="font-black text-foreground mr-2 hover:text-primary cursor-pointer transition-colors"
              >
                {creatorName}
              </span>
              <span className="text-foreground/90 font-normal selection:bg-rose-500/20">{post.content}</span>
            </div>
          )}

          {/* Quick comments link preview */}
          {commentsCount > 0 && !showComments && (
            <button
              onClick={handleToggleComments}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-0.5 cursor-pointer block font-medium"
            >
              View all {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
            </button>
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
      <PPVUnlockModal
        isOpen={isPPVUnlockOpen}
        onClose={() => setIsPPVUnlockOpen(false)}
        mediaItem={{
          id: post.id,
          type: post.media_type === 'video' || post.media_url?.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i) ? 'video' : 'image',
          url: post.media_url || '',
          title: post.content || 'Pay-Per-View Content',
          price: post.price || 500,
          isLocked: true,
          visibility: 'ppv'
        }}
        creatorName={creatorName}
        creatorId={post.creator_id}
        monthlyPrice={localProfile?.price_hr || 1000}
        onUnlocked={(mediaId) => {
          setUnlockedDirectly(true);
          try {
            const globalStored = localStorage.getItem("tgd_ppv_unlocked_global");
            const globalSet = new Set(globalStored ? JSON.parse(globalStored) : []);
            globalSet.add(mediaId);
            localStorage.setItem("tgd_ppv_unlocked_global", JSON.stringify(Array.from(globalSet)));

            if (currentUserId) {
              const userKey = `tgd_ppv_unlocked_${currentUserId}`;
              const userStored = localStorage.getItem(userKey);
              const userSet = new Set(userStored ? JSON.parse(userStored) : []);
              userSet.add(mediaId);
              localStorage.setItem(userKey, JSON.stringify(Array.from(userSet)));

              const vaultKey = `unlocked_ppv_${currentUserId}`;
              const vaultStored = localStorage.getItem(vaultKey);
              const vaultSet = new Set(vaultStored ? JSON.parse(vaultStored) : []);
              vaultSet.add(mediaId);
              localStorage.setItem(vaultKey, JSON.stringify(Array.from(vaultSet)));
            }
          } catch (err) {
            console.error("Error saving unlocked PPV items:", err);
          }
          if (onPostUnlocked) {
            onPostUnlocked(mediaId);
          }
        }}
        onSubscribeClick={() => {
          setIsPPVUnlockOpen(false);
          setIsSubscribeOpen(true);
        }}
      />
    </>
  );
};

// ─── Sponsored Ad Card Component ─────────────────────────────────────────────

const SponsoredFeedCard = ({ ad }: { ad: PlatformAd }) => {
  const navigate = useNavigate();

  useEffect(() => {
    trackAdImpression(ad.id);
  }, [ad.id]);

  const isCreatorAd = ad.ad_type === 'creator' || ad.category === 'creator_spotlight';
  const targetUrl = ad.cta_url || (ad.creator_id ? `/creator/${ad.creator_id}` : '/discover');

  return (
    <Card className="overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card text-card-foreground shadow-sm hover:shadow-xl transition-all duration-300 relative group/card">
      {/* Top Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between border-b border-border/60 bg-muted/30">
        <div 
          onClick={() => {
            trackAdClick(ad.id);
            navigate(targetUrl);
          }}
          className="flex items-center gap-3 cursor-pointer min-w-0 group/sponsor"
        >
          {ad.creator_avatar ? (
            <img 
              src={ad.creator_avatar} 
              alt={ad.sponsor_name} 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0 transition-transform duration-200 group-hover/sponsor:scale-105" 
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 text-xs shadow-inner">
              {ad.sponsor_name[0] || 'A'}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 truncate group-hover/sponsor:text-primary transition-colors">
              <span>{ad.sponsor_name}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0" />
            </div>
            <div className="text-[11px] text-muted-foreground font-normal truncate">
              {ad.creator_handle || 'Sponsored Promotion'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <Badge
            variant={isCreatorAd ? 'default' : 'rose'}
            className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-border/60"
          >
            {isCreatorAd ? (
              <Sparkles className="w-3 h-3 fill-current" />
            ) : (
              <Megaphone className="w-3 h-3 fill-current" />
            )}
            <span>{ad.badge || (isCreatorAd ? 'Sponsored' : 'Featured')}</span>
          </Badge>
        </div>
      </div>

      {/* Media Banner */}
      <div 
        onClick={() => {
          trackAdClick(ad.id);
          navigate(targetUrl);
        }}
        className="relative aspect-[16/10] overflow-hidden bg-muted cursor-pointer"
      >
        <img
          src={ad.image_url}
          alt={ad.title}
          className="w-full h-full object-cover group-hover/card:scale-[1.025] transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

        <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-5 sm:right-5 text-white pointer-events-none">
          <h4 className="text-sm sm:text-base font-bold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {ad.title}
          </h4>
        </div>
      </div>

      {/* Card Body & Call to Action */}
      <div className="p-4 sm:p-5 space-y-3.5">
        <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
          {ad.description}
        </p>

        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground font-medium truncate">
            Sponsored by <strong className="text-foreground font-semibold">{ad.sponsor_name}</strong>
          </div>

          <Button
            onClick={() => {
              trackAdClick(ad.id);
              navigate(targetUrl);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-11 cursor-pointer"
          >
            <span>{ad.cta_text || 'View Offer'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/card:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyFeed = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
      <Rss className="w-7 h-7 text-muted-foreground" />
    </div>
    <div>
      <h3 className="font-bold text-lg mb-1">Your feed is ready</h3>
      <p className="text-muted-foreground text-xs sm:text-sm max-w-xs">
        Check out the featured creators below and subscribe to start seeing their private posts in real-time.
      </p>
    </div>
  </div>
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const LIMIT = 30;

const UserDashboard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<PlatformAd[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Load platform sponsored ads for subscribers with real-time update listeners
  useEffect(() => {
    const loadAds = () => {
      getPlatformAds('users', false).then(ads => {
        setSponsoredAds(ads);
      }).catch(() => {});
    };
    loadAds();
    window.addEventListener('tgd_ads_updated', loadAds);
    window.addEventListener('storage', loadAds);
    return () => {
      window.removeEventListener('tgd_ads_updated', loadAds);
      window.removeEventListener('storage', loadAds);
    };
  }, []);

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
        {posts.length === 0 && !loading && (
          <>
            <EmptyFeed />
            {sponsoredAds.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Featured Creator Spotlight</span>
                </div>
                {sponsoredAds.slice(0, 2).map(ad => (
                  <SponsoredFeedCard key={ad.id} ad={ad} />
                ))}
              </div>
            )}
          </>
        )}

        {posts.map((post, index) => {
          const shouldInjectAd = sponsoredAds.length > 0 && (index + 1) % 3 === 0;
          const adIndex = Math.floor(index / 3) % sponsoredAds.length;
          const adToInject = shouldInjectAd ? sponsoredAds[adIndex] : null;

          return (
            <div key={post.id} className="contents">
              <FeedPost 
                post={post} 
                currentUserId={user?.id || ''} 
                priority={index < 2} 
                onPostUnlocked={(unlockedId) => {
                  setPosts(prev => prev.map(p => p.id === unlockedId ? { ...p, media_access_granted: true, is_locked: false } : p));
                }}
              />
              {adToInject && (
                <SponsoredFeedCard ad={adToInject} />
              )}
            </div>
          );
        })}

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
