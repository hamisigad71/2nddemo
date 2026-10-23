import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, FolderHeart, CreditCard, Wallet, Settings, Menu, X, LogOut, Search, Sun, Moon, ChevronRight, ChevronLeft, Flame, Crown, Bell, PanelLeftOpen, Megaphone, Download } from 'lucide-react';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserNotifications, getUserProfile } from '../lib/db';
import { resolveUserAvatar } from '../lib/avatar';
import { supabase } from '../lib/supabase';
import VerifiedCreatorNoticeModal from './VerifiedCreatorNoticeModal';

interface UserLayoutProps {
  children: React.ReactNode;
}

const navGroups = [
  {
    name: 'Discover',
    items: [
      { name: 'Feed', path: '/user', icon: Home, badge: 'Live' },
      { name: 'VIP Perks & Deals', path: '/user/ads', icon: Megaphone, badge: 'New' },
      { name: 'Escorts', path: '/user/escorts', icon: Flame, badge: 'New' },
    ],
  },
  {
    name: 'Your activity',
    items: [
      { name: 'Notifications', path: '/user/notifications', icon: Bell },
      { name: 'Messages', path: '/user/messages', icon: MessageCircle },
    ],
  },
  {
    name: 'Your account',
    items: [
      { name: 'Purchases', path: '/user/vault', icon: FolderHeart },
      { name: 'Membership', path: '/user/membership', icon: Crown, badge: 'Upgrade' },
      { name: 'Subscriptions', path: '/user/subscriptions', icon: CreditCard },
      { name: 'Wallet', path: '/user/wallet', icon: Wallet },
      { name: 'Payment Methods', path: '/user/payments', icon: CreditCard },
      { name: 'Settings', path: '/user/settings', icon: Settings },
    ],
  },
];

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [showVerifiedNotice, setShowVerifiedNotice] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Trigger verification notice popup when opening account or if new subscriber hasn't seen it yet
    const pendingNotice = localStorage.getItem('show_subscriber_verification_popup') === 'true';
    const seenNotice = localStorage.getItem(`mali_verified_creators_popup_seen_${user.id}`);

    if (pendingNotice || !seenNotice) {
      const timer = setTimeout(() => {
        setShowVerifiedNotice(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  useEffect(() => {
    const handleOpenNotice = () => setShowVerifiedNotice(true);
    window.addEventListener('open_verified_creator_notice', handleOpenNotice);
    return () => window.removeEventListener('open_verified_creator_notice', handleOpenNotice);
  }, []);

  const handleCloseVerifiedNotice = () => {
    setShowVerifiedNotice(false);
    if (user?.id) {
      localStorage.setItem(`mali_verified_creators_popup_seen_${user.id}`, 'true');
    }
    localStorage.removeItem('show_subscriber_verification_popup');
  };

  useEffect(() => {
    if (!user?.id) {
      setUnreadNotifications(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const notifs = await getUserNotifications(user.id);
        const count = notifs.filter(n => !n.is_read).length;
        setUnreadNotifications(count);
      } catch {}
    };

    fetchUnread();

    const handleUpdate = () => {
      fetchUnread();
    };

    window.addEventListener('notifications_updated', handleUpdate);

    // Live Supabase Realtime channel for instant notification updates across devices
    const channel = supabase
      .channel(`user_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnread();
          window.dispatchEvent(new CustomEvent('notifications_updated', { detail: { userId: user.id } }));
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('notifications_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const [userName, setUserName] = useState<string>(() => {
    return user?.user_metadata?.name || user?.user_metadata?.full_name || "Fan User";
  });

  const [userAvatar, setUserAvatar] = useState<string>(() => {
    const cached = typeof window !== 'undefined' && user?.id ? localStorage.getItem(`tgd_user_avatar_${user.id}`) : null;
    return resolveUserAvatar(cached || user?.user_metadata?.avatar_url || user?.user_metadata?.picture, user?.user_metadata?.name || user?.user_metadata?.full_name);
  });

  useEffect(() => {
    if (!user?.id) return;

    // 1. Initial hydration from cache and DB
    const cached = localStorage.getItem(`tgd_user_avatar_${user.id}`);
    if (cached) setUserAvatar(cached);

    getUserProfile(user.id).then(profile => {
      if (profile?.status === 'suspended' || profile?.status === 'banned') {
        logout();
        navigate('/login?error=account_suspended', { replace: true });
        return;
      }
      if (profile?.avatar) {
        setUserAvatar(profile.avatar);
        try {
          localStorage.setItem(`tgd_user_avatar_${user.id}`, profile.avatar);
        } catch {}
      }
      if (profile?.name) setUserName(profile.name);
    }).catch(() => {});

    // 2. Listen to profile_updated event for instant multi-component reactivity
    const handleProfileUpdate = (e: any) => {
      if (e.detail?.avatar) setUserAvatar(e.detail.avatar);
      if (e.detail?.name) setUserName(e.detail.name);
    };

    window.addEventListener('profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('profile_updated', handleProfileUpdate);
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-foreground flex flex-col md:flex-row font-sans selection:bg-primary/30 relative">
      
      {/* Floating Open Sidebar Button when closed on Desktop */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden md:flex fixed top-4 left-4 z-40 items-center gap-2.5 px-3 py-2.5 bg-[#0D0E12]/95 border border-white/15 hover:border-red-500/60 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-md text-zinc-300 hover:text-white transition-all hover:scale-105 active:scale-95 group"
          title="Open Sidebar"
        >
          <PanelLeftOpen className="w-5 h-5 text-red-500 transition-transform group-hover:scale-110" />
          <span className="text-xs font-bold text-zinc-300 group-hover:text-white tracking-wide">Open Sidebar</span>
        </button>
      )}

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#0D0E12]/90 backdrop-blur-xl sticky top-0 z-40">
        <Link to="/user" className="flex items-center gap-2.5 group">
          <img src="/logo.svg" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
          <span className="text-lg font-black tracking-tight text-white">The Gents Dollhouse<span className="text-primary">.</span></span>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="p-2 -mr-2 text-foreground/80 hover:text-foreground rounded-xl hover:bg-white/5 active:scale-95 transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Classic & Premium Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#100F12] border-r border-white/[0.08] p-4 flex flex-col h-screen transform transition-all duration-300 shadow-2xl ${
        isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full'
      } ${
        isSidebarOpen 
          ? 'md:relative md:translate-x-0 md:w-64' 
          : 'md:relative md:w-0 md:p-0 md:border-r-0 md:opacity-0 md:pointer-events-none md:overflow-hidden'
      }`}>

        {/* Desktop Edge Close Pill Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="hidden md:flex absolute -right-3.5 top-7 z-50 w-7 h-7 bg-[#100F12] border border-white/15 hover:border-primary/60 rounded-full items-center justify-center text-zinc-400 hover:text-white shadow-xl transition-all hover:scale-110 active:scale-95"
          title="Close Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {/* Brand Header */}
        <div className="flex justify-between items-center mb-5 pt-1">
          <Link to="/user" className="flex items-center gap-2.5 group min-w-0">
            <img src="/logo.svg" alt="Logo" className="w-10 h-10 object-contain shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-bold tracking-tight text-white leading-tight truncate">The Gents Dollhouse<span className="text-primary">.</span></span>
              <span className="text-[10px] text-muted-foreground/70 mt-1">Your member space</span>
            </div>
          </Link>

          {/* Close button for Mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>

        </div>

        {/* Global Search Box */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              navigate(`/discover?search=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
          className="relative mb-6 group"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators..." 
            aria-label="Search creators"
            style={{ paddingLeft: '2.5rem' }}
            className="w-full pl-10 pr-4 py-2.5 bg-[#19171B] border border-white/[0.09] rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors"
          />
        </form>

        <nav aria-label="Member navigation" className="flex-1 space-y-5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
          {navGroups.map((group) => (
            <div key={group.name}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground/55">{group.name}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative flex items-center justify-between min-h-10 px-3 rounded-lg transition-colors group text-xs ${
                        isActive
                          ? 'bg-primary/[0.12] text-white font-semibold'
                          : 'text-muted-foreground hover:bg-white/[0.045] hover:text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-foreground'}`} />
                        <span className="truncate">{item.name}</span>
                      </span>

                      {(() => {
                        const badge = item.name === 'Notifications' 
                          ? (unreadNotifications > 0 ? (unreadNotifications > 99 ? '99+' : unreadNotifications.toString()) : undefined)
                          : item.badge;
                        if (!badge) return null;
                        return (
                          <span className={`ml-2 shrink-0 ${
                            item.name === 'Notifications'
                              ? 'min-w-5 h-5 px-1.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold'
                              : badge === 'Upgrade'
                                ? 'text-[9px] font-semibold text-primary/80'
                                : 'text-[9px] font-medium text-emerald-400'
                          }`}>
                            {badge === 'Live' && <span className="inline-block w-1.5 h-1.5 mr-1 rounded-full bg-emerald-400 align-middle" />}
                            {badge}
                          </span>
                        );
                      })()}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card & Settings */}
        <div className="pt-3 border-t border-white/[0.09] mt-3 shrink-0 space-y-2">
          
          {/* Install Mobile App Shortcut */}
          <button 
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              window.dispatchEvent(new CustomEvent('open_pwa_install_prompt'));
            }} 
            className="flex items-center justify-between px-3 py-2 rounded-xl transition-all text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 w-full active:scale-95 group"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span>Install Mobile App</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-200 font-bold">1-Tap</span>
          </button>

          {/* User Profile Pill */}
          <div className="p-2 rounded-xl bg-white/[0.035] border border-white/[0.08] flex items-center justify-between group hover:bg-white/[0.06] transition-colors">
            <Link to="/user/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative">
                <img 
                  src={userAvatar} 
                  alt="avatar" 
                  referrerPolicy="no-referrer" 
                  className="w-9 h-9 rounded-full object-cover border border-white/15 group-hover:border-primary/50 transition-colors"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#100F12]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">{userName}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  View Profile <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                </div>
              </div>
            </Link>
            
            <button 
              onClick={handleLogout} 
              className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Switcher Toggle */}
          <button 
            onClick={toggleTheme} 
            className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-xs font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span>{theme === 'dark' ? 'Light Appearance' : 'Dark Appearance'}</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{theme}</span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-1 w-full overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8 bg-background text-foreground transition-colors">
        <div className="w-full max-w-screen-2xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation - hides whenever mobile sidebar menu is opened */}
      <BottomNav scrollRef={mainRef} hidden={isMobileMenuOpen} />

      {/* Verified Creator Trust & Safety Modal Notice */}
      <VerifiedCreatorNoticeModal 
        isOpen={showVerifiedNotice} 
        onClose={handleCloseVerifiedNotice} 
      />
    </div>
  );
};

export default UserLayout;
