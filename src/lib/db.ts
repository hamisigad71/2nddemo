import { supabase } from './supabase';

const PLATFORM_FEE = 0.15;

// ========================
// 1. USERS
// ========================

export const createUserProfile = async (uid: string, data: any) => {
  const { data: existing } = await supabase.from('users').select('uid').eq('uid', uid).single();
  if (!existing) {
    await supabase.from('users').insert({
      uid,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: data.role || 'subscriber',
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
  return data || [];
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
