import { useEffect, useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getPageLoaderPresentation } from '../lib/pageLoaderPresentation';

interface PageLoaderProps {
  onComplete: () => void;
  onReady?: () => void;
}

const PageLoader = ({ onComplete, onReady }: PageLoaderProps) => {
  const { theme } = useTheme();
  const presentation = getPageLoaderPresentation(theme);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  const onReadyRef = useRef(onReady);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onReadyRef.current = onReady;
    onCompleteRef.current = onComplete;
  }, [onReady, onComplete]);

  useEffect(() => {
    const steps = [
      { target: 30, delay: 30 },
      { target: 65, delay: 20 },
      { target: 85, delay: 30 },
      { target: 100, delay: 15 },
    ];

    let current = 0;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        setTimeout(() => {
          if (onReadyRef.current) onReadyRef.current();
          setFading(true);
          setTimeout(() => {
            if (onCompleteRef.current) onCompleteRef.current();
          }, 600);
        }, 200);
        return;
      }

      const { target, delay } = steps[stepIndex];
      const interval = setInterval(() => {
        current += 1;
        setProgress(current);
        if (current >= target) {
          clearInterval(interval);
          setTimeout(() => runStep(stepIndex + 1), 120);
        }
      }, delay);
    };

    runStep(0);
  }, []);

  return (
    <div
      role="status"
      aria-label="Preparing The Gents Dollhouse"
      className={`page-loader-motion fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Base desktop background */}
      <div className="hidden md:block absolute inset-0 bg-background" />

      {/* Desktop faint background image */}
      <img
        src="/logo2.png"
        alt=""
        className="hidden md:block absolute inset-0 w-full h-full object-cover object-center opacity-[3.03] pointer-events-none"
        loading="eager"
      />

      {/* Mobile background image */}
      {presentation.showMobilePhoto && <img
        src="https://i.pinimg.com/736x/b1/39/54/b13954cc1f7c47fac66562a002262af9.jpg"
        alt=""
        className="md:hidden absolute inset-0 w-full h-full object-cover object-center pointer-events-none filter saturate-[0.85]"
        loading="eager"
      />}
      
      {/* Mobile overlay - subtle dark gradient to ensure legibility while keeping image crisp */}
      {presentation.showMobilePhoto && (
        <div className="md:hidden absolute inset-0 bg-black/40 bg-gradient-to-t from-[#13141A] via-[#13141A]/50 to-black/60 backdrop-blur-[3px] pointer-events-none" />
      )}
      {!presentation.showMobilePhoto && <div className={presentation.mobileBackdrop} aria-hidden="true" />}

      {/* Ambient background glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="page-loader-motion absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 15%, transparent) 0%, transparent 70%)',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'loader-pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="page-loader-motion absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 10%, transparent) 0%, transparent 70%)',
            bottom: '20%',
            right: '15%',
            animation: 'loader-pulse2 5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Central content */}
      <div className={`relative flex flex-col items-center gap-8 ${presentation.surface}`}>

        {/* Spinning rings + logo */}
        <div className="relative w-24 h-24 flex items-center justify-center">

          {/* Outer rotating dashed ring */}
          <svg
            className="page-loader-motion absolute inset-0 w-full h-full"
            style={{ animation: 'loader-spin 3s linear infinite' }}
            viewBox="0 0 96 96"
            fill="none"
          >
            <circle
              cx="48" cy="48" r="44"
              stroke="var(--color-primary)"
              strokeOpacity="0.25"
              strokeWidth="1.5"
              strokeDasharray="8 6"
            />
          </svg>

          {/* Inner counter-rotating ring */}
          <svg
            className="page-loader-motion absolute inset-0 w-full h-full"
            style={{ animation: 'loader-spin 2s linear infinite reverse' }}
            viewBox="0 0 96 96"
            fill="none"
          >
            <circle
              cx="48" cy="48" r="36"
              stroke="var(--color-secondary)"
              strokeOpacity="0.2"
              strokeWidth="1"
              strokeDasharray="4 10"
            />
          </svg>

          {/* Progress arc */}
          <svg
            className="page-loader-motion absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 96 96"
            fill="none"
          >
            <circle
              cx="48" cy="48" r="44"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.15s ease-out' }}
            />
          </svg>

          {/* Logo mark */}
          <div
            className="flex w-14 h-14 rounded-2xl items-center justify-center -ml-1"
          >
            <img 
              src="/logo3.png" 
              alt="Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center relative z-10 mt-4">
          <div className={`mb-1 text-2xl font-bold tracking-tight sm:text-3xl ${presentation.title} ${theme === 'dark' ? 'drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]' : ''}`}>
            The Gents Dollhouse<span className="text-red-500">.</span>
          </div>
          <p className={`text-xs font-semibold tracking-[0.18em] uppercase ${presentation.subtitle} ${theme === 'dark' ? 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]' : ''}`}>
            Creator Platform
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mt-2 flex w-56 flex-col items-center gap-3">
          <p className={`text-sm font-medium ${presentation.subtitle}`}>Getting things ready</p>
          <div
            className={`h-1.5 w-full overflow-hidden rounded-full ${presentation.progressTrack}`}
            role="progressbar"
            aria-label="Loading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="page-loader-motion h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #be123c, #e11d48)',
                transition: 'width 0.15s ease-out',
                boxShadow: theme === 'dark' ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
              }}
            />
          </div>
          <span className={`text-xs font-semibold tabular-nums ${presentation.progressText}`}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Bottom tagline */}
      <div
        className={`page-loader-motion absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[11px] font-semibold tracking-[0.12em] uppercase ${presentation.bottomTagline} ${theme === 'dark' ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : ''}`}
        style={{ animation: 'loader-fade-up 1s ease-out forwards' }}
      >
        Built for African creators
      </div>

      <style>{`
        @keyframes loader-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes loader-pulse {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
          50%       { opacity: 1;   transform: translateX(-50%) scale(1.15); }
        }
        @keyframes loader-pulse2 {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
        @keyframes loader-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .page-loader-motion { animation: none !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default PageLoader;
