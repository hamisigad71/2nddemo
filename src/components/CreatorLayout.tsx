import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Users, DollarSign, Plus, MessageCircle, FolderHeart, Settings, Bell, Menu, X, LineChart, Bot, Calendar, Tag, LogOut } from 'lucide-react';

interface CreatorLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
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
];

const CreatorLayout: React.FC<CreatorLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    // Basic logout logic for now. 
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-40">
        <Link to="/" className="text-xl font-bold tracking-tighter text-primary">MALI<span className="text-muted-foreground">.</span></Link>
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-background md:bg-input/10 border-r border-border p-6 flex flex-col h-screen transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8 md:mb-10">
           <Link to="/" className="text-2xl font-bold tracking-tighter text-primary hidden md:block">MALI<span className="text-muted-foreground">.</span></Link>
           <span className="text-lg font-bold md:hidden">Menu</span>
           <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-full">
             <X className="w-6 h-6" />
           </button>
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
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-input hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" /> {item.name}
              </Link>
            );
          })}
          <div className="pt-4 mt-2 mb-8">
            <Link to="/create-post" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-xl transition-colors font-bold shadow-lg shadow-primary/20 hover:scale-[1.02]">
              <Plus className="w-5 h-5" /> Create Post
            </Link>
          </div>
        </nav>
        
        <div className="pt-6 border-t border-border mt-auto shrink-0 mb-safe">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 w-full">
               <img src="https://i.pravatar.cc/150?img=12" alt="avatar" className="w-10 h-10 rounded-full border border-border shrink-0" />
               <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">Jane Doe</div>
                  <Link to="/edit-profile" onClick={() => setIsMobileMenuOpen(false)} className="text-xs text-primary hover:underline truncate block">Edit Profile</Link>
               </div>
               <button onClick={handleLogout} className="p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors shrink-0" title="Logout">
                 <LogOut className="w-5 h-5" />
               </button>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-12">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navbar (quick access) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-2 z-50">
        {[
          { name: 'Home', path: '/dashboard', icon: BarChart3 },
          { name: 'Vault', path: '/vault', icon: FolderHeart },
          { name: 'Post', path: '/create-post', icon: Plus, isAction: true },
          { name: 'Messages', path: '/messages', icon: MessageCircle },
          { name: 'Wallet', path: '/wallet', icon: DollarSign },
        ].map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          if (item.isAction) {
            return (
              <Link key={item.name} to={item.path}
                className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 -mt-5 hover:scale-105 transition-transform">
                <Icon className="w-6 h-6" />
              </Link>
            );
          }
          return (
            <Link key={item.name} to={item.path}
              className={`flex flex-col items-center justify-center gap-1 w-14 h-12 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className={`w-6 h-6 ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
};

export default CreatorLayout;
