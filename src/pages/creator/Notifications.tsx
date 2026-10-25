import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import CreatorLayout from '../../components/CreatorLayout';
import { 
  DollarSign, 
  MessageCircle, 
  Heart, 
  UserPlus, 
  Bell, 
  CheckCheck, 
  Film, 
  Loader2,
  Inbox,
  Star,
  ArrowUpRight,
  Check,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, type NotificationItem } from '../../lib/db';
import { toast } from '../../context/ToastContext';
import { formatTimeAgo } from '../../lib/dateUtils';

function extractInitials(title?: string, message?: string): string {
  const combined = `${title || ''} ${message || ''}`;
  const match = combined.match(/New Creator Joined:?\s*([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/i)
    || combined.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+))/);
  if (match && match[1]) {
    const parts = match[1].trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return 'VIP';
}

function getNotificationMeta(type?: string) {
  switch (type) {
    case 'creator':
      return {
        icon: Star,
        iconColor: 'text-amber-400',
        badgeBg: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
        label: 'Creator spotlight',
        category: 'All',
        actionLabel: 'View profile',
        actionUrl: undefined
      };
    case 'subscription':
      return {
        icon: UserPlus,
        iconColor: 'text-rose-400',
        badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        label: 'VIP subscriber',
        category: 'Subscribers',
        actionLabel: 'View fan list',
        actionUrl: '/fans'
      };
    case 'tip':
      return {
        icon: DollarSign,
        iconColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        label: 'Cash tip',
        category: 'Tips',
        actionLabel: 'Open wallet',
        actionUrl: '/wallet'
      };
    case 'ppv':
      return {
        icon: Film,
        iconColor: 'text-purple-400',
        badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
        label: 'PPV unlock',
        category: 'PPV',
        actionLabel: 'Open media vault',
        actionUrl: '/vault'
      };
    case 'comment':
      return {
        icon: MessageCircle,
        iconColor: 'text-sky-400',
        badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
        label: 'Post comment',
        category: 'Comments',
        actionLabel: 'View in feed',
        actionUrl: '/creator/feed'
      };
    case 'like':
      return {
        icon: Heart,
        iconColor: 'text-rose-400',
        badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        label: 'Fan reaction',
        category: 'Likes',
        actionLabel: 'View in feed',
        actionUrl: '/creator/feed'
      };
    default:
      return {
        icon: Bell,
        iconColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        label: 'Platform alert',
        category: 'All',
        actionLabel: undefined,
        actionUrl: undefined
      };
  }
}

const Notifications = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await getUserNotifications(user.id);
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();

    const handleUpdate = () => {
      fetchNotifs();
    };

    window.addEventListener('notifications_updated', handleUpdate);
    return () => {
      window.removeEventListener('notifications_updated', handleUpdate);
    };
  }, [user?.id]);

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read.');
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleItemRead = async (notificationId: string) => {
    if (!user?.id) return;
    try {
      await markNotificationAsRead(notificationId, user.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user?.id) return;
    try {
      await deleteNotification(notificationId, user.id);
      setNotifications(prev => prev.filter(item => item.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: notifications.length,
      Subscribers: 0,
      Tips: 0,
      PPV: 0,
      Comments: 0,
      Likes: 0,
    };
    notifications.forEach(item => {
      const meta = getNotificationMeta(item.type);
      if (counts[meta.category] !== undefined) {
        counts[meta.category]++;
      }
    });
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'All') return notifications;
    return notifications.filter(item => {
      const meta = getNotificationMeta(item.type);
      return meta.category.toLowerCase() === activeFilter.toLowerCase();
    });
  }, [notifications, activeFilter]);

  return (
    <CreatorLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        
        {/* Editorial Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Bell className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Creator Dispatches
              </h1>
              {unreadCount > 0 ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 tabular-nums">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                  All caught up
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
              Real-time feed of new subscriber memberships, M-Pesa cash tips, and private PPV unlocks.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3.5 py-2 rounded-xl transition-all active:scale-95"
            >
              <CheckCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Mark all as read</span>
            </button>
          )}
        </header>

        {/* Low-profile Segment Navigation */}
        <nav aria-label="Notification filters" className="flex items-center gap-1.5 p-1 bg-zinc-950/70 border border-white/[0.08] rounded-xl overflow-x-auto scrollbar-hide">
          {['All', 'Subscribers', 'Tips', 'PPV', 'Comments', 'Likes'].map((tab) => {
            const isActive = activeFilter === tab;
            const count = tabCounts[tab] || 0;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 ${
                  isActive 
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-semibold ${
                    isActive ? 'bg-zinc-950/15 text-zinc-950' : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Notifications Stream */}
        <main className="space-y-3">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-500 gap-3 bg-[#111217] rounded-2xl border border-white/[0.06]">
              <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
              <p className="text-xs font-medium text-zinc-400">Loading dispatches...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-14 text-center text-zinc-500 bg-[#111217] rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center">
              <div className="w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3.5 text-zinc-400">
                <Inbox className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-sm text-zinc-200">No dispatches in this category</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">
                When fans subscribe to your VIP tier, tip you via M-Pesa, or purchase Pay-Per-View items, events will appear here instantly.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const meta = getNotificationMeta(item.type);
              const IconComponent = meta.icon;
              const isUnread = !item.is_read;
              const isNewCreator = item.type === 'creator' || /new creator|welcome.*creator|joined/i.test(`${item.title} ${item.message}`) || item.badge === 'New Creator';
              const isLive = /live|broadcast/i.test(`${item.title} ${item.message}`) || item.badge?.includes('LIVE');
              const isVideo = /video|reel|clip/i.test(`${item.title} ${item.message}`) || item.badge?.includes('Video');

              // Badge styling and text
              const badgeLabel = isNewCreator 
                ? 'Creator Spotlight' 
                : isLive 
                  ? 'Live Broadcast' 
                  : isVideo 
                    ? 'New Video' 
                    : (item.badge || meta.label);

              const badgePillClass = isNewCreator
                ? 'bg-amber-400/10 text-amber-300 border-amber-400/25'
                : isLive
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : isVideo
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/25'
                    : meta.badgeBg;

              // Action link and label
              const targetUrl = item.action_url || item.link || meta.actionUrl;
              const targetLabel = item.action_label || meta.actionLabel || (isNewCreator ? 'View Profile' : isLive ? 'Join Live' : isVideo ? 'Watch Video' : 'View in feed');

              return (
                <article
                  key={item.id} 
                  className={`relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-start gap-4 group ${
                    isUnread 
                      ? 'bg-gradient-to-r from-amber-500/[0.03] via-[#14151e] to-[#101117] border-amber-500/25 shadow-[0_4px_24px_-8px_rgba(217,119,6,0.12)]'
                      : 'bg-[#101116]/80 border-white/[0.06] hover:border-white/[0.12] hover:bg-[#13141c]'
                  }`}
                >
                  <button
                    type="button"
                    aria-label="Delete notification"
                    onClick={() => handleDeleteNotification(item.id)}
                    className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-black/20 text-zinc-400 transition hover:border-rose-500/40 hover:text-rose-300"
                  >
                    <span className="text-lg leading-none">×</span>
                  </button>

                  {/* Category / Creator Avatar Icon */}
                  <div className="shrink-0 self-start">
                    {item.avatar ? (
                      <div className="relative">
                        <img
                          src={item.avatar}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 shadow-sm"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 bg-[#0e0e12] p-0.5 rounded-full ring-1 ring-white/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 fill-amber-500/20" />
                        </div>
                      </div>
                    ) : isNewCreator ? (
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/25 via-amber-600/15 to-zinc-900 border border-amber-500/30 flex items-center justify-center text-amber-200 font-serif font-bold text-sm tracking-wider shadow-inner">
                          {extractInitials(item.title, item.message)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-[#0e0e12] p-1 rounded-full ring-1 ring-amber-500/30 flex items-center justify-center">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white">
                        <IconComponent className={`w-5 h-5 ${meta.iconColor}`} strokeWidth={1.8} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md border ${badgePillClass}`}>
                        {badgeLabel}
                      </span>

                      {isUnread && (
                        <span className="relative flex h-2 w-2 shrink-0" title="Unread notification">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                        </span>
                      )}

                      <h2 className={`text-sm font-semibold tracking-tight transition-colors ${
                        isUnread ? 'text-white' : 'text-zinc-200'
                      }`}>
                        {item.title}
                      </h2>

                      <time
                        dateTime={item.created_at}
                        className="text-zinc-500 text-xs tabular-nums sm:ml-auto"
                      >
                        {formatTimeAgo(item.created_at)}
                      </time>
                    </div>

                    <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed max-w-2xl">
                      {item.message}
                    </p>

                    {/* Quick action buttons */}
                    <div className="pt-2 flex items-center gap-3 flex-wrap">
                      {targetUrl && (
                        <Link
                          to={targetUrl}
                          onClick={() => {
                            if (isUnread) handleItemRead(item.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-100 bg-white/[0.06] hover:bg-white/[0.12] hover:text-white border border-white/[0.12] hover:border-amber-400/40 px-3.5 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm"
                        >
                          <span>{targetLabel}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-300" />
                        </Link>
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => handleItemRead(item.id)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Mark as read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </main>

      </div>
    </CreatorLayout>
  );
};

export default Notifications;
