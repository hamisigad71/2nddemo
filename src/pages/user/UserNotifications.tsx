import { useState, useEffect, useMemo } from 'react';
import UserLayout from '../../components/UserLayout';
import { 
  Bell, 
  ShieldAlert, 
  CreditCard, 
  Sparkles, 
  CheckCheck, 
  Clock,
  ArrowRight,
  Loader2
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
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} · ${timePart}`;
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

  const getCategoryConfig = (category: NotificationItem['category']) => {
    switch (category) {
      case 'admin':
        return {
          icon: ShieldAlert,
          color: 'text-red-500',
          bg: 'bg-red-500/10 border-red-500/20',
          label: 'Admin Alert',
          badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30'
        };
      case 'creator':
        return {
          icon: Sparkles,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/20',
          label: 'Creator Update',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        };
      case 'payment':
        return {
          icon: CreditCard,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          label: 'Billing & Payment',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        };
    }
  };

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Bell className="w-7 h-7 text-primary" /> Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="bg-red-600/20 text-red-500 text-xs font-black px-3 py-1 rounded-full border border-red-500/30 flex items-center gap-1 shadow-sm">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-sm font-medium mt-1">
              Stay informed with real-time alerts from administrators, creator feeds, and your transactions.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="self-start sm:self-auto flex items-center gap-2 bg-[#0d0e12] hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-800 transition-all shadow-sm active:scale-95"
            >
              <CheckCheck className="w-4 h-4 text-red-500" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'All Alerts' },
            { id: 'admin', label: 'Admin Alerts' },
            { id: 'creator', label: 'Creators' },
            { id: 'payment', label: 'Payments & Billing' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-full text-xs font-black tracking-wider uppercase whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30'
                    : 'bg-[#0d0e12] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notification Cards */}
        <div className="bg-[#0d0e12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Loading alerts...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center text-zinc-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-700 opacity-50" />
              <p className="font-bold text-base text-zinc-400">No notifications in this category</p>
              <p className="text-xs text-zinc-500 mt-1">We'll notify you when an update arrives.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredNotifications.map(item => {
                const config = getCategoryConfig(item.category);
                const IconComponent = config.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => !item.is_read && handleMarkAsRead(item.id)}
                    className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4 transition-all duration-200 hover:bg-zinc-800/40 relative group ${
                      !item.is_read ? 'bg-red-950/15' : ''
                    }`}
                  >
                    {/* Unread Pill Accent */}
                    {!item.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 rounded-r" />
                    )}

                    {/* Icon or Avatar */}
                    <div className="flex items-center gap-3 sm:block shrink-0">
                      {item.avatar ? (
                        <div className="relative">
                          <img
                            src={item.avatar}
                            alt="creator"
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-red-500/40"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-zinc-950 p-1 rounded-full">
                            <Sparkles className="w-3.5 h-3.5 text-red-500" />
                          </div>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${config.bg} ${config.color}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                      )}

                      {/* Mobile view time */}
                      <span className="sm:hidden text-xs text-zinc-500 font-semibold ml-auto flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatNotificationTime(item.created_at)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${config.badgeBg}`}>
                            {item.badge || config.label}
                          </span>
                          <h3 className={`font-black text-sm sm:text-base transition-colors ${
                            !item.is_read ? 'text-white' : 'text-zinc-300'
                          }`}>
                            {item.title}
                          </h3>
                        </div>

                        {/* Desktop timestamp */}
                        <span className="hidden sm:flex text-xs font-bold text-zinc-500 whitespace-nowrap bg-[#0d0e12] px-2.5 py-1 rounded-lg border border-zinc-800 items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-600" />
                          {formatNotificationTime(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-zinc-400 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Action Button if specified */}
                      {item.action_label && item.action_url && (
                        <div className="pt-2">
                          <Link
                            to={item.action_url}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 px-3.5 py-2 rounded-xl transition-all hover:border-red-500/50 hover:text-red-400 active:scale-95"
                          >
                            <span>{item.action_label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </UserLayout>
  );
};

export default UserNotifications;
