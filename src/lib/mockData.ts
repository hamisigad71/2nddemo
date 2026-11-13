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
