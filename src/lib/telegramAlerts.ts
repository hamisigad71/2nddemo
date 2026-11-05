interface ReportErrorOptions {
  action: string;
  error: any;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  } | null;
  context?: Record<string, any>;
}

// In-memory cache to prevent flooding Telegram with the same repeating error
const recentAlerts = new Map<string, number>();
const DEDUP_WINDOW_MS = 15000; // 15 seconds cooldown for identical errors

/**
 * Sends a real-time error alert to your Telegram Bot
 */
export async function sendTelegramErrorAlert(options: ReportErrorOptions): Promise<boolean> {
  try {
    const errorMessage =
      options.error instanceof Error
        ? options.error.message || options.error.stack || String(options.error)
        : typeof options.error === 'object'
        ? JSON.stringify(options.error)
        : String(options.error);

    // Deduplication key
    const dedupeKey = `${options.action}:${errorMessage}:${options.user?.id || 'guest'}`;
    const lastSent = recentAlerts.get(dedupeKey);
    const now = Date.now();
    if (lastSent && now - lastSent < DEDUP_WINDOW_MS) {
      return false; // Skip duplicate alert within 15 seconds
    }
    recentAlerts.set(dedupeKey, now);

    const payload = {
      action: options.action,
      error: errorMessage,
      user: options.user || null,
      context: options.context || {},
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
    };

    const res = await fetch('/api/alerts/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    // Fail silently in the background so error reporting never breaks app UX
    console.warn('Failed to send Telegram error alert:', err);
    return false;
  }
}

