import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper matching logic in AdminContent.tsx and db.ts
export const isVideoUrl = (url: string) =>
  Boolean(url && (/\.(mp4|webm|mov|m4v|ogg|ogv|mkv|avi)($|\?)/i.test(url) || url.includes('/video/') || url.includes('video/')));

export const isVideoPost = (item: any) => {
  if (!item) return false;
  const type = String(item.type || '').toLowerCase();
  const mediaType = String(item.media_type || '').toLowerCase();
  if (type === 'video' || mediaType === 'video') return true;
  return isVideoUrl(item.media_url || item.img || '');
};

export const isPhotoPost = (item: any) => {
  if (!item || isVideoPost(item)) return false;
  const type = String(item.type || '').toLowerCase();
  const mediaType = String(item.media_type || '').toLowerCase();
  if (type === 'photo' || mediaType === 'image' || mediaType === 'photo') return true;
  const url = item.media_url || item.img || '';
  return Boolean(url && (/\.(jpe?g|png|gif|webp|svg|avif|bmp)($|\?)/i.test(url) || url.startsWith('http')));
};

describe('Admin Content Media Detection', () => {
  it('correctly classifies video posts with video media_type and .mp4 URL', () => {
    const post = {
      id: '63b06c71-f13e-49b5-8334-b906ff667c8e',
      creator_id: '367b5421-d9e6-4894-b0fd-18637c9d9fc5',
      content: "Subscribe to my channel for more amazing content! Don't forget to like, share...",
      media_url: 'https://gitkzykasegtygoybjhq.supabase.co/storage/v1/object/public/Daysman%20Gad/posts/367b5421-d9e6-4894-b0fd-18637c9d9fc5/1792812039825_WhatsApp_Video_2026-10-24_at_06.16.32.mp4',
      media_type: 'video',
    };

    assert.equal(isVideoPost(post), true);
    assert.equal(isPhotoPost(post), false);
  });

  it('correctly classifies video posts even when media_type is omitted if URL is .mp4, .webm, or .mov', () => {
    const postWithMp4 = {
      media_url: 'https://cdn.example.com/uploads/sample.mp4?token=123',
    };
    const postWithMov = {
      media_url: 'https://cdn.example.com/uploads/clip.MOV',
    };
    const postWithWebm = {
      media_url: 'https://cdn.example.com/uploads/clip.webm',
    };

    assert.equal(isVideoPost(postWithMp4), true);
    assert.equal(isVideoPost(postWithMov), true);
    assert.equal(isVideoPost(postWithWebm), true);
  });

  it('correctly classifies image posts as photo and not video', () => {
    const photoPost = {
      media_url: 'https://gitkzykasegtygoybjhq.supabase.co/storage/v1/object/public/Daysman%20Gad/posts/user/photo.webp',
      media_type: 'image',
    };

    assert.equal(isVideoPost(photoPost), false);
    assert.equal(isPhotoPost(photoPost), true);
  });

  it('correctly classifies text only posts as neither video nor photo', () => {
    const textPost = {
      content: 'Just a text status update without media attached.',
      media_url: null,
      media_type: null,
    };

    assert.equal(isVideoPost(textPost), false);
    assert.equal(isPhotoPost(textPost), false);
  });
});

