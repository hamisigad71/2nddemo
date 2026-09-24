import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, MessageCircle, CreditCard, Settings } from 'lucide-react';

const navItems = [
  { label: 'Feed', path: '/user', icon: Home },
  { label: 'Discover', path: '/discover', icon: Compass },
  { label: 'Messages', path: '/user/messages', icon: MessageCircle },
  { label: 'Subs', path: '/user/subscriptions', icon: CreditCard },
  { label: 'Settings', path: '/user/settings', icon: Settings },
];

interface BottomNavProps {
  scrollRef?: React.RefObject<HTMLElement>;
}

const BottomNav: React.FC<BottomNavProps> = ({ scrollRef }) => {
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

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-2 shadow-2xl transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {navItems.map(({ label, path, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
            location.pathname === path ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Icon className="w-6 h-6" />
          <span className="text-[10px] font-semibold">{label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default BottomNav;
