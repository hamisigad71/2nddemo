import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, DollarSign,
  BarChart3, Settings, Menu, LogOut, Bell, ChevronRight,
  Rss, Sun, Moon, User
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Overview',        icon: LayoutDashboard, path: '/admin' },
  { label: 'Creators',        icon: UserCheck,       path: '/admin/creators' },
  { label: 'Users / Fans',    icon: Users,           path: '/admin/users' },
  { label: 'Transactions',    icon: DollarSign,      path: '/admin/transactions' },
  { label: 'Content',         icon: Rss,             path: '/admin/content', badge: 3 },
  { label: 'Analytics',       icon: BarChart3,       path: '/admin/analytics' },
  { label: 'Settings',        icon: Settings,        path: '/admin/settings' },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 px-6 py-6 border-b border-border shrink-0">
        <span className="text-xl font-black tracking-tighter text-primary">Hideaway</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Admin</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, path, badge }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                active
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {badge}
                </span>
              )}
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-3 py-4 space-y-1 shrink-0">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium"
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-muted/30 border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-[200] lg:hidden flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-64 h-full bg-background border-r border-border flex flex-col shadow-2xl animate-slide-in-left">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Bar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-sm font-bold text-foreground">
                {navItems.find(n => n.path === location.pathname)?.label ?? 'Admin'}
              </div>
              <div className="text-[10px] text-muted-foreground hidden sm:block">Hideaway Platform Admin</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold truncate max-w-[120px]">{user?.user_metadata?.name || user?.user_metadata?.full_name || 'Admin'}</div>
                <div className="text-[10px] text-primary font-semibold truncate max-w-[120px]">{user?.email || 'admin@hideaway'}</div>
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
