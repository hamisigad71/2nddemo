import { useState, useEffect, useMemo } from 'react';
import UserLayout from '../../components/UserLayout';
import { 
  Bell, 
  ShieldAlert, 
  ShieldCheck,
  CreditCard, 
  UserRound,
  Image as ImageIcon,
  MessageCircle,
  DollarSign,
  CheckCircle2, 
  CheckCheck, 
  ArrowRight, 
  Loader2, 
  Inbox 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../lib/db';
import { Link } from 'react-router-dom';

export interface NotificationItem {
  id: string;
  category: 'admin' | 'creator' | 'payment';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_label?: string;
  action_url?: string;
  avatar?: string;
  badge?: string;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    category: 'admin',
    title: 'Welcome to Mali VIP',
    message: 'Explore exclusive creator content, send tips, and enjoy seamless M-Pesa subscriptions anytime.',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    is_read: false,
    action_label: 'Explore Feed',
    action_url: '/user',
    badge: 'Welcome'
  },
  {
    id: 'notif-2',
    category: 'creator',
    title: 'Kennedy Ngugi Kimemia posted new media',
    message: 'A new high-roller lounge gallery has just been posted! Check out the latest exclusive shots.',
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    is_read: false,
    action_label: 'View Post',
    action_url: '/user',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    badge: 'New Post'
  },
  {
    id: 'notif-3',
    category: 'payment',
    title: 'Payment Successful: VIP Subscription',
    message: 'Your monthly subscription to Wairimu K. (KES 500) has been processed via M-Pesa. Ref: MP829104',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    is_read: false,
    action_label: 'View Subscriptions',
    action_url: '/user/subscriptions',
    badge: 'M-Pesa'
  },
  {
    id: 'notif-4',
    category: 'creator',
    title: 'Wairimu K. sent you a private message',
    message: '"Thank you so much for the tip earlier love! Let me know which photos you like best 💕"',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    is_read: true,
    action_label: 'Reply in Chat',
    action_url: '/user/messages',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    badge: 'Message'
  },
  {
    id: 'notif-5',
    category: 'payment',
    title: 'Tip Sent Confirmation',
    message: 'You sent a tip of KES 1,000 to Chloe Vibe. Transaction completed successfully.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    is_read: true,
    action_label: 'Check Wallet',
    action_url: '/user/wallet',
    badge: 'Tip'
  },
  {
    id: 'notif-6',
    category: 'admin',
    title: 'Platform Terms & Safety Update',
    message: 'We have updated our content discretion guidelines and anonymous billing policy for your privacy.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    is_read: true,
    badge: 'Policy'
  }
];

const formatNotificationTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
};

const formatFullDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } catch {
    return '';
  }
};

const UserNotifications = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'admin' | 'creator' | 'payment'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (user?.id) {
        const dbItems = await getUserNotifications(user.id);
        if (dbItems && dbItems.length > 0) {
          const mapped: NotificationItem[] = dbItems.map((item: any) => ({
            id: item.id,
            category: item.type === 'payment' ? 'payment' : item.type === 'warning' ? 'admin' : 'creator',
            title: item.title,
            message: item.message,
            created_at: item.created_at,
            is_read: item.is_read,
          }));
          // Merge with defaults
          const existingIds = new Set(mapped.map(m => m.id));
          const remaining = DEFAULT_NOTIFICATIONS.filter(d => !existingIds.has(d.id));
          setNotifications([...mapped, ...remaining]);
        } else {
          setNotifications(DEFAULT_NOTIFICATIONS);
        }
      } else {
        setNotifications(DEFAULT_NOTIFICATIONS);
      }
      setLoading(false);
    };

    load();
  }, [user]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    markNotificationAsRead(id);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (user?.id) {
      markAllNotificationsAsRead(user.id);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter(n => n.category === activeTab);
  }, [notifications, activeTab]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: notifications.length,
      admin: notifications.filter(n => n.category === 'admin').length,
      creator: notifications.filter(n => n.category === 'creator').length,
      payment: notifications.filter(n => n.category === 'payment').length,
    };
  }, [notifications]);

  const getCategoryConfig = (item: NotificationItem) => {
    switch (item.category) {
      case 'admin':
        return {
          icon: /welcome|verified|approved/i.test(item.title) ? ShieldCheck : ShieldAlert,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          label: 'Admin Alert',
          badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20'
        };
      case 'creator':
        return {
          icon: /post|media|photo|video/i.test(`${item.title} ${item.message}`)
            ? ImageIcon
            : /message|chat/i.test(`${item.title} ${item.message}`)
              ? MessageCircle
              : UserRound,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/20',
          label: 'Creator',
          badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20'
        };
      case 'payment':
        return {
          icon: /tip/i.test(`${item.title} ${item.message}`) ? DollarSign : CreditCard,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          label: 'Payment',
          badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
        };
    }
  };

  return (
    <UserLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-white">
                <Bell className="w-5 h-5 text-rose-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="bg-rose-500/10 text-rose-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-rose-500/20 tabular-nums">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm font-normal max-w-xl leading-relaxed">
              Updates from creators, your account, and payments.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="self-start sm:self-auto flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/[0.1] px-3.5 py-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <CheckCheck className="w-3.5 h-3.5 text-rose-500" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: 'All Alerts', count: tabCounts.all },
            { id: 'creator', label: 'Creators', count: tabCounts.creator },
            { id: 'payment', label: 'Payments & Billing', count: tabCounts.payment },
            { id: 'admin', label: 'Admin', count: tabCounts.admin },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  isActive
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-zinc-950 text-zinc-400 border-white/[0.1] hover:text-white hover:border-white/20'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                    isActive ? 'bg-black/20 text-white' : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notifications Stream */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/40 divide-y divide-white/[0.07]">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <p className="text-xs font-medium text-zinc-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3 text-zinc-500">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="font-semibold text-sm text-zinc-300">No notifications in this filter</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                When new posts, messages, or payments occur, they will appear right here.
              </p>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const config = getCategoryConfig(item);
              const IconComponent = config.icon;

              return (
                <article
                  key={item.id}
                  className={`group relative p-4 sm:px-6 sm:py-5 transition-colors flex flex-col sm:flex-row sm:items-start gap-4 ${
                    !item.is_read
                      ? 'bg-rose-950/15 hover:bg-rose-950/25'
                      : 'hover:bg-white/[0.025]'
                  }`}
                >
                  {/* Subtle Unread Indicator Dot */}
                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(item.id)}
                      aria-label={`Mark "${item.title}" as read`}
                      title="Mark as read"
                      className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <span className="block h-2.5 w-2.5 rounded-full bg-rose-500" />
                    </button>
                  )}

                  {/* Left Avatar / Icon Container */}
                  <div className="relative shrink-0 self-start">
                    {item.avatar ? (
                      <div className="relative">
                        <img
                          src={item.avatar}
                          alt="creator"
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-rose-500/30 transition-all shadow-sm"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 bg-zinc-950 p-0.5 rounded-full ring-1 ring-white/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-500/20" />
                        </div>
                      </div>
                    ) : (
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${config.bg} ${config.color}`}>
                        <IconComponent className="w-5 h-5" strokeWidth={1.8} />
                      </div>
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="flex-1 min-w-0 space-y-1.5 pr-6 sm:pr-8">
                    <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${config.badgeBg}`}>
                        {item.badge || config.label}
                      </span>
                      <h3 className={`text-sm font-bold tracking-tight transition-colors ${
                        !item.is_read ? 'text-white' : 'text-zinc-200'
                      }`}>
                        {item.title}
                      </h3>
                      <span 
                        title={formatFullDate(item.created_at)}
                        className="text-zinc-500 text-xs font-normal tabular-nums sm:ml-auto"
                      >
                        {formatNotificationTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
                      {item.message}
                    </p>

                    {/* Action Pill / Quick Button */}
                    <div className="pt-2 flex items-center gap-3 flex-wrap">
                      {item.action_label && item.action_url && (
                        <Link
                          to={item.action_url}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!item.is_read) handleMarkAsRead(item.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200 bg-white/[0.05] hover:bg-white/[0.1] hover:text-white border border-white/[0.08] hover:border-white/20 px-3.5 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          <span>{item.action_label}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      )}

                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(item.id);
                          }}
                          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors py-1"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

      </div>
    </UserLayout>
  );
};

export default UserNotifications;
