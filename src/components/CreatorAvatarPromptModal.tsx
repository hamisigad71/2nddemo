import React, { useEffect } from 'react';
import { Camera, Sparkles, X, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DEFAULT_AVATAR } from '../lib/avatar';

interface CreatorAvatarPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName?: string;
}

export const CreatorAvatarPromptModal: React.FC<CreatorAvatarPromptModalProps> = ({
  isOpen,
  onClose,
  creatorName = 'Creator',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoToEdit = () => {
    onClose();
    if (location.pathname !== '/edit-profile') {
      navigate('/edit-profile');
    }
    // Scroll to top where avatar uploader is located
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-prompt-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#0e0f14] border border-zinc-200 dark:border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl dark:shadow-red-500/15 text-zinc-900 dark:text-white z-10 overflow-hidden animate-in zoom-in-95 duration-200 text-center">
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-28 bg-red-600/10 dark:bg-red-600/20 blur-3xl pointer-events-none rounded-full" />

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors border border-zinc-200 dark:border-white/10 cursor-pointer"
          aria-label="Close notice"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Visual Showcase: Current Default Silhouette Icon with Animated Camera Action */}
        <div className="flex flex-col items-center mb-5 relative z-10">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 shadow-xl shadow-red-600/20">
              <img
                src={DEFAULT_AVATAR}
                alt="Default Avatar"
                className="w-full h-full rounded-full object-cover bg-zinc-100 dark:bg-black"
              />
            </div>
            {/* Camera Floating Action Icon */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-600 border-2 border-white dark:border-[#0e0f14] flex items-center justify-center text-white shadow-lg animate-bounce">
              <Camera className="w-4 h-4" />
            </div>
          </div>

          <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Profile Action Needed
          </span>
        </div>

        {/* Text Content */}
        <h2 id="avatar-prompt-title" className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
          Upload Your Profile Photo
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6">
          Hey <strong className="text-zinc-900 dark:text-white">{creatorName}</strong>! Your creator account is currently using the default placeholder icon. Upload your real photo to get discovered by fans, boost subscribers, and build trust.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            type="button"
            onClick={handleGoToEdit}
            className="w-full py-3.5 px-5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.35)] transition-all cursor-pointer"
          >
            <span>Upload Profile Photo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatorAvatarPromptModal;

