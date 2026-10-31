/**
 * Default avatar constants and helpers for users and creators.
 * Provides a sleek, neutral luxury default profile silhouette icon for all new accounts.
 */

// Universal luxury default profile silhouette image for creators and users
export const DEFAULT_AVATAR = "/default-avatar.jpg";

/**
 * Returns the default profile avatar image.
 * Uses the universal default red neon glass silhouette image across the platform instead of letter/initial badges,
 * ensuring clean, premium, consistent imagery unless the creator/user explicitly uploads their own photo.
 */
export const getDefaultAvatar = (_name?: string | null): string => {
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
    // If it's an expired blob URL or old hardcoded placeholder or letter initials avatar, replace with clean default
    if (
      cleanUrl.startsWith('blob:') ||
      cleanUrl.includes('photo-1534528741775-53994a69daeb') ||
      cleanUrl.includes('pravatar.cc') ||
      cleanUrl.includes('ui-avatars.com')
    ) {
      return getDefaultAvatar(name);
    }
    // Convert temporary signed Supabase storage URLs to permanent public URLs so tokens never expire
    if (cleanUrl.includes('/storage/v1/object/sign/')) {
      const publicEquivalent = cleanUrl.replace('/storage/v1/object/sign/', '/storage/v1/object/public/').split('?')[0];
      return publicEquivalent;
    }
    // If it's a relative storage path (e.g. avatars/... or covers/...), convert to full public URL
    const stripped = cleanUrl.replace(/^\/+/, '');
    if (stripped.startsWith('avatars/') || stripped.startsWith('covers/') || stripped.startsWith('escort-verification/') || stripped.startsWith('posts/')) {
      return `${SUPABASE_STORAGE_URL}/${stripped}`;
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
  if (clean === '/default-avatar.jpg' || clean.includes('default-avatar.jpg')) return false; // Default avatar
  if (clean.includes('b1e459cf78031a698ed00cc8ef944319')) return false; // Default avatar Pinterest link
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
  if (clean.includes('default-cover.jpg')) return false; // Universal default cover placeholder
  if (clean.includes('a0719f34c43c00d7f2879a86fa3db798')) return false; // Legacy fallback cover
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
