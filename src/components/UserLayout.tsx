import { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, FolderHeart, CreditCard, Wallet, Settings, Menu, X, LogOut, Search, Sun, Moon, Sparkles, ChevronRight } from 'lucide-react';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface UserLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Feed', path: '/user', icon: Home, badge: 'Live' },
  { name: 'Messages', path: '/user/messages', icon: MessageCircle },
  { name: 'Purchases', path: '/user/vault', icon: FolderHeart },
  { name: 'Subscriptions', path: '/user/subscriptions', icon: CreditCard },
  { name: 'Payment Methods', path: '/user/payments', icon: Wallet },
  { name: 'Settings', path: '/user/settings', icon: Settings },
];

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || "Fan User";
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "https://i.pravatar.cc/150?img=50";

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-foreground flex flex-col md:flex-row font-sans selection:bg-primary/30">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#0D0E12]/90 backdrop-blur-xl sticky top-0 z-40">
        <Link to="/user" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-emerald-500 to-amber-400 p-[1.5px] shadow-lg shadow-primary/20">
            <div className="w-full h-full bg-[#0D0E12] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          </div>
          <span className="text-xl font-black tracking-tight text-white">Hideaway<span className="text-primary">.</span></span>
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-[#0D0E12] border-r border-white/10 p-5 flex flex-col h-screen transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
        
        {/* Brand Header */}
        <div className="flex justify-between items-center mb-6 pt-1">
          <Link to="/user" className="flex items-center gap-2.5 group">
           
            <div>
              <div className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                Hideaway<span className="text-primary font-serif italic text-2xl leading-none">.</span>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 -mt-0.5">VIP Portal</div>
            </div>
          </Link>

          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Search Box */}
        <div className="relative mb-6 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search creators..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all shadow-inner" 
          />
        </div>

        {/* Navigation Items */}
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/50 px-3 mb-2">Navigation</div>
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar -mx-1 px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`relative flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group text-xs font-semibold ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-primary font-bold shadow-sm'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full shadow-lg shadow-primary" />
                )}

                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Settings */}
        <div className="pt-4 border-t border-white/10 mt-auto shrink-0 space-y-3">
          
          {/* User Profile Pill */}
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-between group hover:bg-white/[0.06] transition-all">
            <Link to="/user/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative">
                <img 
                  src={userAvatar} 
                  alt="avatar" 
                  referrerPolicy="no-referrer" 
                  className="w-9 h-9 rounded-xl object-cover border border-white/20 shadow-md group-hover:border-primary/50 transition-colors" 
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0D0E12]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">{userName}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  View Profile <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                </div>
              </div>
            </Link>
            
            <button 
              onClick={handleLogout} 
              className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all active:scale-95 shrink-0" 
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Switcher Toggle */}
          <button 
            onClick={toggleTheme} 
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-xs font-semibold text-muted-foreground hover:bg-white/[0.04] hover:text-foreground w-full"
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
      <main ref={mainRef} className="flex-1 w-full overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8 bg-[#0A0A0C]">
        <div className="w-full max-w-screen-2xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav scrollRef={mainRef} />
    </div>
  );
};

export default UserLayout;
