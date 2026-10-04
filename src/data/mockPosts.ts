export interface FallbackPost {
  id: string;
  creator_id: string;
  content: string;
  media_url: string | null;
  is_locked: boolean;
  price: number;
  likes_count: number;
  created_at: string;
  is_featured?: boolean;
  users: {
    name: string;
    avatar: string;
  };
}

export const FALLBACK_POSTS: FallbackPost[] = [
  {
    id: 'demo-post-1',
    creator_id: 'creator-wairimu',
    content: 'Exclusive BTS from today’s sunrise photoshoot in Naivasha 🌅. Full high-res gallery unlocking for subscribers!',
    media_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 342,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    is_featured: true,
    users: {
      name: 'Wairimu K. ✨',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-2',
    creator_id: 'creator-chebet',
    content: 'Private workout & nutrition routine for fast fat loss! Lock in your KES 300 to access the complete video series 🔥💪',
    media_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 300,
    likes_count: 512,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    is_featured: true,
    users: {
      name: 'Chebet Fitness Studio 🏋️‍♀️',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-3',
    creator_id: 'creator-brian',
    content: 'Acoustic sample of my unreleased single "Safari Nights" 🎶. Let me know in the comments if I should drop the full EP this Friday!',
    media_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 890,
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    is_featured: true,
    users: {
      name: 'Brian Beats 🎵',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-4',
    creator_id: 'creator-amina',
    content: 'Swahili coastal recipes unlocked! Learn how to make authentic coconut biryani step-by-step 🥥🍛',
    media_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 420,
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    is_featured: true,
    users: {
      name: 'Chef Amina Coastal Kitchen 🍲',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-5',
    creator_id: 'creator-dj-kamau',
    content: 'VIP Live Afro-House DJ Set from Diani Beach 🎧. 2 Hours of non-stop energy!',
    media_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 500,
    likes_count: 1240,
    created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    is_featured: true,
    users: {
      name: 'DJ Kamau Mixes 🎧',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-6',
    creator_id: 'creator-stacy',
    content: 'Thrift haul under KES 2,000! Where to find the best vintage pieces in Gikomba market 👗✨',
    media_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 675,
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    is_featured: true,
    users: {
      name: 'Stacy Style Vault 👠',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-7',
    creator_id: 'creator-omondi',
    content: 'Tech breakdown: How I built an automated M-Pesa payment gateway using Supabase Edge Functions 🚀. Code snippets below!',
    media_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 980,
    created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    is_featured: true,
    users: {
      name: 'Omondi Tech Talk 💻',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-8',
    creator_id: 'creator-zola',
    content: 'Exclusive Vlog: Traveling through Mara Game Reserve during the Wildebeest Migration 🦁🇰🇪',
    media_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 250,
    likes_count: 1530,
    created_at: new Date(Date.now() - 1000 * 60 * 840).toISOString(),
    is_featured: true,
    users: {
      name: 'Zola Wanders 🌍',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-9',
    creator_id: 'creator-maina',
    content: 'Weekly Stock Market & Real Estate analysis for Kenya 📈. Top 3 stocks to watch this month.',
    media_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 730,
    created_at: new Date(Date.now() - 1000 * 60 * 960).toISOString(),
    is_featured: true,
    users: {
      name: 'Maina Wealth Insights 📊',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-10',
    creator_id: 'creator-njeri',
    content: 'Glowing skin secrets: 5 Natural affordable skincare products available locally ✨🌸',
    media_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 610,
    created_at: new Date(Date.now() - 1000 * 60 * 1080).toISOString(),
    is_featured: true,
    users: {
      name: 'Njeri Beauty Glow 💄',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-11',
    creator_id: 'creator-gathoni',
    content: 'Behind the scenes: Studio recording of our upcoming podcast episode on modern relationships 🎙️✨',
    media_url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 150,
    likes_count: 480,
    created_at: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
    is_featured: true,
    users: {
      name: 'Gathoni Podcast Uncut 🎙️',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
    }
  }
];
