import { supabase } from './supabase';
import { notifySubscribersOfLiveStream } from './db';

export interface LiveStream {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorHandle?: string;
  creatorAvatar?: string;
  title: string;
  description?: string;
  category?: string;
  status: 'live' | 'ended';
  accessType: 'public' | 'subscribers_only' | 'ticketed';
  ticketPrice: number;
  viewerCount: number;
  startedAt: string;
  endedAt?: string;
}

export interface LiveMessage {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  isTip?: boolean;
  tipAmount?: number;
  createdAt: string;
}

const STORAGE_KEY = 'tgd_live_streams';
const MESSAGES_STORAGE_KEY = 'tgd_live_stream_messages';

// Initial showcase streams to guarantee vibrant presentation immediately
const DEFAULT_SHOWCASE_STREAMS: LiveStream[] = [
  {
    id: 'live-showcase-amina',
    creatorId: 'creator-amina',
    creatorName: 'Amina K.',
    creatorHandle: '@aminak',
    creatorAvatar: 'https://i.pinimg.com/736x/c6/ff/a6/c6ffa63b68d9f215fd063ffb97f33842.jpg',
    title: 'Late Night VIP Lounge & Q&A 💋',
    description: 'Chilling in Nairobi after a workout, answering your questions and taking live song requests!',
    category: 'VIP Lounge',
    status: 'live',
    accessType: 'public',
    ticketPrice: 0,
    viewerCount: 142,
    startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'live-showcase-sarah',
    creatorId: 'creator-sarah',
    creatorName: 'Sarah M.',
    creatorHandle: '@sarahm',
    creatorAvatar: 'https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg',
    title: 'Mombasa Beach Sunset & Exclusive Preview 🌅',
    description: 'VIP subscribers only live hangout before my weekend private show.',
    category: 'Lifestyle',
    status: 'live',
    accessType: 'subscribers_only',
    ticketPrice: 0,
    viewerCount: 89,
    startedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  }
];

function getStoredStreams(): LiveStream[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SHOWCASE_STREAMS));
      return DEFAULT_SHOWCASE_STREAMS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SHOWCASE_STREAMS;
  }
}

function saveStoredStreams(streams: LiveStream[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(streams));
    window.dispatchEvent(new CustomEvent('live_streams_updated'));
  } catch (err) {
    console.error('Failed to save live streams to storage:', err);
  }
}

/**
 * Create a new live stream broadcast
 */
export async function createLiveStream(params: {
  creatorId: string;
  creatorName: string;
  creatorHandle?: string;
  creatorAvatar?: string;
  title: string;
  description?: string;
  category?: string;
  accessType?: 'public' | 'subscribers_only' | 'ticketed';
  ticketPrice?: number;
}): Promise<LiveStream> {
  const streamId = `live-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const newStream: LiveStream = {
    id: streamId,
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    creatorHandle: params.creatorHandle || `@${params.creatorName.toLowerCase().replace(/\s+/g, '')}`,
    creatorAvatar: params.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80',
    title: params.title || 'Live Stream',
    description: params.description || '',
    category: params.category || 'Live Hangout',
    status: 'live',
    accessType: params.accessType || 'public',
    ticketPrice: params.ticketPrice || 0,
    viewerCount: 1,
    startedAt: new Date().toISOString(),
  };

  // 1. Try persisting to Supabase live_streams table
  try {
    await supabase.from('live_streams').insert({
      id: newStream.id,
      creator_id: newStream.creatorId,
      title: newStream.title,
      description: newStream.description,
      status: 'live',
      access_type: newStream.accessType,
      ticket_price: newStream.ticketPrice,
      viewer_count: 1,
      started_at: newStream.startedAt,
    });
  } catch (err) {
    console.warn('Supabase live_streams insert warning (using local fallback):', err);
  }

  // 2. Persist to local storage cache so it's instantly active
  const streams = getStoredStreams();
  // Mark any existing live stream from this creator as ended
  const updated = streams.map(s => s.creatorId === params.creatorId ? { ...s, status: 'ended' as const } : s);
  updated.unshift(newStream);
  saveStoredStreams(updated);

  // 3. Notify subscribers, fans and platform admins
  try {
    notifySubscribersOfLiveStream(params.creatorId, params.creatorName, params.creatorAvatar, newStream).catch(err => {
      console.warn('Live stream notification error:', err);
    });
  } catch {}

  return newStream;
}

/**
 * End a live stream broadcast
 */
export async function endLiveStream(streamId: string): Promise<void> {
  try {
    await supabase
      .from('live_streams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', streamId);
  } catch {}

  const streams = getStoredStreams();
  const updated = streams.map(s => s.id === streamId ? { ...s, status: 'ended' as const, endedAt: new Date().toISOString() } : s);
  saveStoredStreams(updated);
}

/**
 * Fetch all currently active live streams
 */
export async function getActiveLiveStreams(): Promise<LiveStream[]> {
  try {
    const { data: dbStreams } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'live')
      .order('started_at', { ascending: false });

    if (dbStreams && dbStreams.length > 0) {
      const formatted: LiveStream[] = dbStreams.map(db => ({
        id: db.id,
        creatorId: db.creator_id,
        creatorName: db.title?.split(' - ')[0] || 'VIP Creator',
        creatorHandle: '@creator',
        creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80',
        title: db.title,
        description: db.description || '',
        category: 'VIP Stream',
        status: db.status,
        accessType: db.access_type || 'public',
        ticketPrice: Number(db.ticket_price || 0),
        viewerCount: Number(db.viewer_count || 1),
        startedAt: db.started_at,
      }));

      // Merge with local active streams
      const local = getStoredStreams().filter(s => s.status === 'live');
      const map = new Map<string, LiveStream>();
      formatted.forEach(s => map.set(s.id, s));
      local.forEach(s => map.set(s.id, s));
      return Array.from(map.values());
    }
  } catch {}

  return getStoredStreams().filter(s => s.status === 'live');
}

/**
 * Fetch a single live stream by ID
 */
export async function getLiveStream(streamId: string): Promise<LiveStream | null> {
  const localStreams = getStoredStreams();
  const found = localStreams.find(s => s.id === streamId);
  if (found) return found;

  try {
    const { data } = await supabase
      .from('live_streams')
      .select('*')
      .eq('id', streamId)
      .single();

    if (data) {
      return {
        id: data.id,
        creatorId: data.creator_id,
        creatorName: 'VIP Creator',
        creatorHandle: '@creator',
        creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80',
        title: data.title,
        description: data.description || '',
        status: data.status,
        accessType: data.access_type || 'public',
        ticketPrice: Number(data.ticket_price || 0),
        viewerCount: Number(data.viewer_count || 1),
        startedAt: data.started_at,
      };
    }
  } catch {}

  return null;
}

/**
 * Fetch recent chat messages for a stream
 */
export function getStreamMessages(streamId: string): LiveMessage[] {
  try {
    const raw = localStorage.getItem(`${MESSAGES_STORAGE_KEY}_${streamId}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Default welcome message
  return [
    {
      id: 'welcome-msg',
      streamId,
      userId: 'system',
      userName: 'TGD Live Desk',
      userAvatar: '/logo.svg',
      text: 'Welcome to the live stream! Keep chats respectful. Tipping supports the creator directly via instant M-Pesa.',
      createdAt: new Date().toISOString(),
    }
  ];
}

/**
 * Store and save a new message
 */
export function saveStreamMessage(msg: LiveMessage): void {
  try {
    const existing = getStreamMessages(msg.streamId);
    existing.push(msg);
    // Keep last 80 messages
    const trimmed = existing.slice(-80);
    localStorage.setItem(`${MESSAGES_STORAGE_KEY}_${msg.streamId}`, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save live message:', err);
  }
}

