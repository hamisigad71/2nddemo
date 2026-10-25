/**
 * Centralized date parsing & relative time formatting utility.
 * Guarantees reliable handling of Supabase UTC timestamps and prevents clock skew bugs.
 */

export function parseNotificationDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  let s = String(dateStr).trim();
  if (!s) return new Date();
  if (!s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatTimeAgo(dateStr?: string | null): string {
  try {
    const d = parseNotificationDate(dateStr);
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 60 * 1000) return 'Just now';
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export interface UserPresenceStatus {
  isOnline: boolean;
  label: string;
  shortLabel: string;
}

export function formatLastSeenStatus(dateStr?: string | null): UserPresenceStatus {
  if (!dateStr) {
    return { isOnline: false, label: 'Offline', shortLabel: 'Offline' };
  }

  try {
    const d = parseNotificationDate(dateStr);
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) {
      return { isOnline: true, label: 'Online now', shortLabel: 'Online' };
    }

    const diffMin = Math.floor(diffMs / (1000 * 60));
    // Active within 5 minutes is considered currently online
    if (diffMin < 5) {
      return { isOnline: true, label: 'Online now', shortLabel: 'Online' };
    }

    if (diffMin < 60) {
      return { isOnline: false, label: `Active ${diffMin}m ago`, shortLabel: `${diffMin}m ago` };
    }

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) {
      return { isOnline: false, label: `Active ${diffHr}h ago`, shortLabel: `${diffHr}h ago` };
    }

    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) {
      return { isOnline: false, label: 'Active yesterday', shortLabel: 'Yesterday' };
    }

    if (diffDays < 7) {
      return { isOnline: false, label: `Active ${diffDays}d ago`, shortLabel: `${diffDays}d ago` };
    }

    return {
      isOnline: false,
      label: `Active ${d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}`,
      shortLabel: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
    };
  } catch {
    return { isOnline: false, label: 'Offline', shortLabel: 'Offline' };
  }
}

