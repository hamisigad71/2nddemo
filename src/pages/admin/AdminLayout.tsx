import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, DollarSign,
  BarChart3, Settings, Menu, LogOut, Bell, ChevronRight,
  Rss, Sun, Moon, User, Wallet, Flag, Shield, Heart, Megaphone, Lock,
  CheckCheck, Radio, Video, UserPlus, X, Receipt, ArrowRight, ArrowUpRight, CheckCircle2, CreditCard
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  getAdminPayouts, 
  getAdminNotifications, 
  getAdminApplications,
  markAdminNotificationAsRead, 
  markAllAdminNotificationsAsRead, 
  type NotificationItem 
} from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { adminNotificationPopoverClassName } from '../../lib/adminNotificationLayout';
import { toast } from '../../context/ToastContext';
import { lockAdminSession } from '../../components/AdminRoute';

interface AdminNavItem {
  label: string;
  icon: any;
  path: string;
  badge?: number;
  isNew?: boolean;
}

const navItems: AdminNavItem[] = [
  { label: 'Overview',           icon: LayoutDashboard, path: '/admin' },
  { label: 'Applications & KYC', icon: UserPlus,        path: '/admin/applications', isNew: true },
  { label: 'Ads & Campaigns',    icon: Megaphone,       path: '/admin/ads' },
  { label: 'Creators',           icon: UserCheck,       path: '/admin/creators' },
  { label: 'Subscribers / Fans', icon: Users,           path: '/admin/users' },
  { label: 'Transactions',       icon: DollarSign,      path: '/admin/transactions' },
  { label: 'Payouts',            icon: Wallet,          path: '/admin/payouts' },
  { label: 'Content',            icon: Rss,             path: '/admin/content' },
  { label: 'Reports',            icon: Flag,            path: '/admin/reports' },
  { label: 'Analytics',          icon: BarChart3,       path: '/admin/analytics' },
  { label: 'Audit Log',          icon: Shield,          path: '/admin/audit-log' },
  { label: 'Settings',           icon: Settings,        path: '/admin/settings' },
  { label: 'Escort Apps',        icon: Heart,           path: '/admin/escorts' },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [pendingPayoutsCount, setPendingPayoutsCount] = useState(0);
  const [pendingAppsCount, setPendingAppsCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'payments'>('all');
  const [adminNotifications, setAdminNotifications] = useState<NotificationItem[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();

  const loadNotifications = async () => {
    try {
      const items = await getAdminNotifications();
      setAdminNotifications(items || []);
    } catch {
      setAdminNotifications([]);
    }
  };

  useEffect(() => {
    const checkPendingPayouts = async () => {
      try {
        const list = await getAdminPayouts();
        const pending = list.filter((p: any) => p.status === 'pending').length;
        setPendingPayoutsCount(pending);
      } catch {}
    };

    const checkPendingApps = async () => {
      try {
        const apps = await getAdminApplications();
        setPendingAppsCount(apps.length);
      } catch {}
    };

    checkPendingPayouts();
    checkPendingApps();
    loadNotifications();

    const handlePayoutUpdate = () => checkPendingPayouts();
    const handleAppsUpdate = () => checkPendingApps();
    const handleNotifUpdate = () => loadNotifications();

    window.addEventListener('payouts_updated', handlePayoutUpdate);
    window.addEventListener('wallet_updated', handlePayoutUpdate);
    window.addEventListener('transactions_updated', handleNotifUpdate);
    window.addEventListener('applications_updated', handleAppsUpdate);
    window.addEventListener('creators_updated', handleAppsUpdate);
    window.addEventListener('admin_notifications_updated', handleNotifUpdate);
    window.addEventListener('notifications_updated', handleNotifUpdate);

    const channel = supabase
      .channel('admin_layout_watch')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload: any) => {
          const isPayout = payload.new?.type === 'payout';
          const gross = Number(payload.new?.gross_amount || payload.new?.amount || 0);
          const fee = Number(payload.new?.platform_fee || Math.round(gross * 0.3));
          if (isPayout) {
            toast.info(`New Creator Withdrawal Request: KES ${gross.toLocaleString()}!`);
            checkPendingPayouts();
          } else {
            toast.success(`💳 Payment Received: KES ${gross.toLocaleString()} (${payload.new?.type || 'payment'}). Platform fee: KES ${fee.toLocaleString()}`);
          }
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions' },
        () => {
          checkPendingPayouts();
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          loadNotifications();
          if (payload.new?.title) {
            toast.info(payload.new.title);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('payouts_updated', handlePayoutUpdate);
      window.removeEventListener('wallet_updated', handlePayoutUpdate);
      window.removeEventListener('transactions_updated', handleNotifUpdate);
      window.removeEventListener('applications_updated', handleAppsUpdate);
      window.removeEventListener('creators_updated', handleAppsUpdate);
      window.removeEventListener('admin_notifications_updated', handleNotifUpdate);
      window.removeEventListener('notifications_updated', handleNotifUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const isPaymentNotif = (n: NotificationItem) =>
    Boolean(n.payment_details) ||
    n.id.startsWith('tx-') ||
    n.badge?.toLowerCase().includes('payment') ||
    n.type === 'subscription' ||
    n.type === 'tip' ||
    n.type === 'ppv';

  const paymentNotifs = adminNotifications.filter(isPaymentNotif);
  const paymentNotifsCount = paymentNotifs.length;
  const unreadPaymentsCount = paymentNotifs.filter(n => !n.is_read).length;
  const unreadNotifsCount = adminNotifications.filter(n => !n.is_read).length;
  const totalUnreadBadge = unreadNotifsCount + pendingPayoutsCount;
  const displayedNotifs = notifTab === 'payments' ? paymentNotifs : adminNotifications;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0d0e12]">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 px-6 py-8 border-b border-zinc-800 shrink-0">
        <img src="/logo.svg" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-tight text-white leading-none">The Gents Dollhouse</span>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500 bg-red-600/10 border border-red-500/20 px-2 py-0.5 rounded-full w-fit mt-1.5">Admin Portal</span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto no-scrollbar custom-scrollbar">
        {navItems.map(({ label, icon: Icon, path, badge, isNew }) => {
          const active = location.pathname === path;
          const computedBadge =
            path === '/admin/payouts' && pendingPayoutsCount > 0
              ? pendingPayoutsCount
              : path === '/admin/applications' && pendingAppsCount > 0
              ? pendingAppsCount
              : badge;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 group ${
                active
                  ? 'bg-red-600 text-white shadow-xl shadow-red-600/20'
                  : 'text-zinc-400 hover:bg-[#0d0e12] hover:text-white'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? 'text-white' : 'text-zinc-500 group-hover:text-red-400'}`} />
              <span className="flex-1">{label}</span>
              {isNew && !active && !computedBadge && (
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
                  New
                </span>
              )}
              {isNew && active && !computedBadge && (
                <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
                  New
                </span>
              )}
              {computedBadge ? (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center leading-none ${active ? 'bg-white text-red-600' : 'bg-red-600 text-white animate-pulse'}`}>
                  {computedBadge}
                </span>
              ) : null}
              {active && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-zinc-800 p-4 space-y-2 shrink-0 bg-[#0d0e12]">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-[#0d0e12] hover:text-white transition-colors text-sm font-bold group"
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-zinc-500 group-hover:text-yellow-400" /> : <Moon className="w-[18px] h-[18px] text-zinc-500 group-hover:text-blue-400" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={() => {
            lockAdminSession();
            toast.info('Admin terminal locked.');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-bold group"
        >
          <Lock className="w-[18px] h-[18px] text-zinc-500 group-hover:text-red-400 transition-colors" />
          Lock Terminal
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-bold group"
        >
          <LogOut className="w-[18px] h-[18px] text-zinc-500 group-hover:text-red-400 transition-colors" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-[#0d0e12] border-r border-zinc-800">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-[200] lg:hidden flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-[280px] h-full bg-[#0d0e12] border-r border-zinc-800 flex flex-col shadow-2xl animate-slide-in-left">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Bar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-zinc-800 bg-[#0d0e12]/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-sm font-black text-white">
                {navItems.find(n => n.path === location.pathname)?.label ?? 'Admin'}
              </div>
              <div className="text-[10px] text-zinc-500 font-bold hidden sm:block">The Gents Dollhouse Platform Admin</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Payments Quick Trigger */}
            <button
              onClick={() => {
                setNotifTab('payments');
                setShowNotifications(true);
              }}
              title="View platform payments feed"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-xs font-black transition-all active:scale-95 shadow-sm group cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Live Payments</span>
              {unreadPaymentsCount > 0 ? (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[10px] font-black">
                  {unreadPaymentsCount}
                </span>
              ) : paymentNotifsCount > 0 ? (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  {paymentNotifsCount}
                </span>
              ) : null}
            </button>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(prev => !prev)}
                title={totalUnreadBadge > 0 ? `${totalUnreadBadge} unread notifications` : 'Admin Notifications'}
                className="relative p-2.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
              >
                <Bell className="w-5 h-5 transition-colors" />
                {totalUnreadBadge > 0 ? (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border border-[#0d0e12] animate-pulse">
                    {totalUnreadBadge > 9 ? '9+' : totalUnreadBadge}
                  </span>
                ) : (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-zinc-600 rounded-full border-2 border-[#0d0e12]" />
                )}
              </button>

              {/* Notification Popover Drawer */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className={`${adminNotificationPopoverClassName} bg-[#0c0d12] border border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[540px] animate-in fade-in zoom-in-95 duration-150`}>
                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-black text-white">Platform Notifications</span>
                        {totalUnreadBadge > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                            {totalUnreadBadge} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadNotifsCount > 0 && (
                          <button
                            onClick={async () => {
                              await markAllAdminNotificationsAsRead();
                              setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                            }}
                            className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Read all
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Filter Tabs: All Alerts vs Payments Only */}
                    <div className="p-2 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center gap-2">
                      <button
                        onClick={() => setNotifTab('all')}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          notifTab === 'all'
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>All Alerts</span>
                        {adminNotifications.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-700 text-zinc-300">
                            {adminNotifications.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setNotifTab('payments')}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          notifTab === 'payments'
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/40'
                            : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Payments Only</span>
                        {paymentNotifsCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            notifTab === 'payments'
                              ? 'bg-emerald-800 text-emerald-100'
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {paymentNotifsCount}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Pending Payouts Quick Alert (when on All Alerts tab) */}
                    {notifTab === 'all' && pendingPayoutsCount > 0 && (
                      <Link
                        to="/admin/payouts"
                        onClick={() => setShowNotifications(false)}
                        className="p-3 bg-red-950/30 border-b border-red-500/20 flex items-center justify-between hover:bg-red-950/50 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                              {pendingPayoutsCount} Pending Withdrawal Request{pendingPayoutsCount > 1 ? 's' : ''}
                            </div>
                            <div className="text-[10px] text-zinc-400">Creators awaiting payout dispatches</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    )}

                    {/* Notification Stream */}
                    <div className="overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar max-h-84">
                      {displayedNotifs.length === 0 ? (
                        <div className="py-12 px-6 text-center text-zinc-500">
                          {notifTab === 'payments' ? (
                            <>
                              <Receipt className="w-9 h-9 mx-auto mb-2.5 opacity-30 text-emerald-400" />
                              <div className="text-xs font-bold text-zinc-300">No Payment Records Yet</div>
                              <div className="text-[11px] mt-1 text-zinc-500 max-w-xs mx-auto">
                                All subscriptions, tips, and unlock payments made on the platform will appear here in real-time.
                              </div>
                            </>
                          ) : (
                            <>
                              <Bell className="w-8 h-8 mx-auto mb-2.5 opacity-30 text-zinc-400" />
                              <div className="text-xs font-bold text-zinc-300">All caught up!</div>
                              <div className="text-[11px] mt-1 text-zinc-500">
                                You'll receive live alerts when new creators join, post videos, or start broadcasting.
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        displayedNotifs.map((notif) => {
                          const isPayment = isPaymentNotif(notif);

                          if (isPayment) {
                            const details = notif.payment_details;
                            const gross = Number(details?.gross_amount ?? 0);
                            const fee = Number(details?.platform_fee ?? Math.round(gross * 0.3));
                            const creatorShare = Number(details?.net_amount ?? Math.max(0, gross - fee));
                            const currency = details?.currency || 'KES';
                            const method = details?.payment_method || 'M-PESA';
                            const payerName = details?.payer_name || 'Fan Member';
                            const creatorName = details?.creator_name || 'Creator';
                            const status = details?.status || 'completed';

                            return (
                              <div
                                key={notif.id}
                                onClick={async () => {
                                  await markAdminNotificationAsRead(notif.id);
                                  setAdminNotifications(prev =>
                                    prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
                                  );
                                  setShowNotifications(false);
                                  navigate(notif.action_url || '/admin/transactions');
                                }}
                                className={`p-3.5 hover:bg-emerald-950/30 transition-all cursor-pointer relative border-l-2 ${
                                  !notif.is_read
                                    ? 'bg-emerald-950/20 border-emerald-500'
                                    : 'border-transparent opacity-90'
                                }`}
                              >
                                {!notif.is_read && (
                                  <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse" />
                                )}

                                {/* Top Row: Amount & Badges */}
                                <div className="flex items-center justify-between gap-2 mb-2 pr-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                                      <Receipt className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="text-xs font-black text-emerald-400 tracking-tight flex items-center gap-1.5">
                                        <span>+{currency} {gross.toLocaleString()}</span>
                                        <span className="text-[10px] font-bold text-zinc-400 capitalize">
                                          ({details?.type || notif.type || 'payment'})
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                                      {method}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                      status === 'completed'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    }`}>
                                      {status}
                                    </span>
                                  </div>
                                </div>

                                {/* Flow Row: Payer -> Creator */}
                                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2 mb-2 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 min-w-0 max-w-[42%]">
                                    {details?.payer_avatar ? (
                                      <img src={details.payer_avatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                    )}
                                    <span className="text-[11px] font-bold text-zinc-200 truncate">{payerName}</span>
                                  </div>

                                  <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0 mx-1" />

                                  <div className="flex items-center gap-1.5 min-w-0 max-w-[42%] justify-end text-right">
                                    <span className="text-[11px] font-bold text-red-400 truncate">{creatorName}</span>
                                    {details?.creator_avatar ? (
                                      <img src={details.creator_avatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <UserPlus className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    )}
                                  </div>
                                </div>

                                {/* Financial Split Row */}
                                <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-emerald-400/90 font-bold">Platform: +{currency} {fee.toLocaleString()}</span>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-zinc-300">Creator: {currency} {creatorShare.toLocaleString()}</span>
                                  </div>
                                  <span className="text-[9px] text-zinc-500">
                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          const isLive = notif.badge?.toLowerCase().includes('live');
                          const isNewCreator = notif.badge?.toLowerCase().includes('creator');
                          const isVideo = notif.badge?.toLowerCase().includes('video');

                          return (
                            <div
                              key={notif.id}
                              onClick={async () => {
                                await markAdminNotificationAsRead(notif.id);
                                setAdminNotifications(prev =>
                                  prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
                                );
                                setShowNotifications(false);
                                const targetUrl = notif.action_url || notif.link;
                                if (targetUrl) {
                                  navigate(targetUrl);
                                }
                              }}
                              className={`p-3.5 hover:bg-zinc-900/60 transition-colors cursor-pointer flex items-start gap-3 relative ${
                                !notif.is_read ? 'bg-zinc-950/40' : 'opacity-85'
                              }`}
                            >
                              {!notif.is_read && (
                                <span className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                              )}
                              <div className="relative shrink-0 w-9 h-9 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                {notif.avatar ? (
                                  <img src={notif.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : isLive ? (
                                  <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                                ) : isVideo ? (
                                  <Video className="w-4 h-4 text-amber-400" />
                                ) : isNewCreator ? (
                                  <UserPlus className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Bell className="w-4 h-4 text-zinc-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-xs font-black text-white truncate">{notif.title}</span>
                                  {notif.badge && (
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
                                      isLive 
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                                        : isNewCreator
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-zinc-800 text-zinc-400'
                                    }`}>
                                      {notif.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{notif.message}</p>
                                <div className="mt-1 text-[9px] text-zinc-500">
                                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-[11px]">
                      <Link
                        to="/admin/transactions"
                        onClick={() => setShowNotifications(false)}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors font-bold flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" /> All Payments &rarr;
                      </Link>
                      <Link
                        to="/admin/creators"
                        onClick={() => setShowNotifications(false)}
                        className="text-zinc-400 hover:text-white transition-colors font-bold"
                      >
                        Manage Creators &rarr;
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Lock Admin Terminal Button */}
            <button
              onClick={() => {
                lockAdminSession();
                toast.info('Admin terminal locked.');
              }}
              title="Lock Admin Terminal"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 text-xs font-bold transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock Gate</span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
              <div className="w-9 h-9 rounded-full border-2 border-red-500/20 bg-red-600/10 flex items-center justify-center text-red-500 flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-black text-white truncate max-w-[120px]">{user?.user_metadata?.name || user?.user_metadata?.full_name || 'System Admin'}</div>
                <div className="text-[10px] text-zinc-500 font-bold truncate max-w-[120px]">{user?.email || 'admin@hideaway.com'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>

      <style>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
