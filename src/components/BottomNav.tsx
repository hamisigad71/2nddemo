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
  scrollRef?: React.RefObject<HTMLElement | null>;
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
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
      style={{
        background: 'color-mix(in srgb, var(--color-background) 92%, transparent)',
        borderTop: '1px solid color-mix(in srgb, var(--color-border) 60%, transparent)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
      }}
    >
        {navItems.map(({ label, path, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
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
              <span className="text-[9px] font-bold tracking-wide">{label}</span>
              {isActive && (
                <span
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)' }}
                />
              )}
            </Link>
          );
        })}
    </nav>
  );
};

export default BottomNav;
