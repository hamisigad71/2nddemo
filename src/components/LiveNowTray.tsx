import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveLiveStreams, type LiveStream } from '../lib/liveStream';
import { supabase } from '../lib/supabase';

interface LiveNowTrayProps {
  className?: string;
  showTitle?: boolean;
}

export const LiveNowTray: React.FC<LiveNowTrayProps> = ({ className = '', showTitle = true }) => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreams = async () => {
    try {
      const data = await getActiveLiveStreams();
      setLiveStreams(data || []);
    } catch (err) {
      console.error('Failed to load active live streams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();

    const handleUpdate = () => fetchStreams();
    window.addEventListener('live_streams_updated', handleUpdate);

    const channel = supabase
      .channel('live_streams_tray_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
        fetchStreams();
      })
      .subscribe();

    return () => {
      window.removeEventListener('live_streams_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  if (!loading && liveStreams.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Live Broadcasts</h2>
          </div>
          <span className="text-[11px] font-bold text-red-500 bg-red-600/10 border border-red-500/20 px-2 py-0.5 rounded-full">
            {liveStreams.length} Broadcasting
          </span>
        </div>
      )}

      {/* Stories Scroll Container */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
        {liveStreams.map(stream => (
          <Link
            key={stream.id}
            to={`/live/${stream.id}`}
            className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
          >
            {/* Avatar Ring */}
            <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-red-600/20">
              <div className="p-0.5 rounded-full bg-black">
                <img
                  src={stream.creatorAvatar || '/logo.svg'}
                  alt={stream.creatorName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              </div>

              {/* Pulsing LIVE Pill */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 border border-black text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md">
                LIVE
              </div>
            </div>

            {/* Creator Name & Status */}
            <div className="text-center w-20">
              <span className="text-xs font-bold text-zinc-200 block truncate group-hover:text-red-400 transition-colors">
                {stream.creatorName}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
                {stream.viewerCount || 1} watching
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LiveNowTray;

