import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, MessageCircle, CreditCard, Settings, Flame } from 'lucide-react';

const navItems = [
  { label: 'Feed', path: '/user', icon: Home },
  { label: 'Discover', path: '/discover', icon: Compass },
  { label: 'Escorts', path: '/user/escorts', icon: Flame },
  { label: 'Messages', path: '/user/messages', icon: MessageCircle },
  { label: 'Subs', path: '/user/subscriptions', icon: CreditCard },
  { label: 'Settings', path: '/user/settings', icon: Settings },
];

interface BottomNavProps {
  scrollRef?: React.RefObject<HTMLElement | null>;
  hidden?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ scrollRef, hidden = false }) => {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const el = scrollRef?.current ?? document.documentElement;
    const getScrollTop = () =>
      el === document.documentElement ? window.scrollY : (el as HTMLElement).scrollTop;

    const handleScroll = () => {
      const currentY = getScrollTop();
      setVisible(currentY < lastY.current || currentY < 10);
      lastY.current = currentY;
    };

    const target = el === document.documentElement ? window : el;
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  const isShown = visible && !hidden;

  return (
    <nav
      aria-label="User Mobile Navigation"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-1.5 transition-all duration-300 border-t border-border/60 bg-background/90 backdrop-blur-xl shadow-lg shadow-black/20 ${
        isShown ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(({ label, path, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 focus-visible:outline-none ${
                isActive
                  ? 'text-primary font-bold bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium'
              }`}
            >
              <Icon
                className="w-5 h-5 transition-transform duration-200"
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[10px] tracking-tight mt-0.5">{label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
