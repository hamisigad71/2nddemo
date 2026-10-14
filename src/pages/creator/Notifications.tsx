import CreatorLayout from '../../components/CreatorLayout';
import { 
  DollarSign, 
  MessageCircle, 
  Heart, 
  UserPlus, 
  Bell, 
  CheckCheck, 
  Film, 
  ChevronRight, 
  Loader2,
  Inbox
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, type NotificationItem } from '../../lib/db';
import { toast } from '../../context/ToastContext';

function formatTimeAgo(dateStr: string) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function getNotificationMeta(type?: string) {
  switch (type) {
    case 'subscription':
      return {
        icon: UserPlus,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
        badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        category: 'Subscribers'
      };
    case 'tip':
      return {
        icon: DollarSign,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        category: 'Tips'
      };
    case 'ppv':
      return {
        icon: Film,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
        badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
        category: 'PPV'
      };
    case 'comment':
      return {
        icon: MessageCircle,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
        badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
        category: 'Comments'
      };
    case 'like':
      return {
        icon: Heart,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
        badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        category: 'Likes'
      };
    default:
      return {
        icon: Bell,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        category: 'All'
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

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.is_read && user?.id) {
      await markNotificationAsRead(item.id, user.id);
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n))
      );
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
      <div className="max-w-4xl mx-auto space-y-7 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white shadow-inner">
                <Bell className="w-5 h-5 text-rose-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                Notifications
              </h1>
              {unreadCount > 0 ? (
                <span className="bg-rose-500/10 text-rose-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-rose-500/20 tabular-nums">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="bg-white/[0.04] text-zinc-400 text-xs font-medium px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                  All caught up
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm font-normal max-w-xl leading-relaxed">
              Stay up to date with real-time fan subscriptions, tips, comments, and PPV unlocks.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="self-start sm:self-auto flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <CheckCheck className="w-3.5 h-3.5 text-rose-500" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 rounded-2xl border border-white/[0.08] backdrop-blur-md overflow-x-auto scrollbar-hide">
          {['All', 'Subscribers', 'Tips', 'PPV', 'Comments', 'Likes'].map((tab) => {
            const isActive = activeFilter === tab;
            const count = tabCounts[tab] || 0;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  isActive 
                    ? 'bg-white text-zinc-950 font-bold shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                    isActive ? 'bg-zinc-950/15 text-zinc-950' : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notifications Stream */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-500 gap-3 bg-zinc-950/40 rounded-3xl border border-white/[0.06]">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <p className="text-xs font-medium text-zinc-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 bg-zinc-950/30 rounded-3xl border border-white/[0.06] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3 text-zinc-500">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="font-semibold text-sm text-zinc-300">No notifications in this category</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                When fans interact with your profile or tip you, updates will appear here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const meta = getNotificationMeta(item.type);
              const IconComponent = meta.icon;
              const isUnread = !item.is_read;

              return (
                <div 
                  key={item.id} 
                  onClick={() => handleClickItem(item)}
                  className={`group relative p-4 sm:p-5 rounded-2xl transition-all duration-200 flex items-start gap-4 border cursor-pointer ${
                    isUnread 
                      ? 'bg-zinc-900/70 border-white/[0.1] hover:bg-zinc-900/90 shadow-lg shadow-black/30' 
                      : 'bg-zinc-950/40 border-white/[0.04] hover:bg-zinc-900/40 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Subtle Unread Dot */}
                  {isUnread && (
                    <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    </div>
                  )}

                  {/* Icon Container */}
                  <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner transition-colors ${meta.bg} ${meta.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6 sm:pr-8 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md border ${meta.badgeBg}`}>
                        {meta.category}
                      </span>
                      <h3 className={`font-bold text-sm sm:text-base tracking-tight transition-colors ${
                        isUnread ? 'text-white' : 'text-zinc-200'
                      }`}>
                        {item.title}
                      </h3>
                      <span className="text-xs text-zinc-500 font-normal tabular-nums ml-auto sm:ml-0">
                        · {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-normal text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Arrow Icon on Hover */}
                  <div className="shrink-0 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all self-center">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </CreatorLayout>
  );
};

export default Notifications;
