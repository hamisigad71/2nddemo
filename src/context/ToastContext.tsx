import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  description?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global emitter so toast can be called without hooks if needed
type ToastListener = (type: ToastType, title: string, options?: ToastOptions) => void;
let globalToastListener: ToastListener | null = null;

export const toast = {
  success: (title: string, options?: ToastOptions) => {
    if (globalToastListener) globalToastListener('success', title, options);
  },
  error: (title: string, options?: ToastOptions) => {
    if (globalToastListener) globalToastListener('error', title, options);
  },
  warning: (title: string, options?: ToastOptions) => {
    if (globalToastListener) globalToastListener('warning', title, options);
  },
  info: (title: string, options?: ToastOptions) => {
    if (globalToastListener) globalToastListener('info', title, options);
  },
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    ...toast,
    toasts: context.toasts,
    removeToast: context.removeToast,
  };
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options?.duration ?? 4000;
    const newToast: ToastItem = {
      id,
      type,
      title,
      description: options?.description,
      duration,
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 visible

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  useEffect(() => {
    globalToastListener = (type, title, options) => {
      addToast(type, title, options);
    };
    return () => {
      globalToastListener = null;
    };
  }, [addToast]);

  const getTypeStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-950/20',
          glow: 'shadow-[0_8px_32px_rgba(16,185,129,0.15)]',
          barColor: 'bg-emerald-500',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-500',
          border: 'border-red-500/30',
          bg: 'bg-red-950/20',
          glow: 'shadow-[0_8px_32px_rgba(239,68,68,0.15)]',
          barColor: 'bg-red-500',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          border: 'border-red-500/30',
          bg: 'bg-red-950/20',
          glow: 'shadow-[0_8px_32px_rgba(239,68,68,0.15)]',
          barColor: 'bg-red-500',
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: 'text-sky-400',
          border: 'border-sky-500/30',
          bg: 'bg-sky-950/20',
          glow: 'shadow-[0_8px_32px_rgba(56,189,248,0.15)]',
          barColor: 'bg-sky-400',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Floating Toast Container */}
      <div 
        aria-live="polite" 
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const config = getTypeStyles(t.type);
          const IconComponent = config.icon;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-[#0e1017]/95 border ${config.border} backdrop-blur-xl ${config.glow} p-4 text-white shadow-2xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-xl ${config.bg} shrink-0`}>
                  <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                  <h4 className="text-xs sm:text-sm font-black tracking-tight text-white leading-snug">
                    {t.title}
                  </h4>
                  {t.description && (
                    <p className="text-xs text-zinc-400 font-medium mt-0.5 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Countdown line */}
              {t.duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                  <div
                    className={`h-full ${config.barColor} transition-all`}
                    style={{
                      animation: `shrinkWidth ${t.duration}ms linear forwards`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
