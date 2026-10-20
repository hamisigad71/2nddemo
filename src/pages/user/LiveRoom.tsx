import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Send, Coins, Lock, ShieldCheck, 
  Share2, Volume2, VolumeX, Sparkles, Eye, Radio,
  Flame, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { getLiveStream, type LiveStream, type LiveMessage, getStreamMessages, saveStreamMessage } from '../../lib/liveStream';
import { getFanSubscriptions } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { resolveUserAvatar } from '../../lib/avatar';
import TipModal from '../../components/TipModal';
import SubscribeModal from '../../components/SubscribeModal';

export default function LiveRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  // Modals
  const [showTipModal, setShowTipModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  
  // Chat & Reactions
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const [viewerCount, setViewerCount] = useState(1);
  const [recentTipAlert, setRecentTipAlert] = useState<{ fanName: string; amount: number; message?: string } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load Stream Details & Check Subscription
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getLiveStream(id);
        if (data) {
          setStream(data);
          setViewerCount(data.viewerCount || 45);
          setMessages(getStreamMessages(id));

          // Check if user is subscribed if the stream is subscribers_only
          if (user && data.accessType === 'subscribers_only') {
            const subs = await getFanSubscriptions(user.id);
            const active = subs.some((s: any) => s.creator_id === data.creatorId && s.status === 'active');
            setIsSubscribed(active || user.id === data.creatorId);
          } else {
            setIsSubscribed(true);
          }
        }
      } catch (err) {
        console.error('Failed to load live stream:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Listen to real-time stream messages & reactions
    const channel = supabase
      .channel(`live_stream_${id}`)
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
        saveStreamMessage(payload);
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        triggerFloatingReaction(payload.emoji || '❤️');
      })
      .on('broadcast', { event: 'tip_alert' }, ({ payload }) => {
        setRecentTipAlert(payload);
        triggerFloatingReaction('💸');
        setTimeout(() => setRecentTipAlert(null), 5000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const triggerFloatingReaction = (emoji: string) => {
    const reactionId = `${Date.now()}-${Math.random()}`;
    const left = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingReactions(prev => [...prev, { id: reactionId, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== reactionId));
    }, 2200);
  };

  const sendReaction = (emoji: string) => {
    triggerFloatingReaction(emoji);
    if (!id) return;
    supabase.channel(`live_stream_${id}`).send({
      type: 'broadcast',
      event: 'reaction',
      payload: { emoji }
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || !id) return;

    const fanName = user.user_metadata?.name || user.email?.split('@')[0] || 'VIP Fan';
    const newMsg: LiveMessage = {
      id: `fan-msg-${Date.now()}`,
      streamId: id,
      userId: user.id,
      userName: fanName,
      userAvatar: resolveUserAvatar(user.user_metadata?.avatar_url, fanName),
      text: inputMessage.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    saveStreamMessage(newMsg);
    setInputMessage('');

    // Broadcast to creator & other viewers
    supabase.channel(`live_stream_${id}`).send({
      type: 'broadcast',
      event: 'chat_message',
      payload: newMsg
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Live stream link copied to clipboard!');
  };

  const handleSubscriptionSuccess = () => {
    setIsSubscribed(true);
    setShowSubscribeModal(false);
    toast.success('VIP Subscription Active! Full live stream unlocked.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Radio className="w-8 h-8 text-red-500 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide text-zinc-400">Connecting to Live Room...</span>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-white text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <Radio className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black">Stream Unavailable</h2>
        <p className="text-sm text-zinc-400 max-w-sm">This live stream has ended or is not currently active.</p>
        <button
          onClick={() => navigate('/discover')}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
        >
          Explore More Creators
        </button>
      </div>
    );
  }

  const isLocked = stream.accessType === 'subscribers_only' && !isSubscribed;

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col lg:flex-row overflow-hidden relative">
      
      {/* Left/Main Column: Video Viewport & Overlays (8 Cols on Desktop) */}
      <div className="flex-1 flex flex-col relative h-[65vh] lg:h-screen bg-black overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Creator Profile Chip */}
            <Link
              to={`/creator/${stream.creatorId}`}
              className="flex items-center gap-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 p-1.5 pr-4 rounded-full transition-all"
            >
              <img
                src={stream.creatorAvatar || '/logo.svg'}
                alt={stream.creatorName}
                className="w-8 h-8 rounded-full object-cover border border-red-500/50"
              />
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1 leading-none">
                  {stream.creatorName}
                  <CheckCircle2 className="w-3 h-3 text-red-500" />
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{stream.creatorHandle || '@creator'}</div>
              </div>
            </Link>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-[11px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg shadow-red-600/20">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
            </div>

            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-white text-xs font-bold backdrop-blur-md">
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              <span>{viewerCount}</span>
            </div>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
              title="Share Stream"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas / Player Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-950">
          
          {/* Simulated Ambient Live Visual Background */}
          <div className="absolute inset-0">
            <img
              src={stream.creatorAvatar}
              alt="Live Backdrop"
              className={`w-full h-full object-cover ${isLocked ? 'blur-2xl scale-110 opacity-40' : 'blur-md opacity-30'} transition-all duration-700`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
          </div>

          {/* Locked VIP Overlay */}
          {isLocked ? (
            <div className="relative z-20 max-w-md mx-4 p-8 rounded-3xl bg-black/80 backdrop-blur-2xl border border-red-500/30 text-center space-y-5 shadow-2xl animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-600/20">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-600/10 border border-red-500/20 px-3 py-1 rounded-full">
                  Subscribers Only Stream
                </span>
                <h3 className="text-2xl font-black text-white mt-3">{stream.title}</h3>
                <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                  {stream.creatorName} has set this live broadcast exclusively for VIP subscribers. Subscribe today to unlock live streaming, backstage chat, and private photo vaults.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  onClick={() => setShowSubscribeModal(true)}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Subscribe to Watch Live
                </button>
                <div className="text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Instant M-Pesa access • Cancel anytime
                </div>
              </div>
            </div>
          ) : (
            /* Live Stream Active Presentation */
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 text-center select-none">
              <div className="relative">
                <img
                  src={stream.creatorAvatar}
                  alt={stream.creatorName}
                  className="w-36 h-36 md:w-48 md:h-48 rounded-full object-cover border-4 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4)] animate-pulse"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                  LIVE BROADCAST
                </div>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-white mt-6 max-w-lg leading-tight drop-shadow-md">
                {stream.title}
              </h2>
              <p className="text-xs text-zinc-400 mt-2 max-w-md line-clamp-2">
                {stream.description || 'Welcome to the live show! Tap hearts to react and tip to support the host.'}
              </p>
            </div>
          )}

          {/* Celebratory Tip Alert Banner */}
          {recentTipAlert && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 animate-bounce">
              <div className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
                <Flame className="w-5 h-5 text-yellow-300 animate-spin" />
                <div>
                  <div className="font-black text-xs uppercase tracking-wider">{recentTipAlert.fanName} tipped!</div>
                  <div className="font-bold text-sm text-yellow-100">+KES {recentTipAlert.amount.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Hearts Reaction Canvas Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {floatingReactions.map(r => (
              <div
                key={r.id}
                className="absolute bottom-12 text-3xl animate-float-reaction select-none"
                style={{ left: `${r.left}%` }}
              >
                {r.emoji}
              </div>
            ))}
          </div>

          {/* Video Floating Action Bar (Mute, Tips, Reactions) */}
          <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTipModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
              >
                <Coins className="w-4 h-4 text-yellow-300" /> Tip M-Pesa
              </button>

              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 p-1 rounded-2xl">
                {['❤️', '🔥', '💋', '👏'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all text-base active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Right Column: Live Chat Panel (Desktop & Mobile) */}
      <div className="w-full lg:w-[400px] h-[35vh] lg:h-screen bg-[#0d0e12] border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col z-30">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Live Chat</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            TGD VIP Shield Active
          </span>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {messages.map(m => (
            <div 
              key={m.id} 
              className={`text-xs p-3 rounded-2xl leading-relaxed ${
                m.isTip 
                  ? 'bg-gradient-to-r from-red-600/20 to-amber-500/20 border border-amber-500/30 text-white' 
                  : m.userId === stream.creatorId 
                    ? 'bg-red-600/10 border border-red-500/30' 
                    : 'bg-zinc-900/60 border border-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-black ${m.isTip ? 'text-amber-400 font-bold' : m.userId === stream.creatorId ? 'text-red-400' : 'text-zinc-300'}`}>
                  {m.userName} {m.userId === stream.creatorId && '👑'}
                </span>
                <span className="text-[9px] text-zinc-600 font-mono">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-zinc-200">{m.text}</p>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Field */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            placeholder="Say something nice..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 transition-colors active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>

      {/* Tipping Modal */}
      {showTipModal && (
        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creatorName={stream.creatorName}
          creatorId={stream.creatorId}
        />
      )}

      {/* Subscribe Unlock Modal */}
      {showSubscribeModal && (
        <SubscribeModal
          isOpen={showSubscribeModal}
          onClose={() => setShowSubscribeModal(false)}
          creatorName={stream.creatorName}
          creatorId={stream.creatorId}
          price={1000}
          onSuccess={handleSubscriptionSuccess}
        />
      )}

      <style>{`
        @keyframes float-reaction {
          0% { transform: translateY(0) scale(0.8); opacity: 1; }
          50% { transform: translateY(-120px) scale(1.2); opacity: 0.9; }
          100% { transform: translateY(-240px) scale(1.4); opacity: 0; }
        }
        .animate-float-reaction {
          animation: float-reaction 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>
    </div>
  );
}
