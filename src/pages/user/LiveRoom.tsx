import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Radio, Bell, CheckCircle2, 
  Video, Coins, Heart, Compass, Home
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

export default function LiveRoom() {
  const navigate = useNavigate();
  const [notified, setNotified] = useState(false);

  const handleNotifyMe = () => {
    setNotified(true);
    toast.success("Notification saved! We'll alert you the moment Creator Live Streaming launches.");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-foreground flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/" className="text-lg sm:text-xl font-black tracking-tight text-white">
              The Gents Dollhouse<span className="text-red-500">.</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/discover"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-red-500" />
              <span>Explore Creators</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full my-auto">
        {/* Mock Live Player Frame (Simulating a live broadcast stage) */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-zinc-900/90 via-[#0e0e12]/95 to-black border border-white/15 shadow-2xl p-6 sm:p-12 text-center mb-8">
          {/* Ambient Red & Amber Lighting Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Live Streaming Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
            </span>
            Live Streaming Feature · Under Development
          </div>

          {/* Central Pulsating Broadcast Icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-white shadow-2xl shadow-red-600/40">
              <Radio className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Live Stream Room <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400">
              Coming Soon
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed mb-8">
            Live interactive creator broadcasts are currently under active development. Soon you'll be able to watch your favorite verified creators stream live, chat in real time, and send instant tips!
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              onClick={handleNotifyMe}
              disabled={notified}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                notified
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                  : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 hover:scale-105 active:scale-95"
              }`}
            >
              {notified ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Notification Set
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" /> Notify Me When Live Launches
                </>
              )}
            </button>
            <Link
              to="/discover"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Compass className="w-4 h-4 text-red-500" /> Explore Creators
            </Link>
          </div>
        </div>

        {/* Feature Highlights for Subscribers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-3">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Exclusive Live Shows</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Watch VIP sessions, Q&As, and private subscriber-only broadcasts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Instant Live Tipping</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Send instant M-Pesa tips during the stream to get direct shoutouts and badge highlights.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-3">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Real-time Reactions</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Send floating reactions, animated gifts, and chat directly with creators.
            </p>
          </div>
        </div>
      </main>

      {/* Footer link */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-500 px-4">
        <div className="flex items-center justify-center gap-4">
          <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
          <span>•</span>
          <Link to="/discover" className="hover:text-white transition-colors flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> All Creators
          </Link>
        </div>
      </footer>
    </div>
  );
}
