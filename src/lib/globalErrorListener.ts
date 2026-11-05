import { sendTelegramErrorAlert } from './telegramAlerts';

/**
 * Attaches global listeners to capture EVERY error that occurs across the entire platform:
 * 1. window.onerror: Uncaught runtime JS exceptions
 * 2. window.onunhandledrejection: Asynchronous unhandled promise failures (uploads, DB queries, network calls)
 * 3. console.error override: Explicit console.error logging from libraries, Supabase, and custom catches
 */
export function initGlobalErrorCapture() {
  if (typeof window === 'undefined') return;

  // Helper to extract currently logged in user info from localStorage if available
  const getCurrentUserContext = () => {
    try {
      const keys = Object.keys(localStorage);
      const authKey = keys.find((k) => k.includes('auth-token') || k.includes('supabase.auth.token'));
      if (authKey) {
        const parsed = JSON.parse(localStorage.getItem(authKey) || '{}');
        const user = parsed?.user || parsed?.currentSession?.user;
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email,
            role: user.user_metadata?.role || localStorage.getItem('pendingAuthRole') || 'user',
          };
        }
      }
    } catch {}
    return null;
  };

  // 1. Uncaught synchronous runtime errors
  window.addEventListener('error', (event) => {
    // Ignore harmless browser noise (e.g., extensions, ResizeObserver)
    const msg = event.message || '';
    if (
      msg.includes('ResizeObserver') ||
      msg.includes('Script error.') ||
      msg.includes('canceled') ||
      msg.includes('Extension') ||
      event.filename?.includes('chrome-extension')
    ) {
      return;
    }

    sendTelegramErrorAlert({
      action: 'Uncaught Global Runtime Exception',
      error: `${msg}\nAt: ${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0}`,
      user: getCurrentUserContext(),
      context: {
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack?.slice(0, 400),
      },
    });
  });

  // 2. Unhandled promise rejections (Failed async uploads, Supabase mutations, fetch failures)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : typeof reason === 'object' ? JSON.stringify(reason) : String(reason || '');

    if (
      msg.includes('ResizeObserver') ||
      msg.includes('AbortError') ||
      msg.includes('canceled') ||
      msg.includes('cancelled')
    ) {
      return;
    }

    sendTelegramErrorAlert({
      action: 'Unhandled Async Promise Rejection',
      error: msg,
      user: getCurrentUserContext(),
      context: {
        stack: reason?.stack?.slice(0, 400),
      },
    });
  });

  // 3. Intercept console.error to catch Supabase/API errors that get logged but not thrown
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    try {
      const firstArg = args[0];
      const errorString = args
        .map((a) => (a instanceof Error ? a.message || a.stack : typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');

      // Only forward high-signal errors, avoid normal dev notices or benign warnings
      const isHighSignalError =
        errorString.includes('supabase') ||
        errorString.includes('StorageApiError') ||
        errorString.includes('PostgrestError') ||
        errorString.includes('Failed to load') ||
        errorString.includes('timeout') ||
        errorString.includes('Database insert error') ||
        errorString.includes('Upload failed') ||
        errorString.includes('payment') ||
        errorString.includes('M-Pesa') ||
        errorString.includes('Paystack') ||
        errorString.includes('KYC') ||
        firstArg instanceof Error;

      const isBenign =
        errorString.includes('ResizeObserver') ||
        errorString.includes('Download the React DevTools') ||
        errorString.includes('favicon.ico');

      if (isHighSignalError && !isBenign) {
        sendTelegramErrorAlert({
          action: 'Platform Console Exception / Network Error',
          error: errorString.slice(0, 500),
          user: getCurrentUserContext(),
        });
      }
    } catch {}

    originalConsoleError.apply(console, args);
  };
}

