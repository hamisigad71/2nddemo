import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallAppPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running standalone
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // 3. Check dismissal expiry (5 days)
    const dismissedTime = localStorage.getItem('tgd_pwa_dismissed');
    const isRecentDismissal = dismissedTime && (Date.now() - parseInt(dismissedTime, 10)) < 1000 * 60 * 60 * 24 * 5;

    // 4. Capture native browser prompt (Android Chrome, Edge, Samsung)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isRecentDismissal) {
        // Small delay so page loads smoothly before showing banner
        setTimeout(() => setShowPrompt(true), 1800);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. On iOS, show custom prompt after delay if not recently dismissed
    if (isIOSDevice && !isRecentDismissal) {
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // 6. Allow any button across the app to manually trigger the install prompt
    const handleManualTrigger = () => {
      setShowPrompt(true);
      if (isIOSDevice) setShowIOSInstructions(true);
    };

    window.addEventListener('open_pwa_install_prompt', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open_pwa_install_prompt', handleManualTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback if browser prompt was consumed
      alert('To install The Gents Dollhouse on your device:\n\n1. Open browser menu (3 dots at top-right)\n2. Tap "Install App" or "Add to Home screen"');
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('tgd_pwa_dismissed', Date.now().toString());
  };

  // Don't render if already in standalone app mode or dismissed
  if (isStandalone || !showPrompt) return null;

  return (
    <aside 
      aria-label="Install mobile application"
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:top-5 z-50 sm:max-w-md animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="bg-[#111218]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col gap-3">
        
        {/* Main Row */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img 
              src="/icon-192.png" 
              alt="The Gents Dollhouse" 
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-rose-600 flex items-center justify-center text-white ring-1 ring-[#111218]">
              <Download className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight truncate">
                Install The Gents Dollhouse
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight mt-0.5 truncate">
              Add to Home Screen for 1-tap private access
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-rose-950/40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            <button
              onClick={handleDismiss}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* iOS Step-by-Step Helper (if on iPhone/Safari) */}
        {showIOSInstructions && (
          <div className="pt-3 border-t border-white/[0.08] text-xs text-zinc-300 space-y-2 animate-in fade-in duration-200">
            <div className="text-[11px] font-semibold text-rose-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
              <span>How to add on iPhone:</span>
            </div>
            <ol className="text-[11px] text-zinc-400 space-y-1 pl-1">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] text-white shrink-0">1</span>
                <span>Tap the Safari <strong className="text-white">Share</strong> button <Share className="w-3 h-3 inline mx-0.5 text-rose-400" /> at bottom of screen.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] text-white shrink-0">2</span>
                <span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong> <PlusSquare className="w-3 h-3 inline mx-0.5 text-rose-400" />.</span>
              </li>
            </ol>
          </div>
        )}

      </div>
    </aside>
  );
};

export default InstallAppPrompt;

