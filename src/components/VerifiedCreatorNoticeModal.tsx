import React, { useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, UserCheck, Lock, ArrowRight, Sparkles } from 'lucide-react';

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
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-[#0b0c10] border border-red-500/25 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-red-950/40 text-white z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Subtle Top Red Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-red-600/15 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors border border-white/10 cursor-pointer z-20"
          aria-label="Close notice"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Verified Badge Icon Header */}
        <div className="flex flex-col items-center text-center relative z-10 pt-1">
          <div className="relative mb-3.5">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-red-600/20 via-zinc-900 to-black border border-red-500/40 flex items-center justify-center shadow-xl shadow-red-600/20 ring-4 ring-red-500/10">
              <CheckCircle2 className="w-9 h-9 sm:w-10 sm:h-10 text-white fill-blue-500 drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full ring-2 ring-[#0b0c10] shadow">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            Official Trust & Safety Notice
          </span>

          <h2 id="verified-notice-title" className="text-xl sm:text-2xl font-black text-white tracking-tight mt-3 mb-2">
            Verified Creators Guarantee
          </h2>

          <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed max-w-sm">
            All creators carrying the <span className="text-blue-400 font-bold inline-flex items-center gap-1">Blue Verified Badge <CheckCircle2 className="w-3.5 h-3.5 text-white fill-blue-500 inline shrink-0" /></span> are 100% real, authentic creators screened by our team.
          </p>
        </div>

        {/* Verification Pillars - Uniform cards */}
        <div className="my-5 space-y-2.5 relative z-10">
          <div className="p-3.5 rounded-2xl bg-[#121319] border border-zinc-800/80 hover:border-red-500/30 transition-all flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                Government ID Authentication
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                Submitted valid Kenyan National ID or Passport reviewed by our compliance team.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#121319] border border-zinc-800/80 hover:border-red-500/30 transition-all flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                Live Biometric Selfie Match
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                Live selfie verification holding ID to guarantee person in photos is genuinely them.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#121319] border border-zinc-800/80 hover:border-red-500/30 transition-all flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                Direct & Protected Connection
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                Direct messages, tips, and unlocks connect straight to the verified creator on encrypted channels.
              </p>
            </div>
          </div>
        </div>

        {/* Visual Badge Preview Tag - Uniform sleek dark style */}
        <div className="mb-5 p-3 rounded-2xl bg-[#121319] border border-zinc-800/90 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400 text-[11px]">How to identify:</span>
            <span className="font-bold text-white text-[12px] flex items-center gap-1">
              @creator <CheckCircle2 className="w-3.5 h-3.5 text-white fill-blue-500 inline shrink-0" />
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            Verified Real
          </span>
        </div>

        {/* Action Button - Brand Red Luxury Theme */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm tracking-wide shadow-lg shadow-red-600/30 border border-red-400/40 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <span>I Understand — Explore Verified Creators</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[10px] text-zinc-500 mt-3 font-medium">
          The Gents Dollhouse Trust & Safety • Continuous Identity Monitoring
        </p>
      </div>
    </div>
  );
};

export default VerifiedCreatorNoticeModal;

