import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Mic, MicOff, VideoOff, Settings, Send, 
  AlertCircle, StopCircle, Radio, 
  Coins, MessageCircle, RefreshCw, Trophy, Eye
} from 'lucide-react';
import CreatorLayout from '../../components/CreatorLayout';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { createLiveStream, endLiveStream, type LiveStream, type LiveMessage, getStreamMessages, saveStreamMessage } from '../../lib/liveStream';
import { supabase } from '../../lib/supabase';
import { resolveUserAvatar } from '../../lib/avatar';

export default function LiveStudio() {
  const { user } = useAuth();
  
  // Media Stream States
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mediaError, setMediaError] = useState<string | null>(null);
  
  // Broadcast States
  const [isLive, setIsLive] = useState(false);
  const [currentLiveStream, setCurrentLiveStream] = useState<LiveStream | null>(null);
  const [streamTitle, setStreamTitle] = useState('Late Night VIP Lounge & Q&A 💋');
  const [streamCategory, setStreamCategory] = useState('VIP Lounge');
  const [accessType, setAccessType] = useState<'public' | 'subscribers_only'>('public');
  const [viewerCount, setViewerCount] = useState(1);
  const [liveDuration, setLiveDuration] = useState(0);
  
  // Chat & Tip States
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [recentTip, setRecentTip] = useState<{ fanName: string; amount: number; message?: string } | null>(null);
  const [totalTipsEarned, setTotalTipsEarned] = useState(0);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; left: number }[]>([]);
  
  // Summary Modal
  const [showSummary, setShowSummary] = useState(false);
  const [summaryStats, setSummaryStats] = useState({ duration: '0m', peakViewers: 1, totalTips: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize Camera
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setMediaError(null);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      
      const media = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      setStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setMediaError('Camera or microphone permission is needed to broadcast video. (Demo mode active)');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer effect when live
  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(() => {
        setLiveDuration(prev => prev + 1);
        // Simulate organic viewer growth for exciting creator experience
        setViewerCount(prev => Math.min(250, prev + (Math.random() > 0.4 ? 1 : 0)));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setLiveDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive]);

  // Realtime subscription for chat and tips
  useEffect(() => {
    if (!currentLiveStream) return;

    // Load initial messages
    setMessages(getStreamMessages(currentLiveStream.id));

    const channel = supabase
      .channel(`live_stream_${currentLiveStream.id}`)
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
        saveStreamMessage(payload);
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        triggerFloatingReaction(payload.emoji || '❤️');
      })
      .on('broadcast', { event: 'tip_alert' }, ({ payload }) => {
        handleIncomingTip(payload.fanName, payload.amount, payload.message);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentLiveStream]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => (t.enabled = !micActive));
      setMicActive(!micActive);
      toast.info(micActive ? 'Microphone Muted' : 'Microphone Active');
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => (t.enabled = !cameraActive));
      setCameraActive(!cameraActive);
      toast.info(cameraActive ? 'Camera Paused' : 'Camera Active');
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const triggerFloatingReaction = (emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const left = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2500);
  };

  const handleIncomingTip = (fanName: string, amount: number, tipMessage?: string) => {
    const netCredit = Math.round(amount * 0.70);
    setTotalTipsEarned(prev => prev + netCredit);
    setRecentTip({ fanName, amount, message: tipMessage });
    
    // Add special tip chat bubble
    const tipMsg: LiveMessage = {
      id: `tip-${Date.now()}`,
      streamId: currentLiveStream?.id || 'live',
      userId: 'system',
      userName: fanName,
      text: `🔥 Tipped KES ${amount.toLocaleString()}${tipMessage ? `: "${tipMessage}"` : ''}`,
      isTip: true,
      tipAmount: amount,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tipMsg]);
    triggerFloatingReaction('💸');

    // Auto dismiss celebratory banner after 6s
    setTimeout(() => {
      setRecentTip(null);
    }, 6000);
  };

  const handleStartBroadcast = async () => {
    if (!user) return;
    try {
      const creatorName = user.user_metadata?.name || user.user_metadata?.full_name || 'VIP Creator';
      const avatar = resolveUserAvatar(user.user_metadata?.avatar_url, creatorName);
      
      const newLive = await createLiveStream({
        creatorId: user.id,
        creatorName,
        creatorAvatar: avatar,
        title: streamTitle,
        category: streamCategory,
        accessType,
      });

      setCurrentLiveStream(newLive);
      setIsLive(true);
      setViewerCount(1);
      toast.success('You are now LIVE! Subscribers are being notified.');
    } catch (err) {
      console.error('Failed to start broadcast:', err);
      toast.error('Failed to initialize live stream broadcast');
    }
  };

  const handleEndBroadcast = async () => {
    if (!currentLiveStream) return;
    if (!confirm('Are you sure you want to end this live broadcast?')) return;

    try {
      await endLiveStream(currentLiveStream.id);
      setIsLive(false);
      
      // Calculate summary stats
      const mins = Math.floor(liveDuration / 60);
      const secs = liveDuration % 60;
      setSummaryStats({
        duration: `${mins}m ${secs}s`,
        peakViewers: Math.max(viewerCount, 1),
        totalTips: totalTipsEarned
      });
      setShowSummary(true);
      toast.info('Live stream broadcast ended.');
    } catch (err) {
      console.error('Failed to end stream:', err);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || !currentLiveStream) return;

    const creatorName = user.user_metadata?.name || 'Creator';
    const newMsg: LiveMessage = {
      id: `msg-${Date.now()}`,
      streamId: currentLiveStream.id,
      userId: user.id,
      userName: `${creatorName} (Host)`,
      userAvatar: resolveUserAvatar(user.user_metadata?.avatar_url, creatorName),
      text: inputMessage.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    saveStreamMessage(newMsg);
    setInputMessage('');

    // Broadcast to viewers
    supabase.channel(`live_stream_${currentLiveStream.id}`).send({
      type: 'broadcast',
      event: 'chat_message',
      payload: newMsg
    });
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <CreatorLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0d0e12] via-zinc-950 to-[#0d0e12] p-5 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-lg shadow-red-600/20">
              <Radio className={`w-5 h-5 ${isLive ? 'animate-pulse text-red-500' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">Creator Live Studio</h1>
                {isLive && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" /> LIVE
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-xs">
                Broadcast directly to fans, receive real-time M-Pesa tips, and grow your VIP subscriber base.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {isLive ? (
              <button
                onClick={handleEndBroadcast}
                className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-600/10"
              >
                <StopCircle className="w-4 h-4" /> End Broadcast
              </button>
            ) : (
              <button
                onClick={handleStartBroadcast}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-red-600/30 active:scale-95"
              >
                <Radio className="w-4 h-4" /> Go Live Now
              </button>
            )}
          </div>
        </div>

        {/* Studio Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Video Viewport (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl group">
              
              {/* Actual Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Camera Off Placeholder */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                    <VideoOff className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-400">Camera is paused</p>
                </div>
              )}

              {/* Hardware Permission Notice */}
              {mediaError && (
                <div className="absolute top-4 left-4 right-4 bg-zinc-950/90 border border-yellow-500/30 p-3 rounded-2xl flex items-center gap-2 text-xs text-yellow-400 z-20 backdrop-blur-md">
                  <AlertCircle className="w-4 h-4 shrink-0 text-yellow-500" />
                  <span>{mediaError}</span>
                </div>
              )}

              {/* Top Video Overlay Stats */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-2">
                  {isLive ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span className="font-mono">{formatTimer(liveDuration)}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-zinc-400 text-xs font-medium">
                      Studio Preview
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold">
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{isLive ? viewerCount : 0} viewers</span>
                  </div>
                </div>

                {/* Stream Type Pill */}
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-zinc-300">
                  {accessType === 'public' ? '🌐 Public Stream' : '🔒 VIP Subscribers Only'}
                </div>
              </div>

              {/* Celebratory Tip Alert Overlay */}
              {recentTip && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-bounce">
                  <div className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
                    <Trophy className="w-5 h-5 text-yellow-300 animate-spin" />
                    <div>
                      <div className="font-black text-xs uppercase tracking-wider">{recentTip.fanName} sent a tip!</div>
                      <div className="font-bold text-sm text-yellow-100">+KES {recentTip.amount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Hearts Reaction Canvas Overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                {floatingReactions.map(r => (
                  <div
                    key={r.id}
                    className="absolute bottom-8 text-2xl animate-float-reaction select-none"
                    style={{ left: `${r.left}%` }}
                  >
                    {r.emoji}
                  </div>
                ))}
              </div>

              {/* Bottom Video Controls Bar */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMic}
                    className={`p-3 rounded-2xl backdrop-blur-xl border transition-all ${
                      micActive 
                        ? 'bg-black/60 text-white border-white/10 hover:bg-black/80' 
                        : 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30'
                    }`}
                    title={micActive ? 'Mute Mic' : 'Unmute Mic'}
                  >
                    {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={toggleCamera}
                    className={`p-3 rounded-2xl backdrop-blur-xl border transition-all ${
                      cameraActive 
                        ? 'bg-black/60 text-white border-white/10 hover:bg-black/80' 
                        : 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30'
                    }`}
                    title={cameraActive ? 'Turn Off Video' : 'Turn On Video'}
                  >
                    {cameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={switchCamera}
                    className="p-3 rounded-2xl bg-black/60 text-white border border-white/10 hover:bg-black/80 backdrop-blur-xl transition-all"
                    title="Switch Camera (Front/Back)"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Earnings Tracker Chip */}
                {isLive && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/70 backdrop-blur-xl border border-emerald-500/30 text-emerald-400 font-bold text-xs shadow-lg">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span>KES {totalTipsEarned.toLocaleString()} earned (70% net)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stream Settings Drawer (When Not Live) */}
            {!isLive && (
              <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-red-500" /> Stream Settings & Audience Access
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5">Broadcast Title</label>
                    <input
                      type="text"
                      value={streamTitle}
                      onChange={e => setStreamTitle(e.target.value)}
                      placeholder="e.g. VIP Hangout & Live Q&A"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5">Category</label>
                    <select
                      value={streamCategory}
                      onChange={e => setStreamCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 focus:outline-none"
                    >
                      <option value="VIP Lounge">VIP Lounge</option>
                      <option value="Lifestyle">Lifestyle & Chat</option>
                      <option value="Exclusive Preview">Exclusive Preview</option>
                      <option value="Fitness">Fitness & Wellness</option>
                      <option value="Private Show">Private VIP Show</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-zinc-400 mb-2">Who can watch this live stream?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccessType('public')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        accessType === 'public'
                          ? 'border-red-500 bg-red-600/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>🌐 Public Preview (Recommended)</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Open to all fans and visitors. Perfect for marketing yourself and driving new monthly subscriptions.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessType('subscribers_only')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        accessType === 'subscribers_only'
                          ? 'border-red-500 bg-red-600/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>🔒 VIP Subscribers Only</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Only paying subscribers can watch. Non-subscribers see a blurred preview with an instant Subscribe button.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Chat & Fan Interactions (4 Cols) */}
          <div className="lg:col-span-4 bg-[#0d0e12] border border-zinc-800 rounded-3xl h-[600px] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <MessageCircle className="w-4 h-4 text-red-500" />
                <span>Live Studio Chat</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {messages.length} messages
              </span>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.map(m => (
                <div 
                  key={m.id} 
                  className={`text-xs p-3 rounded-2xl leading-relaxed ${
                    m.isTip 
                      ? 'bg-gradient-to-r from-red-600/20 to-amber-500/20 border border-amber-500/30 text-white' 
                      : m.userId === user?.id 
                        ? 'bg-red-600/10 border border-red-500/20 ml-4' 
                        : 'bg-zinc-900/60 border border-zinc-800/80 mr-4'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-black ${m.isTip ? 'text-amber-400 font-bold' : m.userId === user?.id ? 'text-red-400' : 'text-zinc-300'}`}>
                      {m.userName}
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

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder={isLive ? "Chat with your viewers..." : "Go live to activate chat..."}
                disabled={!isLive}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isLive || !inputMessage.trim()}
                className="p-2 rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 transition-colors active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

        {/* Stream Summary Modal */}
        {showSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative">
              <div className="w-16 h-16 rounded-3xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Broadcast Ended</h3>
                <p className="text-xs text-zinc-400 mt-1">Here is how your live stream performed today:</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Duration</div>
                  <div className="text-lg font-black text-white mt-1">{summaryStats.duration}</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Peak Viewers</div>
                  <div className="text-lg font-black text-red-500 mt-1">{summaryStats.peakViewers}</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Net Tips</div>
                  <div className="text-lg font-black text-emerald-400 mt-1">KES {summaryStats.totalTips.toLocaleString()}</div>
                </div>
              </div>

              <button
                onClick={() => setShowSummary(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                Close Summary
              </button>
            </div>
          </div>
        )}

      </div>

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
    </CreatorLayout>
  );
}
