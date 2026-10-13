import CreatorLayout from '../../components/CreatorLayout';
import { DollarSign, MessageCircle, Heart, UserPlus, Bell, CheckCheck, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function getNotificationMeta(type: string) {
  switch (type) {
    case 'subscription':
      return {
        icon: UserPlus,
        color: 'text-red-500',
        bg: 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
        category: 'Subscribers'
      };
    case 'tip':
      return {
        icon: DollarSign,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        category: 'Tips'
      };
    case 'ppv':
      return {
        icon: Sparkles,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]',
        category: 'PPV'
      };
    case 'comment':
      return {
        icon: MessageCircle,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
        category: 'Comments'
      };
    case 'like':
      return {
        icon: Heart,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
        category: 'Likes'
      };
    default:
      return {
        icon: Bell,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
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
      setNotifications(data);
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = notifications.filter(item => {
    if (activeFilter === 'All') return true;
    const meta = getNotificationMeta(item.type);
    return meta.category.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <CreatorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white">Notifications</h1>
              {unreadCount > 0 ? (
                <span className="bg-red-600/20 text-red-500 text-xs font-black px-2.5 py-1 rounded-full border border-red-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {unreadCount} Unread
                </span>
              ) : (
                <span className="bg-zinc-800/60 text-zinc-400 text-xs font-bold px-2.5 py-1 rounded-full border border-zinc-700/40">
                  All caught up
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-sm font-medium mt-1">
              Stay up to date with real-time fan subscriptions, tips, and unlocks.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="self-start sm:self-auto flex items-center gap-2 bg-[#0d0e12] hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-800 transition-all shadow-sm cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-red-500" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Subscribers', 'Tips', 'PPV', 'Comments', 'Likes'].map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveFilter(tab)}
                className={`px-5 py-2.5 rounded-full text-xs font-black tracking-wider uppercase whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                  isActive 
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30' 
                    : 'bg-[#0d0e12] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="bg-[#0d0e12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-sm font-semibold">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-700 opacity-50" />
              <p className="font-bold text-sm">No notifications found in this category.</p>
              <p className="text-xs text-zinc-600 mt-1">When fans interact with your profile, updates will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredNotifications.map((item) => {
                const meta = getNotificationMeta(item.type);
                const IconComponent = meta.icon;
                const isUnread = !item.is_read;

                return (
                  <div 
                    key={item.id} 
                    onClick={() => handleClickItem(item)}
                    className={`p-5 sm:p-6 flex items-start gap-4 transition-all duration-200 hover:bg-zinc-800/40 cursor-pointer group relative ${
                      isUnread ? 'bg-red-950/15' : ''
                    }`}
                  >
                    {/* Unread Accent Pill */}
                    {isUnread && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                    )}

                    {/* Icon */}
                    <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${meta.bg} ${meta.color}`}>
                      <IconComponent className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 truncate">
                          <h3 className="font-black text-white text-base truncate group-hover:text-red-400 transition-colors">
                            {item.title}
                          </h3>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-zinc-500 whitespace-nowrap bg-[#0d0e12] px-2.5 py-1 rounded-lg border border-zinc-800">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Arrow Icon on Hover */}
                    <div className="shrink-0 text-zinc-600 group-hover:text-red-500 transition-colors self-center">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CreatorLayout>
  );
};

export default Notifications;
