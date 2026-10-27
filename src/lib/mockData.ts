export interface EscortProfile {
  id: string;
  name: string;
  avatar: string;
  cover_image: string;
  bio: string;
  location: string;
  rating: number;
  isVerified: boolean;
  isOnline: boolean;
  price_hr: number;
  age?: number;
  services: string[];
  gallery: string[];
}

const STORAGE_KEY = "tgd_hardcoded_escorts";

const DEFAULT_ESCORTS: EscortProfile[] = [
  {
    id: "escort-1",
    name: "Valentina",
    avatar:
      "https://i.pinimg.com/736x/27/a7/8e/27a78e6e8f924a2e01c24fe905172364.jpg",
    cover_image:
      "https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=80",
    bio: "Luxury companion for high-end events. Passionate, elegant, and discreet.",
    location: "Nairobi, KE",
    rating: 4.9,
    isVerified: true,
    isOnline: true,
    price_hr: 5000,
    age: 24,
    services: ["Dinner Date", "City Tour", "VIP Events"],
    gallery: [
      "https://i.pinimg.com/736x/a4/83/11/a483115dfefcf7bd5f32e59bd7e3a826.jpg",
    ],
  },
  {
    id: "escort-2",
    name: "Chloe Vibe",
    avatar:
      "https://i.pinimg.com/736x/a3/b1/fa/a3b1fa0152a62036db543b4b08c750ca.jpg",
    cover_image:
      "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=1600&q=80",
    bio: "Fun, spontaneous and ready for an adventure. Let's make memories.",
    location: "Mombasa, KE",
    rating: 4.8,
    isVerified: true,
    isOnline: false,
    price_hr: 3500,
    age: 22,
    services: ["Beach Date", "Nightlife", "Travel Companion"],
    gallery: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "escort-3",
    name: "Sofia Monroe",
    avatar:
      "https://i.pinimg.com/736x/22/1f/76/221f76786c595429bf159054ffec074e.jpg",
    cover_image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1600&q=80",
    bio: "The ultimate girlfriend experience. Sweet, attentive, and unforgettable.",
    location: "Nairobi, KE",
    rating: 5.0,
    isVerified: true,
    isOnline: true,
    price_hr: 7000,
    age: 26,
    services: ["GFE", "Dinner Date", "VIP Events", "Overnight"],
    gallery: [
      "https://i.pinimg.com/736x/3e/81/32/3e81323b0ed362d1c6af1afcec667631.jpg",
    ],
  },
  {
    id: "escort-4",
    name: "Maya",
    avatar:
      "https://i.pinimg.com/736x/43/6b/f5/436bf5ff8aff0db0316feadbb8ba1a09.jpg",
    cover_image:
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=1600&q=80",
    bio: "Your perfect escape from reality. Exclusive bookings only.",
    location: "Kilimani, NRB",
    rating: 4.7,
    isVerified: false,
    isOnline: true,
    price_hr: 4000,
    age: 23,
    services: ["City Tour", "Dinner Date", "Weekend Getaway"],
    gallery: [
      "https://i.pinimg.com/736x/0d/23/b9/0d23b9306be1b37b3c01bdf1a888cc91.jpg",
    ],
  },
  {
    id: "escort-5",
    name: "Zuri",
    avatar:
      "https://i.pinimg.com/736x/9f/c9/7a/9fc97a91a92810c4b63a3151b4a458c2.jpg",
    cover_image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1600&q=80",
    bio: "Elegant, intelligent, and a perfect +1 for all your VIP arrangements.",
    location: "Westlands, NRB",
    rating: 4.9,
    isVerified: true,
    isOnline: true,
    price_hr: 6000,
    age: 27,
    services: ["VIP Events", "Corporate Events", "Travel Companion", "GFE"],
    gallery: [
      "https://i.pinimg.com/736x/99/e6/3e/99e63eb2da710c74f91d4f9fa96452fc.jpg",
    ],
  },
  {
    id: "escort-6",
    name: "Aaliyah",
    avatar:
      "https://i.pinimg.com/736x/d3/59/f3/d359f3b580443cb55716d9289f3ade6a.jpg",
    cover_image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&q=80",
    bio: "Breathtakingly gorgeous and charming. Ready for a beautiful evening.",
    location: "Karen, NRB",
    rating: 5.0,
    isVerified: true,
    isOnline: false,
    price_hr: 8000,
    age: 25,
    services: ["Dinner Date", "Overnight", "VIP Events", "GFE"],
    gallery: [
      "https://i.pinimg.com/736x/62/a4/36/62a4361d21a2d02df558f38de546633b.jpg",
    ],
  },
  {
    id: "escort-7",
    name: "Jessica",
    avatar:
      "https://i.pinimg.com/736x/64/69/2a/64692a6dcfd5228a91dfe7419716db0d.jpg",
    cover_image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80",
    bio: "Sun-kissed and ready for a good time. Let's explore the coast together.",
    location: "Diani, KE",
    rating: 4.6,
    isVerified: false,
    isOnline: true,
    price_hr: 4500,
    age: 21,
    services: ["Beach Date", "Nightlife", "Water Sports"],
    gallery: [
      "https://i.pinimg.com/736x/c7/28/cf/c728cf491ba2ec046ad228f7ca450289.jpg",
    ],
  },
  {
    id: "escort-8",
    name: "Nadia",
    avatar:
      "https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg",
    cover_image:
      "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1600&q=80",
    bio: "Classy, bubbly, and extremely fun. Your best kept secret.",
    location: "Kileleshwa, NRB",
    rating: 4.8,
    isVerified: true,
    isOnline: true,
    price_hr: 5500,
    age: 24,
    services: ["Dinner Date", "City Tour", "GFE", "VIP Events"],
    gallery: [
      "https://i.pinimg.com/736x/ee/94/6c/ee946c91fb98f09f9833a4ba59676216.jpg",
    ],
  },
];

/** Read escorts — prefers localStorage edits, falls back to defaults */
export function getEscorts(): EscortProfile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as EscortProfile[];
  } catch {
    // ignore parse errors
  }
  return DEFAULT_ESCORTS;
}

/** Persist the full escorts array to localStorage */
export function saveEscorts(escorts: EscortProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(escorts));
  } catch {
    // ignore quota errors
  }
}

/** Reset to factory defaults */
export function resetEscorts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Convenience export for components that just need a snapshot
export const mockEscorts: EscortProfile[] = DEFAULT_ESCORTS;
