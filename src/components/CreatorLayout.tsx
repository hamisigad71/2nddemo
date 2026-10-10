import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Users, DollarSign, Plus, MessageCircle, FolderHeart, Settings, Bell, Menu, X, LineChart, Bot, Calendar, Tag, LogOut, Sun, Moon, Rss, BookOpen, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface CreatorLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
  { name: 'My Feed', path: '/feed', icon: Rss },
  { name: 'Creator Playbook', path: '/guide', icon: BookOpen },
  { name: 'Analytics', path: '/analytics', icon: LineChart },
  { name: 'Messages', path: '/messages', icon: MessageCircle },
  { name: 'Automations', path: '/automations', icon: Bot },
  { name: 'Vault', path: '/vault', icon: FolderHeart },
  { name: 'Scheduling', path: '/scheduling', icon: Calendar },
  { name: 'Fans', path: '/fans', icon: Users },
  { name: 'Promotions', path: '/promotions', icon: Tag },
  { name: 'Wallet', path: '/wallet', icon: DollarSign },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Escort Application', path: '/escort-application', icon: Heart },
];

const CreatorLayout: React.FC<CreatorLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.svg" alt="Logo" className="w-9 h-9 object-contain drop-shadow-md" />
          <span className="text-lg font-bold tracking-tighter text-foreground">The Gents Dollhouse<span className="text-primary">.</span></span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -mr-2 text-foreground">
          <Menu className="w-7 h-7" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-background/95 md:bg-background/80 backdrop-blur-3xl border-r border-border p-5 flex flex-col h-screen transform transition-all duration-300 md:relative md:translate-x-0 shadow-2xl md:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6 pl-2">
           <Link to="/" className="hidden md:flex items-center gap-2.5 group">
             <img src="/logo.svg" alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" />
             <span className="text-xl font-bold tracking-tighter text-foreground leading-tight">The Gents Dollhouse<span className="text-primary">.</span></span>
           </Link>
           <span className="text-lg font-bold md:hidden">Menu</span>
           <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-muted-foreground hover:bg-white/10 rounded-full transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide px-1 pb-6 -mx-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? 'text-primary bg-primary/10 font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full shadow-[0_0_10px_var(--primary)]" />
                )}
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'} shrink-0`} />
                <span className="text-[15px]">{item.name}</span>
              </Link>
            );
          })}
          
          <div className="pt-2 mt-4 pb-4 px-2">
            <Link to="/create-post" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-xl transition-all duration-200 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-primary/40 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl" />
              <Plus className="w-5 h-5 relative z-10" /> <span className="relative z-10">Create Post</span>
            </Link>
          </div>
        </nav>
        
        <div className="pt-4 mt-auto shrink-0 mb-safe gap-2 flex flex-col border-t border-border/50 relative z-10 pt-5">
           <div className="p-2.5 bg-foreground/5 hover:bg-foreground/10 border border-border/50 rounded-2xl flex items-center justify-between transition-colors">
             <Link to="/edit-profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 w-full group overflow-hidden pl-1">
               <img src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "https://i.pinimg.com/736x/c9/27/d6/c927d6a930299f0e5d0be9b217d09b16.jpg"} alt="avatar" referrerPolicy="no-referrer" className="w-[38px] h-[38px] rounded-full ring-2 ring-primary/20 shrink-0 group-hover:ring-primary/50 transition-all object-cover" />
               <div className="flex-1 min-w-0 pr-2">
                  <div className="font-semibold text-[14px] truncate text-foreground group-hover:text-primary transition-colors">{user?.user_metadata?.name || user?.user_metadata?.full_name || "Jane Doe"}</div>
                  <div className="text-[12px] text-muted-foreground truncate">View Profile</div>
               </div>
             </Link>
             <button onClick={handleLogout} className="p-2.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-colors shrink-0" title="Logout">
               <LogOut className="w-[18px] h-[18px]" />
             </button>
           </div>
           
           <button 
              onClick={toggleTheme} 
              className="flex items-center justify-between px-3.5 py-3 rounded-xl transition-colors font-medium border border-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground w-full"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="text-[14px]">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-12">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navbar (quick access) */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-y-full' : 'translate-y-0'}`}
        style={{
          background: 'color-mix(in srgb, var(--color-background) 92%, transparent)',
          borderTop: '1px solid color-mix(in srgb, var(--color-border) 60%, transparent)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
        }}
      >
          {[
            { name: 'Home', path: '/dashboard', icon: BarChart3 },
            { name: 'Feed', path: '/feed', icon: Rss },
            { name: 'Post', path: '/create-post', icon: Plus, isAction: true },
            { name: 'Messages', path: '/messages', icon: MessageCircle },
            { name: 'Wallet', path: '/wallet', icon: DollarSign },
          ].map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            if (item.isAction) {
              return (
                <Link key={item.name} to={item.path}
                  className="flex items-center justify-center w-14 h-14 rounded-full -mt-7 transition-all duration-300 hover:scale-110 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, var(--color-secondary)))',
                    boxShadow: '0 4px 20px color-mix(in srgb, var(--color-primary) 60%, transparent), 0 0 0 3px color-mix(in srgb, var(--color-background) 100%, transparent), 0 0 0 4px color-mix(in srgb, var(--color-primary) 30%, transparent)',
                  }}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </Link>
              );
            }
            return (
              <Link key={item.name} to={item.path}
                className="relative flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-2xl transition-all duration-200 active:scale-90"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                  background: isActive ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
                }}
              >
                <Icon 
                  className="w-5 h-5 transition-all duration-200"
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ filter: isActive ? 'drop-shadow(0 0 6px color-mix(in srgb, var(--color-primary) 80%, transparent))' : 'none' }}
                />
                <span className="text-[9px] font-bold tracking-wide">{item.name}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                    style={{ background: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)' }}
                  />
                )}
              </Link>
            );
          })}
      </nav>

    </div>
  );
};

export default CreatorLayout;
