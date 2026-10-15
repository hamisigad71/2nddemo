import { supabase } from './supabase';
import { FALLBACK_POSTS } from '../data/mockPosts';
import { getEscorts } from './mockData';

const PLATFORM_FEE = 0.15;

// ========================
// 1. USERS
// ========================

export const createUserProfile = async (uid: string, data: any) => {
  // Check by uid first (same auth session)
  const { data: byUid } = await supabase.from('users').select('uid').eq('uid', uid).single();
  if (byUid) {
    if (data.role === 'creator') {
      try {
        await supabase.from('creator_profiles').upsert({
          user_id: uid,
          bio: 'Welcome to my official creator page! Exclusive posts, videos, and private chats.',
          monthly_price: 1000,
          location: 'Nairobi, Kenya',
          cover_image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80',
          tags: ['VIP Content', 'Direct Chat', 'Exclusive Photos'],
        }, { onConflict: 'user_id' });
      } catch {
        // non-fatal if table not configured
      }
    }
    return;
  }

  // Also check by email — prevents duplicate rows when the same person
  // signs up via different auth providers (e.g., Google then email/password)
  if (data.email) {
    const { data: byEmail } = await supabase
      .from('users')
      .select('uid')
      .eq('email', data.email)
      .maybeSingle();
    if (byEmail) return; // Email already has a profile — skip creating another
  }

  await supabase.from('users').insert({
    uid,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
    phone: data.phone,
    role: data.role || 'subscriber',
  });

  if (data.role === 'creator') {
    try {
      await supabase.from('creator_profiles').upsert({
        user_id: uid,
        bio: 'Welcome to my official creator page! Exclusive posts, videos, and private chats.',
        monthly_price: 1000,
        location: 'Nairobi, Kenya',
        cover_image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80',
        tags: ['VIP Content', 'Direct Chat', 'Exclusive Photos'],
      }, { onConflict: 'user_id' });
    } catch {
      // non-fatal
    }

    // Trigger notification to subscribers that a new creator signed up
    notifySubscribersOfNewCreator(uid, data.name || 'New Creator', data.avatar).catch(err => {
      console.warn('Could not dispatch new creator notification:', err);
    });
  }
};

export const getUserProfile = async (uid: string) => {
  const { data } = await supabase.from('users').select('*').eq('uid', uid).single();
  return data;
};

export const updateUserProfile = async (uid: string, data: any) => {
  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('uid', uid);
  
  if (error) {
    console.error('Error updating user profile:', error.message);
    throw error;
  }
};

export const updateCreatorProfile = async (uid: string, data: any) => {
  try {
    const { error } = await supabase
      .from('creator_profiles')
      .upsert({
        user_id: uid,
        ...data,
      }, { onConflict: 'user_id' });
    if (error) {
      console.warn('creator_profiles upsert notice:', error.message);
    }
  } catch (err) {
    console.error('Error updating creator profile:', err);
  }
};

export const deleteUserAccount = async (uid: string): Promise<boolean> => {
  try {
    // Delete associated application/profile records
    await supabase.from('escort_applications').delete().eq('user_id', uid);
    await supabase.from('ad_applications').delete().eq('user_id', uid);
    await supabase.from('notifications').delete().eq('user_id', uid);
    await supabase.from('post_likes').delete().eq('user_id', uid);
    await supabase.from('comments').delete().eq('user_id', uid);
    await supabase.from('subscriptions').delete().eq('user_id', uid);
    await supabase.from('transactions').delete().eq('user_id', uid);
    await supabase.from('creator_profiles').delete().eq('user_id', uid);
    await supabase.from('posts').delete().eq('user_id', uid);
    await supabase.from('messages').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

    // Delete user row
    const { error } = await supabase.from('users').delete().eq('uid', uid);
    if (error) {
      await supabase.from('users').delete().eq('id', uid);
    }
    return true;
  } catch (err) {
    console.warn('Error during deleteUserAccount DB cleanup:', err);
    return false;
  }
};

// ========================
// 2. STORAGE (Photo Uploads)
// ========================

export const uploadFileToSupabase = async (file: File, bucket: string, path: string): Promise<string | null> => {
  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    } else {
      console.warn('Supabase storage upload note:', error.message);
    }
  } catch (err) {
    console.warn('Supabase storage upload exception:', err);
  }

  // Resilient fallback: Convert file to Base64 Data URL so media upload never fails
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export const uploadPrivatePostMedia = async (file: File, creatorId: string, path: string): Promise<string> => {
  const objectPath = `${creatorId}/${path}`;
  const { error } = await supabase.storage
    .from('creator-private-media')
    .upload(objectPath, file, { upsert: true });
  if (error) throw new Error(`Private media upload failed: ${error.message}`);
  return objectPath;
};

const resolvePrivatePostMedia = async (posts: any[], viewerId?: string) => {
  if (!viewerId) {
    return posts.map(post => post.media_private ? { ...post, media_url: null } : post);
  }
  return Promise.all(posts.map(async (post) => {
    if (!post.media_url || (!post.media_private && post.visibility === 'public') || /^https?:\/\//i.test(post.media_url)) return post;
    const { data, error } = await supabase.storage
      .from('creator-private-media')
      .createSignedUrl(post.media_url, 60 * 60);
    if (error) {
      console.warn('Could not authorize private post media:', error.message);
      return { ...post, media_url: null };
    }
    return { ...post, media_url: data.signedUrl, media_access_granted: true };
  }));
};

export const getStoredCreatorProfile = (uid: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const direct = localStorage.getItem(`tgd_creator_profile_${uid}`);
    if (direct) return JSON.parse(direct);

    const generic = localStorage.getItem('creator_profile_data');
    if (generic) {
      const parsed = JSON.parse(generic);
      if (parsed.user_id === uid || parsed.uid === uid) return parsed;
    }
  } catch {}
  return null;
};

// ========================
// 3. POSTS (Feed + PPV)
// ========================

export const createPost = async (
  creatorId: string,
  content: string,
  mediaUrl: string | null,
  isLocked: boolean,
  price: number,
  mediaType: 'image' | 'video' = 'image',
  options: { visibility?: 'public' | 'subscribers' | 'ppv'; status?: 'published' | 'draft' } = {}
) => {
  const newPostId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const visibility = options.visibility || (isLocked ? 'ppv' : 'public');
  const status = options.status || 'published';

  // Immediately resolve the creator's current name and avatar
  const localProfile = getStoredCreatorProfile(creatorId);
  let creatorName = localProfile?.name || localProfile?.display_name || 'Creator';
  let creatorAvatar = localProfile?.avatar || localProfile?.avatar_url || null;

  if (!creatorAvatar && typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          const sessionUser = item?.user;
          if (sessionUser?.id === creatorId) {
            const meta = sessionUser.user_metadata;
            creatorAvatar = meta?.avatar_url || meta?.picture || meta?.avatar || null;
            if (creatorName === 'Creator') {
              creatorName = meta?.name || meta?.full_name || 'Creator';
            }
            break;
          }
        }
      }
    } catch {}
  }

  const postObj: any = {
    id: newPostId,
    creator_id: creatorId,
    content,
    media_url: mediaUrl,
    media_type: mediaType,
    is_locked: isLocked,
    price: isLocked ? price : 0,
    visibility,
    status,
    media_private: visibility !== 'public' || status === 'draft',
    created_at: new Date().toISOString(),
    likes_count: 0,
    comments_count: 0,
    users: {
      uid: creatorId,
      name: creatorName,
      avatar: creatorAvatar,
    }
  };

  // 1. Try Supabase insert
  try {
    const { data, error } = await supabase.from('posts').insert(postObj).select().maybeSingle();
    if (data?.id) postObj.id = data.id;
    if (!data?.id && (postObj.media_private || postObj.status === 'draft')) {
      throw new Error('Could not securely save this content: the database did not confirm the new post.');
    }
    if (error) {
      console.warn('Supabase post insert note:', error.message);
      if (postObj.media_private || postObj.status === 'draft') {
        throw new Error(`Could not securely save this content: ${error.message}`);
      }
    }
  } catch (err) {
    console.warn('Supabase post insert error:', err);
    if (postObj.media_private || postObj.status === 'draft') throw err;
  }

  // 2. Persist to localStorage client cache (tgd_all_posts)
  try {
    const key = 'tgd_all_posts';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [postObj, ...existing.filter((p: any) => p.id !== postObj.id)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage post save error:', err);
  }

  // 3. Dispatch real-time event so open feeds update immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('posts_updated', { detail: { post: postObj } }));
  }

  // 4. Notify active subscribers that this creator uploaded new content
  if (status === 'published') {
    notifySubscribersOfNewContent(creatorId, creatorName, creatorAvatar, postObj).catch(err => {
      console.warn('Could not dispatch subscriber post notifications:', err);
    });
  }

  return postObj;
};

export const updatePostAccess = async (
  postId: string,
  creatorId: string,
  visibility: 'public' | 'subscribers' | 'ppv',
  status: 'published' | 'draft',
  price: number
) => {
  const { data: currentPost, error: lookupError } = await supabase
    .from('posts')
    .select('media_url, media_private, status')
    .eq('id', postId)
    .eq('creator_id', creatorId)
    .maybeSingle();
  if (lookupError) throw new Error(`Could not load post access settings: ${lookupError.message}`);
  if (!currentPost) throw new Error('Post not found. Refresh and try again.');
  const targetPrivate = visibility !== 'public' || currentPost?.status === 'draft';
  if (currentPost?.media_url && Boolean(currentPost.media_private) !== targetPrivate) {
    throw new Error('Changing a post between public and paid access would not change its media storage permissions. Re-upload it with the desired access level instead.');
  }

  const updates = {
    visibility,
    status,
    is_locked: visibility === 'ppv',
    price: visibility === 'ppv' ? price : 0,
    media_private: targetPrivate,
  };
  const { error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', postId)
    .eq('creator_id', creatorId);
  if (error) throw new Error(`Could not update post access: ${error.message}`);

  const cachedPosts = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
  localStorage.setItem('tgd_all_posts', JSON.stringify(
    cachedPosts.map((post: any) => post.id === postId ? { ...post, ...updates } : post)
  ));
  window.dispatchEvent(new CustomEvent('posts_updated', { detail: { postId } }));
};

export const updatePostStatus = async (
  postId: string,
  creatorId: string,
  status: 'published' | 'draft'
) => {
  const { data: post, error: lookupError } = await supabase
    .from('posts')
    .select('media_url, media_private, visibility')
    .eq('id', postId)
    .eq('creator_id', creatorId)
    .maybeSingle();
  if (lookupError) throw new Error(`Could not load post status: ${lookupError.message}`);
  if (!post) throw new Error('Post not found. Refresh and try again.');

  let mediaUrl = post.media_url;
  let mediaPrivate = Boolean(post.media_private);
  if (status === 'published' && mediaPrivate && post.visibility === 'public' && mediaUrl) {
    const { data: file, error: downloadError } = await supabase.storage
      .from('creator-private-media')
      .download(mediaUrl);
    if (downloadError) throw new Error(`Could not publish draft media: ${downloadError.message}`);
    const fileName = mediaUrl.split('/').pop() || `draft-${postId}`;
    const publicPath = `posts/${creatorId}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('hideaway post storage')
      .upload(publicPath, file, { upsert: true });
    if (uploadError) throw new Error(`Could not publish draft media: ${uploadError.message}`);
    const { data: publicUrl } = supabase.storage.from('hideaway post storage').getPublicUrl(publicPath);
    mediaUrl = publicUrl.publicUrl;
    mediaPrivate = false;
  } else if (status === 'draft' && mediaUrl && !mediaPrivate) {
    throw new Error('This post uses a public media URL. Delete and re-upload it as a draft to keep the media private.');
  }

  const { error } = await supabase
    .from('posts')
    .update({ status, media_url: mediaUrl, media_private: mediaPrivate })
    .eq('id', postId)
    .eq('creator_id', creatorId);
  if (error) throw new Error(`Could not update post status: ${error.message}`);

  const cachedPosts = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
  localStorage.setItem('tgd_all_posts', JSON.stringify(
    cachedPosts.map((item: any) => item.id === postId ? { ...item, status, media_url: mediaUrl, media_private: mediaPrivate } : item)
  ));
  window.dispatchEvent(new CustomEvent('posts_updated', { detail: { postId } }));
};

/**
 * Resiliently enriches posts with creator name and avatar without relying on foreign-key joins.
 * Guarantees that creator profile pictures match what creators have set.
 */
export const enrichPostsWithUsers = async (rawPosts: any[]) => {
  if (!rawPosts || rawPosts.length === 0) return [];
  const creatorIds = Array.from(new Set(rawPosts.map(p => p.creator_id).filter(Boolean)));
  if (creatorIds.length === 0) return rawPosts;

  const usersMap = new Map<string, { uid: string; name: string; avatar: string | null; cover_image?: string }>();

  // 1. Check local storage for creator profiles first (fastest and most accurate for user-set profile photos)
  creatorIds.forEach(id => {
    const local = getStoredCreatorProfile(id);
    if (local) {
      usersMap.set(id, {
        uid: id,
        name: local.name || local.display_name || 'Creator',
        avatar: local.avatar || local.avatar_url || null,
        cover_image: local.cover_image,
      });
    }
  });

  // Check Supabase auth session in localStorage for matching creator
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          const sessionUser = item?.user;
          if (sessionUser && creatorIds.includes(sessionUser.id)) {
            const meta = sessionUser.user_metadata;
            const metaAvatar = meta?.avatar_url || meta?.picture || meta?.avatar;
            const metaName = meta?.name || meta?.full_name;
            const existing = usersMap.get(sessionUser.id);
            if (metaAvatar || metaName) {
              usersMap.set(sessionUser.id, {
                uid: sessionUser.id,
                name: existing?.name && existing.name !== 'Creator' ? existing.name : (metaName || 'Creator'),
                avatar: existing?.avatar || metaAvatar || null,
                cover_image: existing?.cover_image,
              });
            }
          }
        }
      }
    } catch {}
  }

  // 2. Batch fetch from Supabase users table
  try {
    const { data: usersData } = await supabase
      .from('users')
      .select('uid, name, avatar')
      .in('uid', creatorIds);
    if (usersData) {
      usersData.forEach((u: any) => {
        const existing = usersMap.get(u.uid);
        usersMap.set(u.uid, {
          uid: u.uid,
          name: existing?.name && existing.name !== 'Creator' ? existing.name : (u.name || 'Creator'),
          avatar: existing?.avatar || u.avatar || null,
          cover_image: existing?.cover_image,
        });
      });
    }
  } catch (err) {
    console.warn('Could not batch fetch creator users:', err);
  }

  // 3. Batch fetch from creator_profiles table
  try {
    const { data: creatorProfiles } = await supabase
      .from('creator_profiles')
      .select('*')
      .in('user_id', creatorIds);
    if (creatorProfiles) {
      creatorProfiles.forEach((cp: any) => {
        const existing = usersMap.get(cp.user_id);
        const resolvedAvatar = existing?.avatar || cp.avatar_url || cp.avatar || null;
        const resolvedName = existing?.name && existing.name !== 'Creator' ? existing.name : (cp.display_name || 'Creator');
        usersMap.set(cp.user_id, {
          uid: cp.user_id,
          name: resolvedName,
          avatar: resolvedAvatar,
          cover_image: cp.cover_image || existing?.cover_image,
        });
      });
    }
  } catch {}

  // 4. Batch fetch from escort_applications if avatar is still missing
  try {
    const missingAvatarIds = creatorIds.filter(id => !usersMap.get(id)?.avatar);
    if (missingAvatarIds.length > 0) {
      const { data: apps } = await supabase
        .from('escort_applications')
        .select('creator_id, name, verification_photos')
        .in('creator_id', missingAvatarIds);
      if (apps) {
        apps.forEach((app: any) => {
          if (app.verification_photos && app.verification_photos.length > 0) {
            const existing = usersMap.get(app.creator_id);
            usersMap.set(app.creator_id, {
              uid: app.creator_id,
              name: existing?.name || app.name || 'Creator',
              avatar: existing?.avatar || app.verification_photos[0],
              cover_image: existing?.cover_image,
            });
          }
        });
      }
    }
  } catch {}

  // 5. Mock escorts map
  const escorts = getEscorts();
  const escortsMap = new Map(escorts.map(e => [e.id, { uid: e.id, name: e.name, avatar: e.avatar, cover_image: e.cover_image }]));

  return rawPosts.map(post => {
    const resolvedUser = usersMap.get(post.creator_id) || escortsMap.get(post.creator_id);

    // Prioritize the user's actual resolved profile photo!
    const finalAvatar = resolvedUser?.avatar || post.users?.avatar || null;
    const finalName = resolvedUser?.name || post.users?.name || 'Creator';

    return {
      ...post,
      users: {
        uid: post.creator_id,
        name: finalName,
        avatar: finalAvatar,
      },
    };
  });
};

export const getPosts = async () => {
  let allPosts: any[] = [];
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      allPosts = [...data];
    }
  } catch (err) {
    console.error('getPosts error:', err);
  }

  // Merge localStorage posts
  try {
    const localPosts = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
    for (const lp of localPosts) {
      if (!allPosts.find(p => p.id === lp.id)) {
        allPosts.push(lp);
      }
    }
  } catch {}

  allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const enriched = await enrichPostsWithUsers(allPosts);

  // Blend with fallback posts
  const existingIds = new Set(enriched.map((p: any) => p.id));
  const remainingFallbacks = FALLBACK_POSTS.filter(p => !existingIds.has(p.id));
  return [...enriched, ...remainingFallbacks];
};

export const getPostsByCreator = async (creatorId: string, viewerId?: string) => {
  let dbPosts: any[] = [];
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      dbPosts = [...data];
    }
  } catch (err) {
    console.error('getPostsByCreator error:', err);
  }

  // Merge with localStorage
  try {
    const localPosts = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
    const creatorLocal = localPosts.filter((p: any) => p.creator_id === creatorId);
    for (const lp of creatorLocal) {
      if (!dbPosts.find(d => d.id === lp.id)) {
        dbPosts.push(lp);
      }
    }
  } catch {}

  dbPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return resolvePrivatePostMedia(await enrichPostsWithUsers(dbPosts), viewerId);
};

export const getFanFeed = async (fanId: string, page = 0, limit = 30) => {
  let allRealPosts: any[] = [];

  // 1. Fetch real posts from Supabase (all posts on platform, newest first)
  try {
    const { data: supabasePosts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (!error && supabasePosts) {
      allRealPosts = [...supabasePosts];
    }
  } catch (err) {
    console.warn('Error fetching Supabase posts for feed:', err);
  }

  // 2. Merge posts from LocalStorage client cache
  try {
    const localPosts: any[] = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
    for (const lp of localPosts) {
      if (!allRealPosts.find(p => p.id === lp.id)) {
        allRealPosts.push(lp);
      }
    }
  } catch (err) {
    console.warn('Error reading local posts for feed:', err);
  }

  // Sort real posts newest first
  allRealPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 3. Identify creator subscriptions (prioritized at the top of the feed)
  let subscribedCreatorIds = new Set<string>();
  if (fanId) {
    // Current user's own posts always prioritize at top so creators see their posts immediately
    subscribedCreatorIds.add(fanId);

    try {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('creator_id, expires_at')
        .eq('fan_id', fanId)
        .eq('status', 'active');
      if (subs) {
        subs.forEach(s => {
          if (!s.expires_at || new Date(s.expires_at).getTime() > Date.now()) {
            subscribedCreatorIds.add(s.creator_id);
          }
        });
      }
    } catch {}

    try {
      const localSubs = JSON.parse(localStorage.getItem(`tgd_fan_subs_${fanId}`) || '[]');
      localSubs.forEach((s: any) => {
        if (s.status === 'active' && (!s.expires_at || new Date(s.expires_at).getTime() > Date.now())) {
          subscribedCreatorIds.add(s.creator_id);
        }
      });
    } catch {}
  }

  // Split into priority (subscribed creators & own posts) and all other newly published creator posts
  const priorityPosts: any[] = [];
  const otherPosts: any[] = [];

  for (const post of allRealPosts) {
    if (subscribedCreatorIds.has(post.creator_id)) {
      priorityPosts.push(post);
    } else {
      otherPosts.push(post);
    }
  }

  const visiblePosts = [...priorityPosts, ...otherPosts].filter((post) =>
    post.status !== 'draft' &&
    (post.visibility !== 'subscribers' || subscribedCreatorIds.has(post.creator_id))
  );
  const enrichedReal = await resolvePrivatePostMedia(await enrichPostsWithUsers(visiblePosts), fanId);

  // 4. Blend with mock fallback posts to keep the feed rich
  const realIds = new Set(enrichedReal.map(p => p.id));
  const remainingFallbacks = FALLBACK_POSTS.filter(p => !realIds.has(p.id));
  const fullFeed = [...enrichedReal, ...remainingFallbacks];

  // 5. Paginate
  const start = page * limit;
  return fullFeed.slice(start, start + limit);
};

export const deletePost = async (postId: string) => {
  const { data: post, error: lookupError } = await supabase
    .from('posts')
    .select('media_url, media_private')
    .eq('id', postId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
  if (post?.media_private && post.media_url) {
    const { error: storageError } = await supabase.storage
      .from('creator-private-media')
      .remove([post.media_url]);
    if (storageError) console.warn('Could not remove private media after deleting the post:', storageError.message);
  }
  try {
    const cachedPosts = JSON.parse(localStorage.getItem('tgd_all_posts') || '[]');
    localStorage.setItem('tgd_all_posts', JSON.stringify(cachedPosts.filter((item: any) => item.id !== postId)));
  } catch (cacheError) {
    console.warn('Could not remove deleted post from local cache:', cacheError);
  }
  window.dispatchEvent(new CustomEvent('posts_updated', { detail: { postId } }));
};

// ========================
// LIKES
// ========================

export const getPostLikes = async (postId: string, userId?: string) => {
  const { count } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  let userHasLiked = false;
  if (userId) {
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    userHasLiked = !!data;
  }

  return { count: count || 0, userHasLiked };
};

export const toggleLike = async (postId: string, userId: string, currentlyLiked: boolean) => {
  if (currentlyLiked) {
    await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
  }
};

// ========================
// COMMENTS
// ========================

export const getComments = async (postId: string) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) console.error('getComments error:', error.message);
  if (!data || data.length === 0) return [];

  // Fetch user info for each commenter separately (no FK defined)
  const withUsers = await Promise.all(
    data.map(async (comment: any) => {
      const { data: userInfo } = await supabase
        .from('users')
        .select('name, avatar')
        .eq('uid', comment.user_id)
        .maybeSingle();
      return { ...comment, users: userInfo || null };
    })
  );
  return withUsers;
};

export const addComment = async (postId: string, userId: string, content: string) => {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, content })
    .select('*')
    .single();
  if (error) throw error;
  return data;
};



// ========================
// 4. TRANSACTIONS (Wallet)
// ========================

export const processPayment = async (
  type: 'tip' | 'subscription' | 'ppv',
  fromUserId: string,
  toCreatorId: string,
  grossAmount: number,
  referenceId?: string,
  postId?: string
) => {
  const platformFee = grossAmount * PLATFORM_FEE;
  const netAmount = grossAmount - platformFee;

  const { data: tx, error } = await supabase.from('transactions').insert({
    type,
    from_user_id: fromUserId,
    to_creator_id: toCreatorId,
    gross_amount: grossAmount,
    platform_fee: platformFee,
    net_amount: netAmount,
    status: 'completed',
    reference_id: referenceId || null,
    ...(type === 'ppv' && postId ? { post_id: postId } : {}),
  }).select().single();

  if (error) throw new Error(`Could not record payment: ${error.message}`);

  // Increment Creator's Total Net Earnings in creator_profiles if profile exists
  try {
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('total_earnings')
      .eq('user_id', toCreatorId)
      .single();

    if (profile) {
      await supabase
        .from('creator_profiles')
        .update({
          total_earnings: (profile.total_earnings || 0) + netAmount
        })
        .eq('user_id', toCreatorId);
    }
  } catch (err) {
    console.error('Error updating creator profile earnings:', err);
  }

  // Trigger Creator Notification for Tips and PPV unlocks
  try {
    let fanName = 'A fan';
    const { data: fanUser } = await supabase.from('users').select('name').eq('uid', fromUserId).maybeSingle();
    if (fanUser?.name) fanName = fanUser.name;

    if (type === 'tip') {
      await createNotification(toCreatorId, {
        title: 'New Tip Received! 💰',
        message: `${fanName} tipped you KES ${grossAmount.toLocaleString()}!`,
        type: 'tip',
        link: '/wallet'
      });
    } else if (type === 'ppv') {
      await createNotification(toCreatorId, {
        title: 'PPV Content Unlocked! 🔓',
        message: `${fanName} unlocked your Pay-Per-View content for KES ${grossAmount.toLocaleString()}.`,
        type: 'ppv',
        link: '/vault'
      });
    }
  } catch (notifErr) {
    console.warn('Could not dispatch payment notification:', notifErr);
  }

  return tx;
};

export const getCreatorTransactions = async (creatorId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('to_creator_id', creatorId)
    .order('created_at', { ascending: false });
  if (error) console.error('getCreatorTransactions error:', error.message);
  return data || [];
};

// ========================
// 5. SUBSCRIPTIONS
// ========================

export const subscribeToCreator = async (
  fanId: string,
  creatorId: string,
  tierName: string = 'VIP Tier',
  price: number = 1000,
  durationDays: number = 30
) => {
  await processPayment('subscription', fanId, creatorId, price);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  const expiresIso = expiresAt.toISOString();

  let subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const { data, error } = await supabase.from('subscriptions').insert({
      fan_id: fanId,
      creator_id: creatorId,
      tier_name: tierName,
      status: 'active',
      expires_at: expiresIso,
    }).select().maybeSingle();

    if (data?.id) subId = data.id;
    if (error) console.warn('Supabase subscription insert note:', error.message);
  } catch (err) {
    console.warn('Supabase subscription insert error:', err);
  }

  // Local storage cache for offline/instant client sync
  try {
    const subRecord = {
      id: subId,
      fan_id: fanId,
      creator_id: creatorId,
      tier_name: tierName,
      status: 'active',
      price,
      duration_days: durationDays,
      created_at: new Date().toISOString(),
      expires_at: expiresIso,
    };
    localStorage.setItem(`tgd_sub_${fanId}_${creatorId}`, JSON.stringify(subRecord));

    const fanListKey = `tgd_fan_subs_${fanId}`;
    const existingList = JSON.parse(localStorage.getItem(fanListKey) || '[]');
    const updatedList = [subRecord, ...existingList.filter((s: any) => s.creator_id !== creatorId)];
    localStorage.setItem(fanListKey, JSON.stringify(updatedList));
  } catch (e) {
    console.warn('LocalStorage subscription cache error:', e);
  }

  // Increment creator subscriber count in creator_profiles
  try {
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('total_subscribers')
      .eq('user_id', creatorId)
      .maybeSingle();

    if (profile) {
      await supabase
        .from('creator_profiles')
        .update({ total_subscribers: (profile.total_subscribers || 0) + 1 })
        .eq('user_id', creatorId);
    }
  } catch (e) {
    console.warn('Error incrementing subscriber count:', e);
  }

  // Send Immediate Notification to Creator
  try {
    let fanName = 'A subscriber';
    const { data: fanUser } = await supabase.from('users').select('name').eq('uid', fanId).maybeSingle();
    if (fanUser?.name) fanName = fanUser.name;

    await createNotification(creatorId, {
      title: 'New VIP Subscriber! 👑',
      message: `${fanName} subscribed to your ${tierName} (${durationDays} days) for KES ${price.toLocaleString()}!`,
      type: 'subscription',
      link: '/fans'
    });
  } catch (err) {
    console.warn('Error sending subscription notification:', err);
  }

  // Trigger automated welcome message in direct chat
  try {
    const { data: creatorUser } = await supabase.from('users').select('name').eq('uid', creatorId).maybeSingle();
    await createAutomatedWelcomeMessage(creatorId, fanId, creatorUser?.name);
  } catch {}

  return {
    id: subId,
    fan_id: fanId,
    creator_id: creatorId,
    tier_name: tierName,
    status: 'active',
    expires_at: expiresIso,
    expiresAt: expiresIso,
    durationDays,
    price
  };
};

export const getFanSubscriptions = async (fanId: string) => {
  try {
    let allSubs: any[] = [];
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('fan_id', fanId)
      .order('created_at', { ascending: false });

    if (!error && subs) {
      allSubs = [...subs];
    }

    // Merge with local storage cache
    try {
      const localList = JSON.parse(localStorage.getItem(`tgd_fan_subs_${fanId}`) || '[]');
      for (const loc of localList) {
        if (!allSubs.find((s: any) => s.creator_id === loc.creator_id)) {
          allSubs.push(loc);
        }
      }
    } catch {}

    if (allSubs.length === 0) return [];

    const escorts = getEscorts();
    const enriched = await Promise.all(
      allSubs.map(async (sub: any) => {
        // 1. Check if matches hardcoded escort
        const matchedEscort = escorts.find(e => e.id === sub.creator_id);
        if (matchedEscort) {
          return {
            ...sub,
            creator: {
              id: matchedEscort.id,
              name: matchedEscort.name,
              avatar: matchedEscort.avatar,
              handle: `@${matchedEscort.name.replace(/\s+/g, '').toLowerCase()}`,
              isVerified: matchedEscort.isVerified,
              price: matchedEscort.price_hr || 1000,
            }
          };
        }

        // 2. Check Local Cache & Supabase users table
        const localProfile = getStoredCreatorProfile(sub.creator_id);
        let creatorAvatar = localProfile?.avatar || localProfile?.avatar_url || null;
        let creatorName = localProfile?.name || localProfile?.display_name || sub.creator_name || 'Creator';

        try {
          const { data: userProfile } = await supabase
            .from('users')
            .select('uid, name, avatar, email, role')
            .eq('uid', sub.creator_id)
            .maybeSingle();

          if (userProfile) {
            creatorName = userProfile.name || creatorName;
            creatorAvatar = userProfile.avatar || creatorAvatar;
          }
        } catch {
          // continue
        }

        const fallbackAvatar = creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

        return {
          ...sub,
          creator: {
            id: sub.creator_id,
            name: creatorName,
            avatar: fallbackAvatar,
            handle: `@${creatorName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'creator'}`,
            isVerified: true,
            price: 1000,
          }
        };
      })
    );

    return enriched;
  } catch (err) {
    console.error('getFanSubscriptions error:', err);
    return [];
  }
};

export const checkUserSubscription = async (fanId: string, creatorId: string) => {
  try {
    let sub: any = null;

    // 1. Check Supabase subscriptions table
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, tier_name, status, expires_at')
      .eq('fan_id', fanId)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      sub = data[0];
    }

    // 2. Check LocalStorage fallback
    if (!sub) {
      try {
        const local = localStorage.getItem(`tgd_sub_${fanId}_${creatorId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.status === 'active') {
            sub = parsed;
          }
        }
      } catch {}
    }

    if (!sub) return null;

    // 3. Automated Expiration & Content Re-locking
    // If the expires_at timestamp has passed, mark expired and return null so all content locks
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      if (sub.id) {
        try {
          supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('id', sub.id)
            .then(() => {}, () => {});
        } catch {}
      }
      try {
        const local = localStorage.getItem(`tgd_sub_${fanId}_${creatorId}`);
        if (local) {
          const parsed = JSON.parse(local);
          parsed.status = 'expired';
          localStorage.setItem(`tgd_sub_${fanId}_${creatorId}`, JSON.stringify(parsed));
        }
      } catch {}
      return null;
    }

    return sub;
  } catch (err) {
    console.error('checkUserSubscription error:', err);
    return null;
  }
};

export const cancelSubscription = async (subId: string) => {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', subId);
  if (error) throw error;
};

export const getCreatorProfile = async (id: string) => {
  // 1. Escorts / hardcoded check ONLY if ID starts with 'escort-'
  if (id.startsWith('escort-')) {
    const escort = getEscorts().find(e => e.id === id);
    if (escort) {
      return {
        id: escort.id,
        name: escort.name,
        avatar: escort.avatar,
        cover_image: escort.cover_image,
        bio: escort.bio,
        location: escort.location,
        rating: escort.rating,
        isVerified: escort.isVerified,
        isOnline: escort.isOnline,
        price_hr: escort.price_hr,
        age: escort.age,
        services: escort.services,
        gallery: escort.gallery || [],
        promo_discount: 50,
        promo_active: true,
        isEscort: true,
      };
    }
  }

  // 2. Check local creator cache first (fastest and most accurate for user-set profile photos)
  const localCreator = getStoredCreatorProfile(id);

  // 3. Database user check
  try {
    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('uid', id)
      .maybeSingle();

    let creatorMeta: any = null;
    try {
      const { data } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      creatorMeta = data;
    } catch {}

    let appMeta: any = null;
    try {
      const { data } = await supabase
        .from('escort_applications')
        .select('*')
        .eq('creator_id', id)
        .maybeSingle();
      appMeta = data;
    } catch {}

    let authMeta: any = null;
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id === id) {
        authMeta = data.user.user_metadata;
      }
    } catch {}

    const resolvedAvatar = localCreator?.avatar
      || localCreator?.avatar_url
      || userRow?.avatar
      || creatorMeta?.avatar_url
      || creatorMeta?.avatar
      || authMeta?.avatar_url
      || authMeta?.picture
      || appMeta?.verification_photos?.[0]
      || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

    const resolvedName = localCreator?.name
      || localCreator?.display_name
      || userRow?.name
      || creatorMeta?.display_name
      || authMeta?.name
      || authMeta?.full_name
      || appMeta?.name
      || 'Creator';

    const resolvedCover = localCreator?.cover_image
      || creatorMeta?.cover_image
      || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80';

    const resolvedBio = localCreator?.bio
      || creatorMeta?.bio
      || userRow?.bio
      || 'Welcome to my official creator page! Exclusive posts, videos, and private chats.';

    if (userRow || localCreator || creatorMeta || authMeta || appMeta) {
      return {
        id: id,
        name: resolvedName,
        avatar: resolvedAvatar,
        cover_image: resolvedCover,
        bio: resolvedBio,
        location: localCreator?.location || creatorMeta?.location || 'Nairobi, Kenya',
        rating: 4.9,
        isVerified: true,
        isOnline: true,
        price_hr: localCreator?.monthly_price || creatorMeta?.monthly_price || 1000,
        age: localCreator?.age || creatorMeta?.age || 24,
        services: localCreator?.tags || creatorMeta?.tags || ['VIP Content', 'Direct Chat', 'Exclusive Photos'],
        gallery: localCreator?.gallery || creatorMeta?.gallery || [],
        promo_discount: localCreator?.promo_discount ?? creatorMeta?.promo_discount ?? 50,
        promo_active: localCreator?.promo_active ?? (creatorMeta?.promo_active !== false),
        isEscort: false,
      };
    }
  } catch (err) {
    console.error('Error fetching creator profile from DB:', err);
  }

  // Fallback to localCreator if DB query failed
  if (localCreator) {
    return {
      id: id,
      name: localCreator.name || 'Creator',
      avatar: localCreator.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      cover_image: localCreator.cover_image || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80',
      bio: localCreator.bio || 'Welcome to my official creator page!',
      location: localCreator.location || 'Nairobi, Kenya',
      rating: 4.9,
      isVerified: true,
      isOnline: true,
      price_hr: localCreator.monthly_price || 1000,
      age: localCreator.age || 24,
      services: localCreator.tags || ['VIP Content', 'Exclusive Photos'],
      gallery: [],
      promo_discount: 50,
      promo_active: true,
      isEscort: false,
    };
  }

  // Last fallback if matches escort
  const escortFallback = getEscorts().find(e => e.id === id);
  if (escortFallback) return escortFallback;

  return null;
};

export const getCreatorDashboardStats = async (creatorId: string) => {
  // Get all completed net transactions (earnings)
  const { data: txs } = await supabase
    .from('transactions')
    .select('net_amount, type')
    .eq('to_creator_id', creatorId)
    .eq('status', 'completed')
    .neq('type', 'payout');

  const totalEarnings = (txs || []).reduce((sum, t) => sum + (t.net_amount || 0), 0);
  
  // Get active subscribers count
  const { count: activeSubs } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .eq('status', 'active');
    
  // Get recent subscribers (last 5)
  const { data: recentSubs } = await supabase
    .from('transactions')
    .select('*, users!from_user_id(name, avatar)')
    .eq('to_creator_id', creatorId)
    .eq('type', 'subscription')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalEarnings,
    activeSubs: activeSubs || 0,
    recentSubs: recentSubs || []
  };
};

export const checkEmailExists = async (email: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .ilike('email', email)
    .maybeSingle();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error checking email:', error);
  }
  
  return !!data;
};

// ========================
// 6. ADMIN SYSTEM
// ========================

export const getAdminOverviewStats = async () => {
  // Aggregate mock totals if tables don't exist yet, but wire up real counts
  try {
    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: creatorsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'creator');
    
    // Sum transactions for total revenue
    const { data: txs } = await supabase.from('transactions').select('gross_amount').eq('status', 'completed');
    const totalRevenue = (txs || []).reduce((sum, t) => sum + (t.gross_amount || 0), 0);
    
    return {
      totalUsers: usersCount || 0,
      totalCreators: creatorsCount || 0,
      totalRevenue: totalRevenue,
      platformFees: totalRevenue * PLATFORM_FEE,
    };
  } catch (e) {
    return { totalUsers: 0, totalCreators: 0, totalRevenue: 0, platformFees: 0 };
  }
};

export const getAdminCreators = async () => {
  try {
    // 1. Fetch all users who are creators or pending creators
    const { data: creatorUsers, error } = await supabase
      .from('users')
      .select('uid, name, email, avatar, role')
      // Note: Assuming 'pending_creator' or 'suspended_creator' could be a role or status 
      // For now we fetch all to show in admin logic if needed, or explicitly 'creator'
      .in('role', ['creator', 'pending_creator', 'suspended_creator']);
      
    if (error) throw error;
    
    // 2. Map and aggregate with profiles (mocked fallback if missing properties)
    const formatted = await Promise.all((creatorUsers || []).map(async (u) => {
       const { data: profile } = await supabase.from('creator_profiles').select('*').eq('user_id', u.uid).maybeSingle();
       
       return {
         id: u.uid,
         name: u.name,
         email: u.email,
         img: u.avatar || `https://i.pravatar.cc/150?u=${u.uid}`,
         category: profile?.niche || 'Various',
         subs: profile?.total_subscribers || 0,
         revenue: `KES ${(profile?.total_earnings || 0).toLocaleString()}`,
         // Role dictates status for simplicity, or grab explicit status if added to DB
         status: u.role === 'creator' ? 'active' : u.role === 'suspended_creator' ? 'suspended' : 'pending',
         joined: 'Recent' // Can format created_at if existed
       };
    }));
    
    return formatted;
  } catch (err) {
    console.error("Error fetching admin creators:", err);
    return [];
  }
};

export const updateCreatorStatus = async (creatorId: string, newStatus: 'active' | 'pending' | 'suspended') => {
  const roleMap = {
    'active': 'creator',
    'pending': 'pending_creator',
    'suspended': 'suspended_creator'
  };
  
  const { error } = await supabase
    .from('users')
    .update({ role: roleMap[newStatus] as string })
    .eq('uid', creatorId);
    
  if (error) throw error;
};

export const getAdminContentPosts = async () => {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, users!creator_id(name, avatar)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return posts?.map(p => ({
      id: p.id,
      creator: p.users?.name || 'Unknown',
      creatorId: p.creator_id, // Added creatorId to know who to message
      type: p.media_url?.includes('.mp4') ? 'Video' : p.media_url ? 'Photo' : 'Text Post',
      title: p.content?.substring(0, 60) + (p.content?.length > 60 ? '...' : '') || 'Untitled Post',
      reports: 0, // Mocked for UI until a reporting table is added
      reason: 'General Review', // Mocked
      status: 'pending',
      img: p.media_url || p.users?.avatar || `https://i.pravatar.cc/150?u=${p.id}`,
      time: new Date(p.created_at).toLocaleDateString()
    })) || [];
  } catch (err) {
    console.error("Error fetching admin content posts:", err);
    return [];
  }
};

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'subscription' | 'tip' | 'ppv' | 'comment' | 'like' | 'system' | 'warning' | 'creator';
  link?: string;
  avatar?: string;
  badge?: string;
  action_label?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

export const createNotification = async (
  userId: string,
  notification: {
    title: string;
    message: string;
    type?: 'subscription' | 'tip' | 'ppv' | 'comment' | 'like' | 'system' | 'warning' | 'creator';
    link?: string;
    avatar?: string;
    badge?: string;
    action_label?: string;
    action_url?: string;
  }
): Promise<NotificationItem> => {
  const newNotif: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    title: notification.title,
    message: notification.message,
    type: notification.type || 'subscription',
    link: notification.link || notification.action_url || '',
    avatar: notification.avatar,
    badge: notification.badge,
    action_label: notification.action_label,
    action_url: notification.action_url || notification.link,
    is_read: false,
    created_at: new Date().toISOString()
  };

  // 1. Supabase attempt
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title: newNotif.title,
      message: newNotif.message,
      type: newNotif.type,
      is_read: false
    });
  } catch (err) {
    console.warn('Supabase notification insert warning:', err);
  }

  // 2. Always persist to localStorage for instant real-time sync / fallback
  try {
    const key = `tgd_notifications_${userId}`;
    const stored: NotificationItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([newNotif, ...stored].slice(0, 100)));
  } catch (err) {
    console.error('Local notifications error:', err);
  }

  // 3. Dispatch real-time event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notifications_updated', { detail: { userId } }));
  }

  return newNotif;
};

export const notifySubscribersOfNewContent = async (
  creatorId: string,
  creatorName: string,
  creatorAvatar: string | null | undefined,
  post: any
) => {
  const subscriberIds = new Set<string>();

  // 1. Fetch active subscribers from Supabase
  try {
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('fan_id')
      .eq('creator_id', creatorId)
      .eq('status', 'active');

    if (!error && subs) {
      subs.forEach((s: any) => {
        if (s.fan_id && s.fan_id !== creatorId) {
          subscriberIds.add(s.fan_id);
        }
      });
    }
  } catch (err) {
    console.warn('Error fetching Supabase subscribers for post notification:', err);
  }

  // 2. Fetch active subscribers from LocalStorage
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tgd_sub_') && key.endsWith(`_${creatorId}`)) {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item?.fan_id && item.status === 'active' && item.fan_id !== creatorId) {
            subscriberIds.add(item.fan_id);
          }
        }
      }

      // Check creator fans list
      const rawFans = localStorage.getItem(`tgd_fans_${creatorId}`);
      if (rawFans) {
        const fans = JSON.parse(rawFans);
        if (Array.isArray(fans)) {
          fans.forEach((f: any) => {
            if (f.id && f.id !== creatorId) subscriberIds.add(f.id);
          });
        }
      }

      // Check current session fan if they are subscribed to this creator
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
          const session = JSON.parse(localStorage.getItem(key) || '{}');
          const uid = session?.user?.id;
          if (uid && uid !== creatorId) {
            const userSub = localStorage.getItem(`tgd_sub_${uid}_${creatorId}`);
            if (userSub) {
              const parsed = JSON.parse(userSub);
              if (parsed.status === 'active') subscriberIds.add(uid);
            }
          }
        }
      }
    } catch {}
  }

  if (subscriberIds.size === 0) return;

  const isVideo = post.media_type === 'video';
  const isPpv = post.is_locked || post.visibility === 'ppv';
  const contentSnippet = post.content ? post.content.trim() : '';
  const truncatedSnippet = contentSnippet.length > 70 ? `${contentSnippet.slice(0, 70)}...` : contentSnippet;

  const title = `${creatorName} uploaded new ${isVideo ? 'video' : 'media'}! ${isPpv ? '🔒' : '📸'}`;
  const message = truncatedSnippet 
    ? `"${truncatedSnippet}"` 
    : `Check out the latest ${isPpv ? 'exclusive PPV' : 'media'} update from ${creatorName}!`;

  for (const fanId of subscriberIds) {
    try {
      await createNotification(fanId, {
        title,
        message,
        type: 'creator',
        link: '/user',
        action_label: 'View Post',
        action_url: '/user',
        avatar: creatorAvatar || undefined,
        badge: isPpv ? 'PPV Drop' : 'New Post'
      });
    } catch (err) {
      console.warn(`Failed to notify subscriber ${fanId}:`, err);
    }
  }
};

export const notifySubscribersOfNewCreator = async (
  creatorId: string,
  creatorName: string,
  creatorAvatar?: string | null
) => {
  const fanIds = new Set<string>();

  // 1. Fetch all subscriber users from Supabase
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('uid, role')
      .neq('uid', creatorId);

    if (!error && users) {
      users.forEach((u: any) => {
        if (u.uid && (u.role === 'subscriber' || !u.role)) {
          fanIds.add(u.uid);
        }
      });
    }
  } catch (err) {
    console.warn('Error fetching users for new creator notification:', err);
  }

  // 2. Discover local subscribers/fans from LocalStorage
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tgd_notifications_')) {
          const uid = key.replace('tgd_notifications_', '');
          if (uid && uid !== creatorId) {
            fanIds.add(uid);
          }
        }
      }

      // Also check current logged-in user if different from the new creator
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
          const session = JSON.parse(localStorage.getItem(key) || '{}');
          const uid = session?.user?.id;
          if (uid && uid !== creatorId) {
            fanIds.add(uid);
          }
        }
      }
    } catch {}
  }

  const title = `New Creator Joined: ${creatorName}! ✨`;
  const message = `${creatorName} has just joined The Gents DollHouse. Discover their profile, explore exclusive media, and subscribe!`;

  for (const fanId of fanIds) {
    try {
      await createNotification(fanId, {
        title,
        message,
        type: 'creator',
        link: `/creator/${creatorId}`,
        action_label: 'View Profile',
        action_url: `/creator/${creatorId}`,
        avatar: creatorAvatar || undefined,
        badge: 'New Creator'
      });
    } catch (err) {
      console.warn(`Failed to notify fan ${fanId} of new creator:`, err);
    }
  }
};

export const sendAdminMessage = async (creatorId: string, message: string) => {
  return createNotification(creatorId, {
    title: 'Admin Moderation',
    message,
    type: 'warning'
  });
};

export const getUserNotifications = async (userId: string): Promise<NotificationItem[]> => {
  let remoteItems: NotificationItem[] = [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      remoteItems = data.map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        title: d.title,
        message: d.message,
        type: d.type || 'system',
        link: d.link || '',
        avatar: d.avatar,
        badge: d.badge,
        action_label: d.action_label,
        action_url: d.action_url,
        is_read: !!d.is_read,
        created_at: d.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Error fetching Supabase notifications:', err);
  }

  // Merge with localStorage
  let localItems: NotificationItem[] = [];
  try {
    const key = `tgd_notifications_${userId}`;
    localItems = JSON.parse(localStorage.getItem(key) || '[]');
  } catch {}

  // Deduplicate
  const seen = new Set<string>();
  const merged: NotificationItem[] = [];

  for (const item of [...localItems, ...remoteItems]) {
    const dedupKey = item.id || `${item.title}-${item.message}`;
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      merged.push(item);
    }
  }

  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Default initial notifications if empty
  if (merged.length === 0) {
    return [
      {
        id: 'welcome-1',
        user_id: userId,
        title: 'Welcome to Creator Portal! 🎉',
        message: 'Your profile is live. Fans can now subscribe, send tips, and unlock your exclusive PPV content.',
        type: 'system',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'welcome-2',
        user_id: userId,
        title: 'M-Pesa Payouts Active 💰',
        message: 'Daraja & PayHero instant settlements are ready. Subscriber earnings reflect in your Wallet immediately.',
        type: 'tip',
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }

  return merged;
};

export const markNotificationAsRead = async (notificationId: string, userId?: string) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  } catch (err) {
    console.warn('Error marking notification as read in Supabase:', err);
  }

  if (userId) {
    try {
      const key = `tgd_notifications_${userId}`;
      const stored: NotificationItem[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = stored.map(item => item.id === notificationId ? { ...item, is_read: true } : item);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notifications_updated', { detail: { notificationId, userId } }));
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
  } catch (err) {
    console.warn('Error marking all notifications as read in Supabase:', err);
  }

  try {
    const key = `tgd_notifications_${userId}`;
    const stored: NotificationItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = stored.map(item => ({ ...item, is_read: true }));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notifications_updated', { detail: { userId } }));
  }
};

export const getAdminTransactions = async () => {
  try {
    const { data: txs, error } = await supabase
      .from('transactions')
      .select(`
        *,
        from_user:users!from_user_id (name, email),
        to_creator:users!to_creator_id (name, email)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return txs?.map(t => ({
      id: t.id.substring(0,8).toUpperCase(), // Short visual ID
      user: t.from_user?.name || 'Unknown',
      creator: t.to_creator?.name || 'Unknown',
      method: t.type === 'subscription' ? 'Card' : 'M-Pesa', // Rough mock mapping
      amount: `KES ${(t.gross_amount || 0).toLocaleString()}`,
      fee: `KES ${(t.platform_fee || 0).toLocaleString()}`,
      net: `KES ${(t.net_amount || 0).toLocaleString()}`,
      status: t.status, // completed -> success, pending -> pending, failed -> failed
      date: new Date(t.created_at).toLocaleString()
    })) || [];
  } catch (e) {
    console.error("Error fetching Admin transactions:", e);
    return [];
  }
};

// ========================
// 12. LIVE CHAT & MESSAGING
// ========================

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  creator_id: string;
  sender_role: 'subscriber' | 'creator';
  content: string;
  media_url?: string;
  is_ppv?: boolean;
  ppv_price?: number;
  ppv_unlocked?: boolean;
  read?: boolean;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar: string;
  handle?: string;
  role: 'creator' | 'subscriber';
  isOnline?: boolean;
  isSubscribed?: boolean;
  subscriptionExpiresAt?: string;
  subscriptionTier?: string;
  monthly_price?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

/**
 * Sends a direct message with strict anti-circumvention:
 * Strips all literal digits [0-9] from the content.
 */
export const sendChatMessage = async (params: {
  sender_id: string;
  receiver_id: string;
  creator_id: string;
  sender_role: 'subscriber' | 'creator';
  content: string;
  media_url?: string;
  is_ppv?: boolean;
  ppv_price?: number;
  ppv_unlocked?: boolean;
}): Promise<ChatMessage> => {
  // Strip all digits to prevent sharing of phone numbers
  const sanitizedContent = (params.content || '').replace(/[0-9]/g, '').trim();

  const fanId = params.sender_role === 'subscriber' ? params.sender_id : params.receiver_id;
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sender_id: params.sender_id,
    receiver_id: params.receiver_id,
    creator_id: params.creator_id,
    sender_role: params.sender_role,
    content: sanitizedContent,
    media_url: params.media_url,
    is_ppv: !!params.is_ppv,
    ppv_price: params.ppv_price || 0,
    ppv_unlocked: !!params.ppv_unlocked,
    read: false,
    created_at: new Date().toISOString(),
  };

  // 1. Persist to Supabase if available
  try {
    const { data, error } = await supabase.from('messages').insert({
      sender_id: newMsg.sender_id,
      receiver_id: newMsg.receiver_id,
      creator_id: newMsg.creator_id,
      sender_role: newMsg.sender_role,
      content: newMsg.content,
      media_url: newMsg.media_url,
      is_ppv: newMsg.is_ppv,
      ppv_price: newMsg.ppv_price,
      ppv_unlocked: newMsg.ppv_unlocked,
      read: newMsg.read,
    }).select().maybeSingle();

    if (!error && data?.id) {
      newMsg.id = data.id;
    }
  } catch (err) {
    // Non-fatal, local fallback keeps real-time chatting functional
  }

  // 2. Persist to LocalStorage for reliable local fallback
  try {
    const storageKey = `tgd_chat_${params.creator_id}_${fanId}`;
    const raw = localStorage.getItem(storageKey);
    const list: ChatMessage[] = raw ? JSON.parse(raw) : [];
    list.push(newMsg);
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {}

  // 3. Dispatch local event for real-time reactive UI update across components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tgd_new_message', { detail: newMsg }));
  }

  return newMsg;
};

/**
 * Loads messages between a creator and a fan.
 */
export const getChatMessages = async (creatorId: string, fanId: string): Promise<ChatMessage[]> => {
  let messages: ChatMessage[] = [];

  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('creator_id', creatorId)
      .or(`sender_id.eq.${fanId},receiver_id.eq.${fanId}`)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      messages = data.map((m: any) => ({
        id: m.id,
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        creator_id: m.creator_id,
        sender_role: m.sender_role || (m.sender_id === creatorId ? 'creator' : 'subscriber'),
        content: m.content || '',
        media_url: m.media_url,
        is_ppv: !!m.is_ppv,
        ppv_price: m.ppv_price,
        ppv_unlocked: !!m.ppv_unlocked,
        read: !!m.read,
        created_at: m.created_at,
      }));
    }
  } catch {}

  // 2. Merge with LocalStorage fallback
  try {
    const storageKey = `tgd_chat_${creatorId}_${fanId}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const localMsgs: ChatMessage[] = JSON.parse(raw);
      const existingIds = new Set(messages.map((m) => m.id));
      for (const lm of localMsgs) {
        if (!existingIds.has(lm.id)) {
          messages.push(lm);
          existingIds.add(lm.id);
        }
      }
      messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  } catch {}

  return messages;
};

/**
 * Creates an automated personalized welcome message from the creator
 * into the chat thread with a new subscriber.
 */
export const createAutomatedWelcomeMessage = async (
  creatorId: string,
  fanId: string,
  creatorName?: string
) => {
  const welcomeKey = `tgd_welcomed_${creatorId}_${fanId}`;
  if (typeof window !== 'undefined' && localStorage.getItem(welcomeKey)) {
    return; // Already welcomed
  }

  const name = creatorName || 'Creator';
  await sendChatMessage({
    sender_id: creatorId,
    receiver_id: fanId,
    creator_id: creatorId,
    sender_role: 'creator',
    content: `Hey! 🥰 Welcome to ${name}'s direct chat! Feel free to text me here anytime!`,
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(welcomeKey, 'true');
  }
};

/**
 * Unlocks a locked PPV message in the chat
 */
export const unlockChatMessagePPV = async (messageId: string, creatorId: string, fanId: string) => {
  try {
    await supabase.from('messages').update({ ppv_unlocked: true }).eq('id', messageId);
  } catch {}

  try {
    const storageKey = `tgd_chat_${creatorId}_${fanId}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const list: ChatMessage[] = JSON.parse(raw);
      const updated = list.map((m) => (m.id === messageId ? { ...m, ppv_unlocked: true } : m));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tgd_message_unlocked', { detail: { messageId } }));
  }
};

/**
 * Retrieves the list of creator conversations for a fan/user.
 */
export const getUserChatConversations = async (userId: string): Promise<ChatParticipant[]> => {
  const conversationsMap = new Map<string, ChatParticipant>();

  // 1. Check active subscriptions in Supabase
  try {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('creator_id, tier_name, status, expires_at')
      .eq('fan_id', userId)
      .eq('status', 'active');

    if (subs) {
      for (const s of subs) {
        if (!conversationsMap.has(s.creator_id)) {
          const profile = await getCreatorProfile(s.creator_id);
          const pAny = profile as any;
          conversationsMap.set(s.creator_id, {
            id: s.creator_id,
            name: profile?.name || 'Creator',
            avatar: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            handle: pAny?.handle || `@${(profile?.name || 'creator').toLowerCase().replace(/\s+/g, '')}`,
            role: 'creator',
            isOnline: true,
            isSubscribed: true,
            subscriptionExpiresAt: s.expires_at,
            subscriptionTier: s.tier_name || 'VIP Tier',
            monthly_price: pAny?.monthly_price || 1000,
          });
        }
      }
    }
  } catch {}

  // 2. Check local subscriptions & local chats
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`tgd_sub_${userId}_`)) {
          const creatorId = key.replace(`tgd_sub_${userId}_`, '');
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.status === 'active' && !conversationsMap.has(creatorId)) {
              const profile = await getCreatorProfile(creatorId);
              const pAny = profile as any;
              conversationsMap.set(creatorId, {
                id: creatorId,
                name: profile?.name || 'Creator',
                avatar: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                handle: pAny?.handle || `@${(profile?.name || 'creator').toLowerCase().replace(/\s+/g, '')}`,
                role: 'creator',
                isOnline: true,
                isSubscribed: true,
                subscriptionExpiresAt: parsed.expires_at,
                subscriptionTier: parsed.tier_name || 'VIP Tier',
                monthly_price: pAny?.monthly_price || 1000,
              });
            }
          }
        } else if (key && key.startsWith('tgd_chat_')) {
          const parts = key.replace('tgd_chat_', '').split('_');
          if (parts.length >= 2) {
            const creatorId = parts[0];
            const fanId = parts[1];
            if (fanId === userId && !conversationsMap.has(creatorId)) {
              const profile = await getCreatorProfile(creatorId);
              const pAny = profile as any;
              const sub = await checkUserSubscription(userId, creatorId);
              conversationsMap.set(creatorId, {
                id: creatorId,
                name: profile?.name || 'Creator',
                avatar: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                handle: pAny?.handle || `@${(profile?.name || 'creator').toLowerCase().replace(/\s+/g, '')}`,
                role: 'creator',
                isOnline: true,
                isSubscribed: !!sub,
                subscriptionExpiresAt: sub?.expires_at,
                subscriptionTier: sub?.tier_name,
                monthly_price: pAny?.monthly_price || 1000,
              });
            }
          }
        }
      }
    } catch {}
  }

  // 3. For each conversation, fetch the last message snippet
  const list = Array.from(conversationsMap.values());
  for (const c of list) {
    const msgs = await getChatMessages(c.id, userId);
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      c.lastMessage = last.is_ppv ? '🔒 Locked Exclusive PPV' : last.content;
      c.lastMessageTime = last.created_at;
    } else {
      c.lastMessage = c.isSubscribed ? 'Connected! Send your first message.' : 'Subscribe to start 1-on-1 chatting';
    }
  }

  // 4. Default popular creators if the list is empty (so fan sees creators to subscribe & chat with)
  if (list.length === 0) {
    const defaults = [
      { id: 'creator-amina', name: 'Amina K.', avatar: 'https://i.pinimg.com/736x/c6/ff/a6/c6ffa63b68d9f215fd063ffb97f33842.jpg', handle: '@aminak', price: 500 },
      { id: 'creator-sarah', name: 'Sarah M.', avatar: 'https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg', handle: '@sarahm', price: 800 },
      { id: 'creator-chef', name: 'Chef Kamau', avatar: 'https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg', handle: '@chefkamau', price: 1000 },
    ];
    for (const d of defaults) {
      const sub = await checkUserSubscription(userId, d.id);
      list.push({
        id: d.id,
        name: d.name,
        avatar: d.avatar,
        handle: d.handle,
        role: 'creator',
        isOnline: true,
        isSubscribed: !!sub,
        monthly_price: d.price,
        lastMessage: sub ? 'Connected! Send a message' : 'Subscribe to start chatting',
      });
    }
  }

  return list;
};

/**
 * Retrieves the list of fan/subscriber conversations for a creator.
 */
export const getCreatorChatConversations = async (creatorId: string): Promise<ChatParticipant[]> => {
  const fansMap = new Map<string, ChatParticipant>();

  // 1. Check subscriptions from Supabase
  try {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('fan_id, tier_name, status, created_at, expires_at')
      .eq('creator_id', creatorId)
      .eq('status', 'active');

    if (subs) {
      for (const s of subs) {
        if (!fansMap.has(s.fan_id)) {
          const userProfile = await getUserProfile(s.fan_id);
          fansMap.set(s.fan_id, {
            id: s.fan_id,
            name: userProfile?.name || 'Fan',
            avatar: userProfile?.avatar || `https://i.pravatar.cc/150?u=${s.fan_id}`,
            role: 'subscriber',
            isOnline: true,
            isSubscribed: true,
            subscriptionExpiresAt: s.expires_at,
            subscriptionTier: s.tier_name || 'VIP Tier',
          });
        }
      }
    }
  } catch {}

  // 2. Check local subscribers and local chats
  if (typeof window !== 'undefined') {
    try {
      const rawFans = localStorage.getItem(`tgd_fans_${creatorId}`);
      if (rawFans) {
        const fansList = JSON.parse(rawFans);
        for (const f of fansList) {
          if (!fansMap.has(f.id)) {
            fansMap.set(f.id, {
              id: f.id,
              name: f.name || 'Fan',
              avatar: f.avatar || `https://i.pravatar.cc/150?u=${f.id}`,
              role: 'subscriber',
              isOnline: true,
              isSubscribed: true,
              subscriptionTier: f.tier || 'VIP Tier',
            });
          }
        }
      }

      // Check localStorage for chat keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`tgd_chat_${creatorId}_`)) {
          const fanId = key.replace(`tgd_chat_${creatorId}_`, '');
          if (!fansMap.has(fanId)) {
            const userProfile = await getUserProfile(fanId);
            const sub = await checkUserSubscription(fanId, creatorId);
            fansMap.set(fanId, {
              id: fanId,
              name: userProfile?.name || 'Subscriber',
              avatar: userProfile?.avatar || `https://i.pravatar.cc/150?u=${fanId}`,
              role: 'subscriber',
              isOnline: true,
              isSubscribed: !!sub,
              subscriptionTier: sub?.tier_name || 'Active Subscriber',
            });
          }
        }
      }
    } catch {}
  }

  // 3. Attach last message preview
  const list = Array.from(fansMap.values());
  for (const fan of list) {
    const msgs = await getChatMessages(creatorId, fan.id);
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      fan.lastMessage = last.is_ppv ? 'Sent locked PPV media' : last.content;
      fan.lastMessageTime = last.created_at;
    } else {
      fan.lastMessage = 'New subscriber joined your channel!';
    }
  }

  // Default fans if creator is new (so inbox isn't completely empty before first live fan)
  if (list.length === 0) {
    list.push(
      {
        id: 'fan-alex-101',
        name: 'Alex M.',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        role: 'subscriber',
        isOnline: true,
        isSubscribed: true,
        subscriptionTier: 'VIP Tier',
        lastMessage: 'Loved your latest post! Any custom videos coming?',
      },
      {
        id: 'fan-kevin-102',
        name: 'Kevin O.',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
        role: 'subscriber',
        isOnline: false,
        isSubscribed: true,
        subscriptionTier: 'VIP Tier',
        lastMessage: 'Thanks for the quick reply! 🔥',
      }
    );
  }

  return list;
};

// ========================
// 12. PLATFORM ADS & CAMPAIGNS (ADMIN, USER & CREATOR)
// ========================

export interface PlatformAd {
  id: string;
  title: string;
  description: string;
  image_url: string;
  target_audience: 'all' | 'users' | 'creators';
  category: 'luxury' | 'hospitality' | 'nightlife' | 'sponsorship' | 'brand_deal' | 'creator_perk' | 'lifestyle';
  sponsor_name: string;
  sponsor_logo?: string;
  badge?: string;
  perk_value?: string;
  cta_text: string;
  cta_url: string;
  requirements?: string[];
  status: 'active' | 'paused' | 'archived';
  impressions: number;
  clicks: number;
  created_at: string;
  expires_at?: string;
  created_by?: string;
}

export interface AdApplication {
  id: string;
  ad_id: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  pitch: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const DEFAULT_PLATFORM_ADS: PlatformAd[] = [
  {
    id: 'ad-user-1',
    title: 'VIP Nairobi Penthouse Lounge & Cigar Club',
    description: 'Exclusive weekend tasting access and 20% privilege dining discount for The Gents DollHouse VIP members. Present your digital badge upon arrival.',
    image_url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    target_audience: 'users',
    category: 'nightlife',
    sponsor_name: 'The Onyx Club & Lounge',
    badge: 'VIP Exclusive',
    perk_value: '20% Privilege Discount',
    cta_text: 'Claim Reservation Code',
    cta_url: 'https://example.com/onyx-lounge',
    status: 'active',
    impressions: 485,
    clicks: 74,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'ad-user-2',
    title: 'Diani Beach Private Luxury Villa Retreat',
    description: 'Book 3 nights and receive complimentary helicopter transfer plus personal chef service. Exclusive platform partnership for registered patrons.',
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    target_audience: 'users',
    category: 'luxury',
    sponsor_name: 'Sultan Palace Escapes',
    badge: 'Limited Privilege',
    perk_value: 'Free Heli Transfer',
    cta_text: 'Explore Private Villa',
    cta_url: 'https://example.com/diani-villa',
    status: 'active',
    impressions: 612,
    clicks: 118,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 'ad-all-3',
    title: 'Moët & Chandon Imperial Reserve Gifting',
    description: 'Order customized luxury champagne gift boxes delivered discreetly anywhere in Nairobi with handwritten wax-sealed letters.',
    image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
    target_audience: 'all',
    category: 'lifestyle',
    sponsor_name: 'Maison Luxe Spirits',
    badge: 'Partner Special',
    perk_value: 'Free Luxury Box & Courier',
    cta_text: 'Order Discreet Gift',
    cta_url: 'https://example.com/luxe-spirits',
    status: 'active',
    impressions: 340,
    clicks: 52,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: 'ad-creator-1',
    title: 'High-Fashion Lingerie & Silk Seasonal Campaign',
    description: 'Selected creators receive complimentary seasonal luxury silk sets valued at KES 45,000 plus KES 35,000 upfront fee for 1 verified photo feature.',
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    target_audience: 'creators',
    category: 'brand_deal',
    sponsor_name: 'Amore Silks Nairobi',
    badge: 'Paid Sponsorship',
    perk_value: 'KES 35,000 + Wardrobe',
    requirements: ['1 High-res Feed Post', '2 24h Story Highlights', 'Tag @AmoreSilks'],
    cta_text: 'Apply for Brand Deal',
    cta_url: '#apply',
    status: 'active',
    impressions: 520,
    clicks: 138,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
  {
    id: 'ad-creator-2',
    title: 'Complimentary 4K Studio & Lighting Residency',
    description: 'Free 4-hour bookings at Nairobi Westlands Creator Loft with Sony FX3 cinematic cameras, cinema lenses, pro strobe lighting, and makeup suite.',
    image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    target_audience: 'creators',
    category: 'creator_perk',
    sponsor_name: 'Westlands Media Studios',
    badge: 'Creator Studio Perk',
    perk_value: '100% Free Booking',
    requirements: ['Verified Creator status on The Gents DollHouse', 'Advance 48h calendar booking'],
    cta_text: 'Reserve Studio Slot',
    cta_url: '#book-studio',
    status: 'active',
    impressions: 410,
    clicks: 94,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
  {
    id: 'ad-creator-3',
    title: 'Luxury Yacht Content Shoot Weekend (Mombasa)',
    description: 'All-expenses-paid 2-day catamaran cruise shoot along the Swahili coastline. Selected creators receive KES 75,000 honorarium and full royalty rights.',
    image_url: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80',
    target_audience: 'creators',
    category: 'sponsorship',
    sponsor_name: 'Coastline Catamarans',
    badge: 'High-Tier Deal',
    perk_value: 'KES 75,000 Honorarium',
    requirements: ['Active creator channel with VIP tier', 'Professional demeanor & portfolio link'],
    cta_text: 'Submit Application',
    cta_url: '#apply-yacht',
    status: 'active',
    impressions: 742,
    clicks: 189,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  }
];

const ADS_STORAGE_KEY = 'tgd_platform_ads';
const AD_APPLICATIONS_KEY = 'tgd_ad_applications';

export const getStoredAds = (): PlatformAd[] => {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_ADS;
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(DEFAULT_PLATFORM_ADS));
      return DEFAULT_PLATFORM_ADS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PLATFORM_ADS;
  } catch {
    return DEFAULT_PLATFORM_ADS;
  }
};

export const saveStoredAds = (ads: PlatformAd[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    window.dispatchEvent(new CustomEvent('tgd_ads_updated', { detail: { count: ads.length } }));
  } catch (err) {
    console.error('Failed to save ads locally:', err);
  }
};

/**
 * Fetch platform ads from Supabase with fallback to local store.
 */
export const getPlatformAds = async (
  audience?: 'all' | 'users' | 'creators',
  includeInactive = false
): Promise<PlatformAd[]> => {
  try {
    let query = supabase.from('platform_ads').select('*').order('created_at', { ascending: false });
    if (!includeInactive) {
      query = query.eq('status', 'active');
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const merged = data as PlatformAd[];
      if (audience && audience !== 'all') {
        return merged.filter(ad => ad.target_audience === 'all' || ad.target_audience === audience);
      }
      return merged;
    }
  } catch (err) {
    console.warn('Supabase platform_ads query failed, using stored local ads:', err);
  }

  // Fallback to local store
  const local = getStoredAds();
  const filtered = includeInactive ? local : local.filter(a => a.status === 'active');
  if (audience && audience !== 'all') {
    return filtered.filter(ad => ad.target_audience === 'all' || ad.target_audience === audience);
  }
  return filtered;
};

/**
 * Create a new platform ad by Admin
 */
export const createPlatformAd = async (
  ad: Omit<PlatformAd, 'id' | 'impressions' | 'clicks' | 'created_at'>
): Promise<PlatformAd> => {
  const newAd: PlatformAd = {
    ...ad,
    id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    impressions: 0,
    clicks: 0,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('platform_ads').insert([newAd]);
  } catch (err) {
    console.warn('Supabase create ad failed, writing to local cache:', err);
  }

  const current = getStoredAds();
  const updated = [newAd, ...current];
  saveStoredAds(updated);
  return newAd;
};

/**
 * Update an existing ad (toggle status, edit text, etc.)
 */
export const updatePlatformAd = async (
  id: string,
  updates: Partial<PlatformAd>
): Promise<PlatformAd | null> => {
  try {
    await supabase.from('platform_ads').update(updates).eq('id', id);
  } catch (err) {
    console.warn('Supabase update ad failed:', err);
  }

  const current = getStoredAds();
  const index = current.findIndex(a => a.id === id);
  if (index === -1) return null;

  const updatedItem = { ...current[index], ...updates };
  current[index] = updatedItem;
  saveStoredAds([...current]);
  return updatedItem;
};

/**
 * Delete a platform ad
 */
export const deletePlatformAd = async (id: string): Promise<boolean> => {
  try {
    await supabase.from('platform_ads').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase delete ad failed:', err);
  }

  const current = getStoredAds();
  const filtered = current.filter(a => a.id !== id);
  saveStoredAds(filtered);
  return true;
};

/**
 * Track an impression for an ad
 */
export const trackAdImpression = async (id: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  const sessionKey = `tgd_ad_imp_${id}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, '1');

  try {
    await supabase.rpc('increment_ad_impressions', { ad_id: id });
  } catch {
    // fallback increment in local cache
  }

  const current = getStoredAds();
  const item = current.find(a => a.id === id);
  if (item) {
    item.impressions = (item.impressions || 0) + 1;
    saveStoredAds([...current]);
  }
};

/**
 * Track a click on an ad
 */
export const trackAdClick = async (id: string): Promise<void> => {
  try {
    await supabase.rpc('increment_ad_clicks', { ad_id: id });
  } catch {
    // fallback increment in local cache
  }

  const current = getStoredAds();
  const item = current.find(a => a.id === id);
  if (item) {
    item.clicks = (item.clicks || 0) + 1;
    saveStoredAds([...current]);
  }
};

/**
 * Submit an application from a creator for a brand deal
 */
export const applyForCreatorBrandDeal = async (
  adId: string,
  creatorId: string,
  creatorName: string,
  creatorHandle: string,
  pitch: string
): Promise<AdApplication> => {
  const application: AdApplication = {
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ad_id: adId,
    creator_id: creatorId,
    creator_name: creatorName,
    creator_handle: creatorHandle,
    pitch,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('ad_applications').insert([application]);
  } catch (err) {
    console.warn('Supabase ad application insert failed:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(AD_APPLICATIONS_KEY);
      const list: AdApplication[] = raw ? JSON.parse(raw) : [];
      list.unshift(application);
      localStorage.setItem(AD_APPLICATIONS_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('tgd_applications_updated', { detail: application }));
    } catch {}
  }

  return application;
};

/**
 * Get applications submitted by a creator
 */
export const getCreatorBrandDealApplications = async (
  creatorId: string
): Promise<AdApplication[]> => {
  try {
    const { data } = await supabase
      .from('ad_applications')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    if (data && data.length > 0) return data as AdApplication[];
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(AD_APPLICATIONS_KEY);
      if (raw) {
        const list: AdApplication[] = JSON.parse(raw);
        return list.filter(a => a.creator_id === creatorId);
      }
    } catch {}
  }
  return [];
};
