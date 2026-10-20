import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { 
  Bell, 
  ShieldAlert, 
  ShieldCheck,
  CreditCard, 
  Image as ImageIcon,
  MessageCircle, 
  DollarSign, 
  CheckCircle2, 
  CheckCheck, 
  Loader2, 
  Inbox,
  Sparkles,
  Film,
  Compass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../lib/db';

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
  const [activeTab, setActiveTab] = useState<'all' | 'creator' | 'payment' | 'admin'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    if (user?.id) {
      try {
        const dbItems = await getUserNotifications(user.id);
        const mapped: NotificationItem[] = (dbItems || []).map((item: any) => ({
          id: item.id,
          category: (item.type === 'payment' || item.type === 'tip' || item.type === 'ppv' || item.type === 'subscription')
            ? 'payment'
            : (item.type === 'warning' || item.type === 'system')
              ? 'admin'
              : 'creator',
          title: item.title,
          message: item.message,
          created_at: item.created_at,
          is_read: item.is_read,
          action_label: item.action_label || (item.link ? 'View post' : undefined),
          action_url: item.action_url || item.link || undefined,
          avatar: item.avatar,
          badge: item.badge,
        }));
        setNotifications(mapped);
      } catch (err) {
        console.error('Error loading notifications:', err);
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();

    const handleUpdate = () => {
      load();
    };
    window.addEventListener('notifications_updated', handleUpdate);
    return () => window.removeEventListener('notifications_updated', handleUpdate);
  }, [user]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (user?.id) {
      markNotificationAsRead(id, user.id);
    }
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

  const tabCounts = useMemo(() => {
    return {
      all: notifications.length,
      creator: notifications.filter(n => n.category === 'creator').length,
      payment: notifications.filter(n => n.category === 'payment').length,
      admin: notifications.filter(n => n.category === 'admin').length,
    };
  }, [notifications]);

  const getCategoryMeta = (item: NotificationItem) => {
    if (item.category === 'payment') {
      const isTip = /tip/i.test(`${item.title} ${item.message}`);
      const isSub = /subscri/i.test(`${item.title} ${item.message}`);
      const isPpv = /unlock|ppv/i.test(`${item.title} ${item.message}`);
      return {
        icon: isTip ? DollarSign : isSub ? Sparkles : isPpv ? Film : CreditCard,
        iconColor: isTip ? 'text-emerald-400' : isSub ? 'text-amber-400' : isPpv ? 'text-purple-400' : 'text-emerald-400',
        badgeBg: isTip 
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
          : isSub 
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
            : isPpv 
              ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        label: isTip ? 'Tip' : isSub ? 'VIP Subscription' : isPpv ? 'PPV Unlock' : 'Payment',
      };
    }
    if (item.category === 'admin') {
      const isPolicy = /terms|policy|security|warning/i.test(`${item.title} ${item.message}`);
      return {
        icon: isPolicy ? ShieldAlert : ShieldCheck,
        iconColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        label: isPolicy ? 'Policy' : 'Notice',
      };
    }
    // Creator category
    const isDebut = /joined|welcome.*creator|new creator/i.test(`${item.title} ${item.message}`);
    const isVideo = /video|clip|reel/i.test(`${item.title} ${item.message}`);
    const isMessage = /message|chat|dm/i.test(`${item.title} ${item.message}`);

    return {
      icon: isDebut ? Sparkles : isVideo ? Film : isMessage ? MessageCircle : ImageIcon,
      iconColor: isDebut ? 'text-amber-400' : isMessage ? 'text-sky-400' : 'text-rose-400',
      badgeBg: isDebut 
        ? 'bg-amber-400/10 text-amber-300 border-amber-400/20' 
        : isMessage
          ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
          : 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      label: isDebut ? 'New creator' : isMessage ? 'Direct Message' : isVideo ? 'Video' : 'New post',
    };
  };

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        
        {/* Editorial Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Bell className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 tabular-nums">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
              Real-time updates from creators you follow, new talent arrivals, and M-Pesa statements.
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
        <nav aria-label="Notification categories" className="flex items-center gap-1.5 p-1 bg-zinc-950/70 border border-white/[0.08] rounded-xl overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: 'All activity', count: tabCounts.all },
            { id: 'creator', label: 'Creators & posts', count: tabCounts.creator },
            { id: 'payment', label: 'M-Pesa receipts', count: tabCounts.payment },
            { id: 'admin', label: 'Platform notes', count: tabCounts.admin },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 ${
                  isActive
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-semibold ${
                    isActive ? 'bg-zinc-950/15 text-zinc-950' : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Stream */}
        <main className="space-y-3">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-500 gap-3 bg-[#111217] rounded-2xl border border-white/[0.06]">
              <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
              <p className="text-xs font-medium text-zinc-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-14 text-center text-zinc-500 bg-[#111217] rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center">
              <div className="w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3.5 text-zinc-400">
                <Inbox className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-sm text-zinc-200">No dispatches in this category</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">
                When creators you follow publish new media or new talent debuts on The Gents DollHouse, your alerts will arrive here in real time.
              </p>
              <Link
                to="/user"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] px-3.5 py-1.5 rounded-lg transition-all"
              >
                <Compass className="w-3.5 h-3.5 text-rose-400" />
                <span>Explore creator feed</span>
              </Link>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const meta = getCategoryMeta(item);
              const IconComponent = meta.icon;

              return (
                <article
                  key={item.id}
                  className={`relative p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-start gap-4 ${
                    !item.is_read
                      ? 'bg-[#14141d] border-rose-500/25 shadow-[0_4px_20px_-8px_rgba(225,29,72,0.15)] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:bg-rose-500 before:rounded-r'
                      : 'bg-[#111217] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#13141a]'
                  }`}
                >
                  {/* Avatar / Category emblem */}
                  <div className="relative shrink-0 self-start">
                    {item.avatar ? (
                      <div className="relative">
                        <img
                          src={item.avatar}
                          alt=""
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 shadow-sm"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 bg-[#0e0e12] p-0.5 rounded-full ring-1 ring-white/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 fill-rose-500/20" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white">
                        <IconComponent className={`w-5 h-5 ${meta.iconColor}`} strokeWidth={1.8} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${meta.badgeBg}`}>
                        {item.badge || meta.label}
                      </span>
                      <h2 className={`text-sm font-semibold tracking-tight transition-colors ${
                        !item.is_read ? 'text-white' : 'text-zinc-200'
                      }`}>
                        {item.title}
                      </h2>
                      <time
                        dateTime={item.created_at}
                        title={formatFullDate(item.created_at)}
                        className="text-zinc-500 text-xs tabular-nums sm:ml-auto"
                      >
                        {formatNotificationTime(item.created_at)}
                      </time>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-2xl">
                      {item.message}
                    </p>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-3 flex-wrap">
                      {item.action_label && item.action_url && (
                        <Link
                          to={item.action_url}
                          onClick={() => {
                            if (!item.is_read) handleMarkAsRead(item.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200 bg-white/[0.05] hover:bg-white/[0.1] hover:text-white border border-white/[0.09] hover:border-white/20 px-3.5 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          <span>{item.action_label}</span>
                        </Link>
                      )}

                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(item.id)}
                          className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors py-1"
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
        </main>

      </div>
    </UserLayout>
  );
};

export default UserNotifications;
