/**
 * Default avatar constants and helpers for users and creators.
 * Provides a sleek, neutral luxury default profile silhouette icon for all new accounts.
 */

// Neutral dark luxury SVG avatar placeholder (128x128 SVG Data URI)
export const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%2318181b'/%3E%3Ccircle cx='64' cy='46' r='24' fill='%2352525b'/%3E%3Cpath d='M24 108c0-22.091 17.909-40 40-40s40 17.909 40 40' fill='%2352525b'/%3E%3C/svg%3E";

/**
 * Returns a high-resolution, dark-themed avatar for users.
 * If a name is provided and not generic, generates a matching styled initials badge;
 * otherwise returns the clean default profile silhouette.
 */
export const getDefaultAvatar = (name?: string | null): string => {
  if (name && typeof name === 'string') {
    const clean = name.trim();
    if (clean && !/^(user|fan|fan user|creator|unknown|someone)$/i.test(clean)) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(clean)}&background=18181b&color=e4e4e7&bold=true&size=200&format=svg`;
    }
  }
  return DEFAULT_AVATAR;
};

/**
 * Validates whether an avatar URL is a valid user-set photo or should fall back to default.
 */
export const resolveUserAvatar = (avatarUrl?: string | null, name?: string | null): string => {
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()) {
    const cleanUrl = avatarUrl.trim();
    // If it's an expired blob URL or old hardcoded placeholder, replace with clean default
    if (cleanUrl.startsWith('blob:') || cleanUrl.includes('photo-1534528741775-53994a69daeb') || cleanUrl.includes('pravatar.cc')) {
      return getDefaultAvatar(name);
    }
    return cleanUrl;
  }
  return getDefaultAvatar(name);
};
