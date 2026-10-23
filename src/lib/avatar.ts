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

// Supabase storage public URL prefix for fallback relative storage paths
const SUPABASE_STORAGE_URL = 'https://gitkzykasegtygoybjhq.supabase.co/storage/v1/object/public/Daysman%20Gad';

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
    // If it's a relative storage path (e.g. avatars/... or covers/...), convert to full public URL
    if (cleanUrl.startsWith('avatars/') || cleanUrl.startsWith('covers/') || cleanUrl.startsWith('escort-verification/') || cleanUrl.startsWith('posts/')) {
      return `${SUPABASE_STORAGE_URL}/${cleanUrl}`;
    }
    return cleanUrl;
  }
  return getDefaultAvatar(name);
};

/**
 * Checks whether a creator has provided a real, custom uploaded profile photo
 * (not an auto-generated initials badge, not a default SVG silhouette, and not empty).
 */
export const hasUploadedProfilePhoto = (avatarUrl?: string | null): boolean => {
  if (!avatarUrl || typeof avatarUrl !== 'string') return false;
  const clean = avatarUrl.trim();
  if (!clean) return false;
  if (clean.startsWith('data:image/svg+xml')) return false; // Default SVG silhouette
  if (clean.includes('ui-avatars.com')) return false; // Auto-generated initials badge
  if (clean.includes('pravatar.cc')) return false; // Placeholder
  if (clean.includes('photo-1534528741775-53994a69daeb')) return false; // Old placeholder
  if (clean.startsWith('blob:')) return false; // Expired browser blob URL
  return true;
};

/**
 * Checks whether a creator has provided a real, custom uploaded cover photo
 * (not the default gradient placeholder, not an expired blob, and not empty).
 */
export const hasUploadedCoverPhoto = (coverUrl?: string | null): boolean => {
  if (!coverUrl || typeof coverUrl !== 'string') return false;
  const clean = coverUrl.trim();
  if (!clean) return false;
  if (clean.includes('photo-1618005182384-a83a8bd57fbe')) return false; // Default placeholder wave
  if (clean.includes('photo-1549490349-8643362247b5')) return false; // Old placeholder
  if (clean.startsWith('blob:')) return false; // Expired browser blob URL
  return true;
};

/**
 * Client-side avatar image compressor.
 * Downscales phone camera/high-res photos (5MB - 12MB) to max 512x512 JPEG (~30-50KB).
 * This ensures:
 * 1. Storage uploads are ultra-fast and reliable on any mobile/desktop connection.
 * 2. If storage fails, fallback data URI fits within PostgreSQL and Supabase Auth payload limits.
 */
export const compressAvatarImage = async (
  file: File,
  maxDimension = 512,
  quality = 0.82
): Promise<{ file: File; dataUrl: string }> => {
  return new Promise((resolve) => {
    // If not an image, return original file
    if (!file.type || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ file, dataUrl: (reader.result as string) || '' });
      reader.onerror = () => resolve({ file, dataUrl: '' });
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ file, dataUrl: (e.target?.result as string) || '' });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to compact dataUrl (~25-50KB)
        let compactDataUrl = '';
        try {
          compactDataUrl = canvas.toDataURL('image/jpeg', quality);
        } catch {
          compactDataUrl = (e.target?.result as string) || '';
        }

        // Convert to Blob / File
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                { type: 'image/jpeg', lastModified: Date.now() }
              );
              resolve({ file: compressedFile, dataUrl: compactDataUrl });
            } else {
              resolve({ file, dataUrl: compactDataUrl });
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve({ file, dataUrl: (e.target?.result as string) || '' });
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve({ file, dataUrl: '' });
    reader.readAsDataURL(file);
  });
};
