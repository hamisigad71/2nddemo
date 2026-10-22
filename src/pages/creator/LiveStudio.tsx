import { useState } from 'react';
import { 
  Radio, Video, Sparkles, Bell, ArrowLeft, Plus, 
  Coins, MessageCircle, Lock, CheckCircle2,
  Clock, Zap, LayoutDashboard, Wifi, Activity, X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CreatorLayout from '../../components/CreatorLayout';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { createLiveStream } from '../../lib/liveStream';
import { getStoredCreatorProfile } from '../../lib/db';

export default function LiveStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notified, setNotified] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [streamTitle, setStreamTitle] = useState('VIP Live Broadcast & Chat 💋');
  const [category, setCategory] = useState('VIP Lounge');
  const [accessType, setAccessType] = useState<'public' | 'subscribers_only'>('public');
  const [startingBroadcast, setStartingBroadcast] = useState(false);

  const handleNotifyMe = () => {
    setNotified(true);
    toast.success("You're on the early-access list! You'll receive an email notification when Live Studio launches.");
  };

  const handleStartBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in as a creator to broadcast.');
      return;
    }

    try {
      setStartingBroadcast(true);
      const profile = getStoredCreatorProfile(user.id);
      const creatorName = profile?.name || profile?.display_name || user.user_metadata?.name || user.user_metadata?.full_name || 'Creator';
      const creatorAvatar = profile?.avatar || profile?.avatar_url || user.user_metadata?.avatar_url || null;

      const stream = await createLiveStream({
        creatorId: user.id,
        creatorName,
        creatorAvatar: creatorAvatar || undefined,
        title: streamTitle.trim() || 'Live Broadcast',
        category,
        accessType
      });

      toast.success('Broadcast live! Platform subscribers & admins have been notified.');
      setShowBroadcastModal(false);
      navigate(`/live/${stream.id}`);
    } catch (err: any) {
      toast.error('Failed to initialize broadcast: ' + (err.message || err));
    } finally {
      setStartingBroadcast(false);
    }
  };

  return (
    <CreatorLayout>
      <div className="max-w-4xl mx-auto pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
          </button>
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> Under Development
          </span>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0c0d11] border border-white/10 p-6 sm:p-12 mb-10 shadow-2xl">
          {/* Studio Radial Stage Light */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-15%,rgba(220,38,38,0.22),transparent)] pointer-events-none" />
          <div 
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* Top Telemetry / Status Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 mb-8 border-b border-white/10 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="font-bold tracking-widest uppercase text-red-400 text-[11px]">
                BROADCAST STAGE · CALIBRATING
              </span>
            </div>

            <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" /> WEBRTC LIVE
              </span>
              <span className="hidden sm:inline text-zinc-700">|</span>
              <span className="hidden sm:flex items-center gap-1.5 text-zinc-300">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> &lt;250MS LATENCY
              </span>
              <span className="hidden md:inline text-zinc-700">|</span>
              <span className="hidden md:inline text-zinc-400">1080P60 HD</span>
            </div>
          </div>

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            {/* Studio Master Emblem */}
            <div className="inline-flex items-center justify-center mb-6">
              <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/15 shadow-2xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-inner">
                  <Radio className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
                </div>
                {/* Audio Master VU Level Bars */}
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/95 border border-white/20 flex items-center gap-1 shadow-lg">
                  <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-pulse delay-100" />
                  <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse delay-150" />
                  <span className="w-1 h-1.5 bg-red-400 rounded-full animate-pulse delay-200" />
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
              Go Live Studio <span className="text-red-500 font-extrabold">Coming Soon</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
              We are engineering a high-performance, ultra-low latency live broadcasting studio built directly into your creator platform. Soon, you will be able to broadcast in HD to your subscribers, host private VIP rooms, and receive instant M-Pesa tips in real time.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-red-600/30 active:scale-[0.98] cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" /> Go Live Now (Broadcast)
              </button>

              <button
                onClick={handleNotifyMe}
                disabled={notified}
                className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  notified
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                    : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                }`}
              >
                {notified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Early Access Reserved
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" /> Keep Me Updated
                  </>
                )}
              </button>

              <Link
                to="/create-post"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" /> Upload Content
              </Link>
            </div>

            {/* Studio Capabilities Telemetry Quad-Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-6 border-t border-white/10 text-left">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
                <Video className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-white">1080p60 HD</div>
                  <div className="text-[10px] text-zinc-400">Crisp Video Ingest</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-white">Live M-Pesa</div>
                  <div className="text-[10px] text-zinc-400">Instant Screen Tips</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-white">VIP Lounges</div>
                  <div className="text-[10px] text-zinc-400">Exclusive 1-on-1</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-white">&lt;250ms Audio</div>
                  <div className="text-[10px] text-zinc-400">Real-Time Sync</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Preview Grid */}
        <div className="mb-10">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-4 px-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> What's Coming in Live Studio
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Low Latency HD */}
            <div className="p-5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Ultra-Low Latency HD Video</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Stream seamlessly from your phone or web camera with crystal-clear 1080p resolution and sub-second delay for smooth conversations.
                </p>
              </div>
            </div>

            {/* 2. Instant M-Pesa Tipping */}
            <div className="p-5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Live M-Pesa Tipping & Goals</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Fans can send instant tips during your stream with celebratory on-screen popups, sound effects, and tip goal progress bars.
                </p>
              </div>
            </div>

            {/* 3. VIP & Subscriber Only Rooms */}
            <div className="p-5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">VIP & Subscriber Lounges</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Restrict broadcasts exclusively to your paying monthly subscribers, or set an unlock fee for pay-per-view live access.
                </p>
              </div>
            </div>

            {/* 4. Real-time Interactive Chat */}
            <div className="p-5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Interactive Chat & Reactions</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Live floating hearts, animated reactions, VIP badge highlights, and moderator tools to keep your broadcast friendly and safe.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Development Progress Strip */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-black border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Engineering Status: In Development</h4>
              <p className="text-xs text-zinc-400">WebRTC video ingest & live transaction listeners are being optimized.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-red-500" /> Go to Dashboard
            </Link>
          </div>
        </div>
        {/* Broadcast Initialization Modal */}
        {showBroadcastModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0e1015] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Go Live Now</h3>
                  <p className="text-xs text-zinc-400">Launch a live broadcast. Subscribers & admin will be notified.</p>
                </div>
              </div>

              <form onSubmit={handleStartBroadcast} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Broadcast Title
                  </label>
                  <input
                    type="text"
                    required
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="e.g. Late Night VIP Lounge & Q&A 💋"
                    className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                    >
                      <option value="VIP Lounge">VIP Lounge</option>
                      <option value="Exclusive Q&A">Exclusive Q&A</option>
                      <option value="Casual Hangout">Casual Hangout</option>
                      <option value="Music & Dance">Music & Dance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Audience Access
                    </label>
                    <select
                      value={accessType}
                      onChange={(e) => setAccessType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                    >
                      <option value="public">Public (All Fans)</option>
                      <option value="subscribers_only">Subscribers Only</option>
                    </select>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 text-xs text-zinc-300 flex items-start gap-2.5">
                  <Bell className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    When you click broadcast, an alert will be dispatched in real time to your fans and the platform admin console.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="flex-1 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={startingBroadcast}
                    className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {startingBroadcast ? 'Starting...' : 'Start Broadcast'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CreatorLayout>
  );
}
