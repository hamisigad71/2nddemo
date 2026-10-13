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
  mediaType: 'image' | 'video' = 'image'
) => {
  const newPostId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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
    if (error) console.warn('Supabase post insert note:', error.message);
  } catch (err) {
    console.warn('Supabase post insert error:', err);
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

  return postObj;
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

export const getPostsByCreator = async (creatorId: string) => {
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
  return await enrichPostsWithUsers(dbPosts);
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
        .select('creator_id')
        .eq('fan_id', fanId)
        .eq('status', 'active');
      if (subs) {
        subs.forEach(s => subscribedCreatorIds.add(s.creator_id));
      }
    } catch {}

    try {
      const localSubs = JSON.parse(localStorage.getItem(`tgd_fan_subs_${fanId}`) || '[]');
      localSubs.forEach((s: any) => {
        if (s.status === 'active') subscribedCreatorIds.add(s.creator_id);
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

  const combinedReal = [...priorityPosts, ...otherPosts];
  const enrichedReal = await enrichPostsWithUsers(combinedReal);

  // 4. Blend with mock fallback posts to keep the feed rich
  const realIds = new Set(enrichedReal.map(p => p.id));
  const remainingFallbacks = FALLBACK_POSTS.filter(p => !realIds.has(p.id));
  const fullFeed = [...enrichedReal, ...remainingFallbacks];

  // 5. Paginate
  const start = page * limit;
  return fullFeed.slice(start, start + limit);
};

export const deletePost = async (postId: string) => {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
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
  referenceId?: string
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
    reference_id: referenceId || null
  }).select().single();

  if (error) console.error('Error inserting transaction:', error.message);

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

        // 2. Check Supabase users table
        try {
          const { data: userProfile } = await supabase
            .from('users')
            .select('uid, name, avatar, email, role')
            .eq('uid', sub.creator_id)
            .maybeSingle();

          if (userProfile) {
            return {
              ...sub,
              creator: {
                id: userProfile.uid,
                name: userProfile.name || 'Creator',
                avatar: userProfile.avatar || `https://i.pravatar.cc/150?u=${userProfile.uid}`,
                handle: `@${(userProfile.name || 'creator').replace(/\s+/g, '').toLowerCase()}`,
                isVerified: true,
                price: 1000,
              }
            };
          }
        } catch {
          // continue to fallback
        }

        return {
          ...sub,
          creator: {
            id: sub.creator_id,
            name: sub.creator_name || 'Creator',
            avatar: `https://i.pravatar.cc/150?u=${sub.creator_id}`,
            handle: `@creator_${String(sub.creator_id).slice(0, 5)}`,
            isVerified: false,
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
        supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', sub.id)
          .catch(() => {});
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
  // 1. Escorts / hardcoded check
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
      isEscort: true,
    };
  }

  // 2. Database user check
  try {
    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('uid', id)
      .maybeSingle();

    if (userRow) {
      let creatorMeta: any = null;
      try {
        const { data } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('user_id', id)
          .maybeSingle();
        creatorMeta = data;
      } catch {
        // creator_profiles table may not have row yet
      }

      return {
        id: userRow.uid,
        name: userRow.name || 'Creator',
        avatar: userRow.avatar || `https://i.pravatar.cc/150?u=${userRow.uid}`,
        cover_image: creatorMeta?.cover_image || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80',
        bio: creatorMeta?.bio || userRow.bio || 'Welcome to my official creator page! Exclusive posts, videos, and private chats.',
        location: creatorMeta?.location || 'Nairobi, Kenya',
        rating: 4.9,
        isVerified: true,
        isOnline: true,
        price_hr: creatorMeta?.monthly_price || 1000,
        age: creatorMeta?.age || 24,
        services: creatorMeta?.tags || ['VIP Content', 'Direct Chat', 'Exclusive Photos'],
        gallery: creatorMeta?.gallery || [],
        promo_discount: creatorMeta?.promo_discount || 50,
        promo_active: creatorMeta?.promo_active !== false,
        isEscort: false,
      };
    }
  } catch (err) {
    console.error('Error fetching creator profile from DB:', err);
  }

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
  type: 'subscription' | 'tip' | 'ppv' | 'comment' | 'like' | 'system' | 'warning';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export const createNotification = async (
  userId: string,
  notification: {
    title: string;
    message: string;
    type?: 'subscription' | 'tip' | 'ppv' | 'comment' | 'like' | 'system' | 'warning';
    link?: string;
  }
): Promise<NotificationItem> => {
  const newNotif: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    title: notification.title,
    message: notification.message,
    type: notification.type || 'subscription',
    link: notification.link || '',
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
