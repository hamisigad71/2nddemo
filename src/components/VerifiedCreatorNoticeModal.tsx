import React, { useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, UserCheck, Sparkles, Lock, ArrowRight } from 'lucide-react';

interface VerifiedCreatorNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerifiedCreatorNoticeModal: React.FC<VerifiedCreatorNoticeModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Lock body scroll while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verified-notice-title"
    >
      {/* Blurred Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-[#0e0f14] dark:bg-[#0e0f14] border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-500/10 text-white z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Subtle Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-blue-600/15 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors border border-white/10 cursor-pointer"
          aria-label="Close notice"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Verified Badge Icon Header */}
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="relative mb-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-indigo-900/30 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10">
              <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-white fill-blue-500 drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black p-1 rounded-full ring-2 ring-[#0e0f14]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Official Trust & Safety Notice
          </span>

          <h2 id="verified-notice-title" className="text-xl sm:text-2xl font-black text-white tracking-tight mt-3 mb-2">
            Verified Creators Guarantee
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-sm">
            All creators carrying the <span className="text-blue-400 font-bold inline-flex items-center gap-1">Blue Verified Badge <CheckCircle2 className="w-3.5 h-3.5 text-white fill-blue-500 inline shrink-0" /></span> are 100% real, authentic creators who have passed official screening.
          </p>
        </div>

        {/* Verification Pillars */}
        <div className="my-5 sm:my-6 space-y-2.5 relative z-10">
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 flex items-start gap-3 transition-colors hover:border-blue-500/30">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Government ID Authentication
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5 font-medium">
                Every verified creator has submitted a valid Kenyan National ID or Passport reviewed by our compliance team.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 flex items-start gap-3 transition-colors hover:border-blue-500/30">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Live Biometric Selfie Match
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5 font-medium">
                Creators must submit a live selfie holding their ID to prove they are genuinely the person in their photos. No catfishing or impersonation.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 flex items-start gap-3 transition-colors hover:border-blue-500/30">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Direct & Protected Connection
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5 font-medium">
                Your direct messages, tips, and unlocks connect straight to the verified creator on secure, encrypted channels.
              </p>
            </div>
          </div>
        </div>

        {/* Visual Badge Preview Tag */}
        <div className="mb-6 p-3 rounded-xl bg-blue-950/30 border border-blue-500/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-zinc-400 text-[11px]">How to identify:</span>
            <span className="font-bold text-white text-[12px] flex items-center gap-1">
              @creator <CheckCircle2 className="w-3.5 h-3.5 text-white fill-blue-500 inline shrink-0" />
            </span>
          </div>
          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30">
            Verified Real
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-600/25 border border-blue-400/40 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <span>I Understand — Explore Verified Creators</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[10px] text-zinc-400 mt-3 font-medium">
          Mali Trust & Safety Policy • Continuous Identity Monitoring
        </p>
      </div>
    </div>
  );
};

export default VerifiedCreatorNoticeModal;

