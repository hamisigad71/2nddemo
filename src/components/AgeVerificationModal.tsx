import { useState, useEffect } from 'react';
import { ArrowRight, Lock } from 'lucide-react';

const AGE_VERIFICATION_STORAGE_KEY = 'tgd_age_verified_18';

export default function AgeVerificationModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already verified they are 18 or above
    const isVerified = localStorage.getItem(AGE_VERIFICATION_STORAGE_KEY);
    if (!isVerified) {
      setIsOpen(true);
    }
  }, []);

  const handleConfirmAge = () => {
    localStorage.setItem(AGE_VERIFICATION_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleUnder18 = () => {
    // Redirect minors away from the platform safely
    window.location.href = 'https://www.google.com';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Background glow styling */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black -z-10" />

      <div className="w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(220,38,38,0.25)] flex flex-col items-center text-center relative overflow-hidden">
        {/* Accent top line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        {/* 18+ Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600/20 via-zinc-900 to-black border border-red-500/30 flex items-center justify-center mb-6 shadow-lg shadow-red-600/20">
          <span className="text-2xl font-black text-red-500 tracking-tight flex items-center">
            18<span className="text-lg">+</span>
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">
          Age Verification
        </h2>
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-red-600/10 border border-red-600/30 text-red-400 rounded-full mb-4">
          The Gents Dollhouse
        </span>

        {/* Notice text */}
        <p className="text-zinc-300 text-sm leading-relaxed mb-6">
          This website contains adult creator content, VIP media, and services intended strictly for mature audiences.
          <br /><br />
          You must be at least <span className="text-white font-bold">18 years of age</span> or the age of legal majority in your jurisdiction to enter.
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={handleConfirmAge}
            className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(220,38,38,0.35)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>I Am 18 or Older — Enter</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleUnder18}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-xs transition-all border border-white/5 cursor-pointer"
          >
            I Am Under 18 (Exit)
          </button>
        </div>

        {/* Security footer disclaimer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <Lock className="w-3.5 h-3.5" />
          <span>Strictly enforced 18+ compliance policy</span>
        </div>
      </div>
    </div>
  );
}
