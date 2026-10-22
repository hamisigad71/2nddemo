import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveUserAvatar, getDefaultAvatar, DEFAULT_AVATAR } from '../src/lib/avatar';

describe('Avatar Resolution & Fallback (avatar)', () => {
  it('returns default luxury SVG when avatarUrl and name are absent', () => {
    assert.strictEqual(resolveUserAvatar(null, null), DEFAULT_AVATAR);
    assert.strictEqual(resolveUserAvatar(undefined, undefined), DEFAULT_AVATAR);
    assert.strictEqual(resolveUserAvatar('', ''), DEFAULT_AVATAR);
  });

  it('generates an initials badge when a valid user name is provided without a photo', () => {
    const avatar = resolveUserAvatar(null, 'Vincent Ochieng');
    assert.match(avatar, /ui-avatars\.com\/api/);
    assert.match(avatar, /name=Vincent%20Ochieng/);
  });

  it('avoids creating initials badges for generic dummy names ("user", "creator", "unknown")', () => {
    assert.strictEqual(resolveUserAvatar(null, 'user'), DEFAULT_AVATAR);
    assert.strictEqual(resolveUserAvatar(null, 'Creator'), DEFAULT_AVATAR);
    assert.strictEqual(resolveUserAvatar(null, 'unknown'), DEFAULT_AVATAR);
  });

  it('converts relative storage paths to full public CDN URLs', () => {
    const relative = 'avatars/creator-123/profile.jpg';
    const resolved = resolveUserAvatar(relative);
    assert.match(resolved, /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/Daysman%20Gad\/avatars\/creator-123\/profile\.jpg/);
  });

  it('cleans up and rejects temporary expired browser blob: URLs', () => {
    const blobUrl = 'blob:http://localhost:5173/3f98c92a-1234';
    const resolved = resolveUserAvatar(blobUrl, 'Joy Mwangi');
    assert.doesNotMatch(resolved, /^blob:/);
    assert.match(resolved, /ui-avatars\.com/);
  });

  it('preserves valid external https photo URLs', () => {
    const validUrl = 'https://images.unsplash.com/photo-1534528741775?w=500';
    // Unless matching old mock blacklist, valid https URLs are preserved
    const cdnUrl = 'https://cdn.example.com/creators/avatar.png';
    assert.strictEqual(resolveUserAvatar(cdnUrl), cdnUrl);
  });
});

