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

export const sendAdminMessage = async (creatorId: string, message: string) => {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: creatorId,
      title: 'Admin Moderation',
      message: message,
      type: 'warning',
      is_read: false
    });
    if (error) throw error;
  } catch (err) {
    console.error("Failed to send admin message to creator:", err);
    throw err;
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
