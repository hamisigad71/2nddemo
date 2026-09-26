import { useEffect, useState } from 'react';

interface PageLoaderProps {
  onComplete: () => void;
}

const PageLoader = ({ onComplete }: PageLoaderProps) => {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const steps = [
      { target: 30, delay: 80 },
      { target: 65, delay: 40 },
      { target: 85, delay: 60 },
      { target: 100, delay: 30 },
    ];

    let current = 0;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        setTimeout(() => {
          setFading(true);
          setTimeout(onComplete, 600);
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
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Base desktop background */}
      <div className="hidden md:block absolute inset-0 bg-background" />

      {/* Mobile background image */}
      <img
        src="https://i.pinimg.com/736x/b1/39/54/b13954cc1f7c47fac66562a002262af9.jpg"
        alt=""
        className="md:hidden absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        loading="eager"
      />
      
      {/* Mobile overlay - subtle dark gradient to ensure legibility while keeping image crisp */}
      <div className="md:hidden absolute inset-0 bg-black/40 bg-gradient-to-t from-background/90 via-transparent to-background/50 pointer-events-none" />

      {/* Ambient background glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 15%, transparent) 0%, transparent 70%)',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'loader-pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 10%, transparent) 0%, transparent 70%)',
            bottom: '20%',
            right: '15%',
            animation: 'loader-pulse2 5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Central content */}
      <div className="relative flex flex-col items-center gap-8">

        {/* Spinning rings + logo */}
        <div className="relative w-24 h-24 flex items-center justify-center">

          {/* Outer rotating dashed ring */}
          <svg
            className="absolute inset-0 w-full h-full"
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
            className="absolute inset-0 w-full h-full"
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
            className="absolute inset-0 w-full h-full -rotate-90"
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
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-background))',
              border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              className="text-2xl font-black tracking-tighter"
              style={{ color: 'var(--color-primary)' }}
            >
              H
            </span>
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <div className="text-3xl font-black tracking-tighter mb-1 text-foreground">
            Hideaway<span style={{ color: 'var(--color-secondary)' }}>.</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium tracking-[0.2em] uppercase">
            Creator Platform
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-48 flex flex-col items-center gap-2">
          <div className="w-full h-0.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                transition: 'width 0.15s ease-out',
                boxShadow: '0 0 8px color-mix(in srgb, var(--color-primary) 60%, transparent)',
              }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums text-primary">
            {progress}%
          </span>
        </div>
      </div>

      {/* Bottom tagline */}
      <div
        className="absolute bottom-10 text-[11px] text-muted-foreground font-medium tracking-widest uppercase"
        style={{ animation: 'loader-fade-up 1s ease-out forwards' }}
      >
        🇰🇪 Built for African Creators
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
      `}</style>
    </div>
  );
};

export default PageLoader;
