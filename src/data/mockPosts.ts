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
    content: 'Unedited BTS from today’s golden hour poolside shoot 👙✨ Unlock the full 25+ HD photo gallery & exclusive video clip below!',
    media_url: 'https://i.pinimg.com/736x/be/39/5d/be395de0b5e63dea55bf6be0bd00a548.jpg',
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
    content: 'Just finished my late-night workout & stretch session 🍑💦 Lock in KES 300 to unlock my private routine video & spicy workout set!',
    media_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 300,
    likes_count: 512,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    is_featured: true,
    users: {
      name: 'Chebet Fit & Spice �🔥',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-3',
    creator_id: 'creator-chloe',
    content: 'Midnight audio voice note + secret lounge photoshoot 💋🎶 Subscribers get instant access to my private feed & custom request inbox!',
    media_url: 'https://i.pinimg.com/736x/07/e6/cf/07e6cf77a0f77ad57c801c7d47bfeb6b.jpg',
    is_locked: false,
    price: 0,
    likes_count: 890,
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    is_featured: true,
    users: {
      name: 'Chloe Vibe 💋',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-4',
    creator_id: 'creator-amina',
    content: 'Late night cooking in silk lingerie... 🍷✨ Unlock KES 200 for the full uncensored 4K video reel + private recipe guide!',
    media_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 200,
    likes_count: 420,
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    is_featured: true,
    users: {
      name: 'Chef Amina Seductive �',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-5',
    creator_id: 'creator-vanessa',
    content: 'VIP Diani beach weekend dump � VIP subscribers get the spicy, unedited gallery sent directly to DM!',
    media_url: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 500,
    likes_count: 1240,
    created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    is_featured: true,
    users: {
      name: 'Vanessa VIP 💎',
      avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-6',
    creator_id: 'creator-stacy',
    content: 'New lace try-on haul drops today! 👠✨ Sneak peek here — subscribe to see the full try-on video & exclusive photos!',
    media_url: 'https://i.pinimg.com/1200x/4d/bf/10/4dbf1060dbefbb66bf90f1e104d95aa3.jpg',
    is_locked: false,
    price: 0,
    likes_count: 675,
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    is_featured: true,
    users: {
      name: 'Stacy Temptation �',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-7',
    creator_id: 'creator-maya',
    content: 'My naughty bedroom polaroid set is finally ready 📸🔥 KES 400 to unlock all 15 exclusive photos!',
    media_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 400,
    likes_count: 980,
    created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    is_featured: true,
    users: {
      name: 'Maya Secrets 🌹',
      avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-8',
    creator_id: 'creator-zola',
    content: 'Sunset views from my balcony in Mara safari suite 🌅 Unlock for KES 250 to see what I wore underneath!',
    media_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 250,
    likes_count: 1530,
    created_at: new Date(Date.now() - 1000 * 60 * 840).toISOString(),
    is_featured: true,
    users: {
      name: 'Zola Allure 🖤',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-9',
    creator_id: 'creator-samantha',
    content: 'Good morning loves ☀️ Free preview of my premium photoshoot set. Full 4K video drop available for my VIP tier subscribers!',
    media_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 730,
    created_at: new Date(Date.now() - 1000 * 60 * 960).toISOString(),
    is_featured: true,
    users: {
      name: 'Samantha Seduction �',
      avatar: 'https://i.pinimg.com/736x/db/fc/0c/dbfc0ce39862d0dc21444df706e75de2.jpg'
    }
  },
  {
    id: 'demo-post-10',
    creator_id: 'creator-njeri',
    content: 'Bedtime skin routine & silk lounge try-on 💄💋 Unlock to get full access to my exclusive video vault & 1-on-1 messaging!',
    media_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=80',
    is_locked: false,
    price: 0,
    likes_count: 610,
    created_at: new Date(Date.now() - 1000 * 60 * 1080).toISOString(),
    is_featured: true,
    users: {
      name: 'Njeri Goddess ✨',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'demo-post-11',
    creator_id: 'creator-gathoni',
    content: 'Late night spicy confessions & Q&A episode 🎙️🔥 Unlock for KES 150 to hear all the juicy answers I couldn’t post anywhere else!',
    media_url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1000&q=80',
    is_locked: true,
    price: 150,
    likes_count: 480,
    created_at: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
    is_featured: true,
    users: {
      name: 'Gathoni Uncut 🎙️🔥',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
    }
  }
];
