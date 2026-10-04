import { supabase } from './supabase';
import { FALLBACK_POSTS } from '../data/mockPosts';

const PLATFORM_FEE = 0.15;

// ========================
// 1. USERS
// ========================

export const createUserProfile = async (uid: string, data: any) => {
  // Check by uid first (same auth session)
  const { data: byUid } = await supabase.from('users').select('uid').eq('uid', uid).single();
  if (byUid) return;

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

// ========================
// 2. STORAGE (Photo Uploads)
// ========================

export const uploadFileToSupabase = async (file: File, bucket: string, path: string): Promise<string | null> => {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) {
    console.error('Upload error:', error.message);
    return null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// ========================
// 3. POSTS (Feed + PPV)
// ========================

export const createPost = async (
  creatorId: string,
  content: string,
  mediaUrl: string | null,
  isLocked: boolean,
  price: number
) => {
  await supabase.from('posts').insert({
    creator_id: creatorId,
    content,
    media_url: mediaUrl,
    is_locked: isLocked,
    price: isLocked ? price : 0,
  });
};

export const getPosts = async () => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(name, avatar)')
    .order('created_at', { ascending: false });
  if (error) console.error('getPosts error:', error.message);
  
  const dbPosts = data || [];
  // Blend DB posts with fallback posts (DB posts come first)
  const existingIds = new Set(dbPosts.map((p: any) => p.id));
  const remainingFallbacks = FALLBACK_POSTS.filter(p => !existingIds.has(p.id));
  return [...dbPosts, ...remainingFallbacks];
};

export const getPostsByCreator = async (creatorId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(name, avatar)')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });
  if (error) console.error('getPostsByCreator error:', error.message);
  return data || [];
};

export const getFanFeed = async (fanId: string, page = 0, limit = 10) => {
  let realPosts: any[] = [];
  
  try {
    // 1. Get subscriptions of this user
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('fan_id', fanId)
      .eq('status', 'active');
      
    if (subs && subs.length > 0) {
      const creatorIds = subs.map(s => s.creator_id);
      
      const { data, error } = await supabase
        .from('posts')
        .select('*, users!creator_id(name, avatar)')
        .in('creator_id', creatorIds)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        realPosts = data;
      }
    }

    // 2. Also fetch any public non-subscribed real posts to show active content
    if (realPosts.length === 0) {
      const { data: publicRealPosts } = await supabase
        .from('posts')
        .select('*, users!creator_id(name, avatar)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (publicRealPosts) {
        realPosts = publicRealPosts;
      }
    }
  } catch (err) {
    console.error('Error fetching real feed:', err);
  }

  // 3. Blend real posts at the top, then append fallback posts
  const realIds = new Set(realPosts.map(p => p.id));
  const fallbacks = FALLBACK_POSTS.filter(p => !realIds.has(p.id));
  const fullFeed = [...realPosts, ...fallbacks];

  // 4. Paginate
  const start = page * limit;
  return fullFeed.slice(start, start + limit);
};

export const deletePost = async (postId: string) => {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
};

// ========================
// 4. TRANSACTIONS (Wallet)
// ========================

export const processPayment = async (
  type: 'tip' | 'subscription' | 'ppv',
  fromUserId: string,
  toCreatorId: string,
  grossAmount: number
) => {
  const platformFee = grossAmount * PLATFORM_FEE;
  const netAmount = grossAmount - platformFee;

  await supabase.from('transactions').insert({
    type,
    from_user_id: fromUserId,
    to_creator_id: toCreatorId,
    gross_amount: grossAmount,
    platform_fee: platformFee,
    net_amount: netAmount,
    status: 'completed',
  });
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
  tierName: string,
  price: number
) => {
  await processPayment('subscription', fanId, creatorId, price);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await supabase.from('subscriptions').insert({
    fan_id: fanId,
    creator_id: creatorId,
    tier_name: tierName,
    status: 'active',
    expires_at: expiresAt.toISOString(),
  });
};

export const getFanSubscriptions = async (fanId: string) => {
  const { data } = await supabase
    .from('subscriptions')
    .select('*, users!creator_id(name, avatar)')
    .eq('fan_id', fanId)
    .eq('status', 'active');
  return data || [];
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
