import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';

const FloatingNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 80) {
        // Near the top — always hide
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling UP — show
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling DOWN — hide
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Don't show on the landing page or login/signup to keep them focused
  if (['/', '/login', '/signup', '/forgot-password'].includes(location.pathname)) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100 visible' : 'translate-y-10 opacity-0 invisible'
      }`}
    >
      <div className="flex items-center gap-1 bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => navigate(-1)}
          className="p-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
        
        <button
          onClick={() => navigate('/discover')}
          className="p-3 rounded-full text-white/70 hover:text-white hover:bg-primary/20 hover:text-primary transition-all hover:scale-105 active:scale-95"
          aria-label="Go Home"
        >
          <Home className="w-5 h-5" />
        </button>
        
        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
        
        <button
          onClick={() => navigate(1)}
          className="p-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
          aria-label="Go Forward"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default FloatingNav;
