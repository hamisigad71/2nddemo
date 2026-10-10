import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, DollarSign,
  BarChart3, Settings, Menu, LogOut, Bell, ChevronRight,
  Rss, Sun, Moon, User, Wallet, Flag, Shield, Heart
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Overview',        icon: LayoutDashboard, path: '/admin' },
  { label: 'Creators',        icon: UserCheck,       path: '/admin/creators' },
  { label: 'Users / Fans',    icon: Users,           path: '/admin/users' },
  { label: 'Transactions',    icon: DollarSign,      path: '/admin/transactions' },
  { label: 'Payouts',         icon: Wallet,          path: '/admin/payouts', isNew: true },
  { label: 'Content',         icon: Rss,             path: '/admin/content', badge: 3 },
  { label: 'Reports',         icon: Flag,            path: '/admin/reports', badge: 2, isNew: true },
  { label: 'Analytics',       icon: BarChart3,       path: '/admin/analytics' },
  { label: 'Audit Log',       icon: Shield,          path: '/admin/audit-log', isNew: true },
  { label: 'Settings',        icon: Settings,        path: '/admin/settings' },
  { label: 'Escort Apps',     icon: Heart,           path: '/admin/escorts' },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();

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
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 group ${
                active
                  ? 'bg-red-600 text-white shadow-xl shadow-red-600/20'
                  : 'text-zinc-400 hover:bg-[#14161d] hover:text-white'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? 'text-white' : 'text-zinc-500 group-hover:text-red-400'}`} />
              <span className="flex-1">{label}</span>
              {isNew && !active && (
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
                  New
                </span>
              )}
              {isNew && active && (
                <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
                  New
                </span>
              )}
              {badge && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center leading-none ${active ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>
                  {badge}
                </span>
              )}
              {active && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-zinc-800 p-4 space-y-2 shrink-0 bg-[#0d0e12]">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-[#14161d] hover:text-white transition-colors text-sm font-bold group"
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-zinc-500 group-hover:text-yellow-400" /> : <Moon className="w-[18px] h-[18px] text-zinc-500 group-hover:text-blue-400" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
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

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors group">
              <Bell className="w-5 h-5 group-hover:text-white transition-colors" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0d0e12]" />
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
