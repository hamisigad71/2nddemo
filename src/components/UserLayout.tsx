import { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, FolderHeart, CreditCard, Wallet, Settings, Menu, X, LogOut, Search } from 'lucide-react';
import BottomNav from './BottomNav';

interface UserLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Feed', path: '/user', icon: Home },
  { name: 'Messages', path: '/user/messages', icon: MessageCircle },
  { name: 'Purchases', path: '/user/vault', icon: FolderHeart },
  { name: 'Subscriptions', path: '/user/subscriptions', icon: CreditCard },
  { name: 'Payment Methods', path: '/user/payments', icon: Wallet },
  { name: 'Settings', path: '/user/settings', icon: Settings },
];

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-40 shadow-sm">
        <Link to="/user" className="text-xl font-bold tracking-tighter text-primary">Hideaway<span className="text-muted-foreground">.</span></Link>
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-background border-r border-border p-6 flex flex-col h-screen transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6 md:mb-10">
           <Link to="/user" className="text-2xl font-bold tracking-tighter text-primary hidden md:block">Hideaway<span className="text-muted-foreground">.</span></Link>
           <span className="text-lg font-bold md:hidden">Menu</span>
           <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-full">
             <X className="w-6 h-6" />
           </button>
        </div>

        {/* Global Search (Optional, for discovering creators) */}
        <div className="relative mb-6">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <input type="text" placeholder="Discover creators..." className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-hide -mx-2 px-2 pb-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                  isActive
                    ? 'bg-secondary/10 text-secondary font-bold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" /> {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="pt-6 border-t border-border mt-auto shrink-0 mb-safe">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 w-full">
               <img src="https://i.pravatar.cc/150?img=50" alt="avatar" className="w-10 h-10 rounded-full border border-border shrink-0" />
               <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">Fan User</div>
                  <Link to="/user/settings" onClick={() => setIsMobileMenuOpen(false)} className="text-xs text-secondary hover:underline truncate block">View Profile</Link>
               </div>
               <button onClick={handleLogout} className="p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors shrink-0" title="Logout">
                 <LogOut className="w-5 h-5" />
               </button>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-1 w-full overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8 bg-muted/5">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav scrollRef={mainRef} />
    </div>
  );
};

export default UserLayout;
