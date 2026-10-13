import { useState } from 'react';
import { Link } from 'react-router-dom';
import CreatorLayout from '../../components/CreatorLayout';
import { Tag, Copy, Plus, Activity, Flame, Check, ExternalLink, Sparkles, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';

const Promotions = () => {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const profileUrl = typeof window !== 'undefined' && user?.id ? `${window.location.origin}/creator/${user.id}` : '';
  const promoUrl = profileUrl ? `${profileUrl}?ref=promo50` : '';

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Link copied to clipboard', {
      description: 'You can now share this on Instagram, Twitter, TikTok, or WhatsApp.'
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <CreatorLayout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
              Promotions & Marketing <Sparkles className="w-6 h-6 text-red-500" />
            </h1>
            <p className="text-zinc-400 text-sm">
              Generate tracked promo links and manage subscriber discounts for your profile.
            </p>
          </div>
          {user?.id && (
            <Link
              to={`/creator/${user.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border border-white/10 text-xs font-bold transition-all shadow-md self-start sm:self-auto"
            >
              View Public Page <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Link>
          )}
        </div>

        {/* Shareable Links Card */}
        <div className="bg-[#0D0E12] border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl">
          <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
            <Tag className="w-5 h-5 text-red-500" /> Your Official Creator Links
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mb-6">
            Share these links in your social media bios, DMs, or campaigns to send fans directly to your profile.
          </p>

          <div className="space-y-4">
            {/* Primary Profile Link */}
            <div className="p-4 bg-black/60 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-1">
                  Direct Profile Link
                </div>
                <div className="text-white text-sm font-bold truncate font-mono">
                  {profileUrl || 'Loading profile link...'}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(profileUrl, 'profile')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer"
              >
                {copiedId === 'profile' ? <><Check className="w-4 h-4 text-emerald-400" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
              </button>
            </div>

            {/* 50% Off Promo Link */}
            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-red-400">
                    50% Discount Promo Link
                  </span>
                  <span className="text-[10px] bg-red-600 text-white font-extrabold uppercase px-2 py-0.5 rounded-full">
                    High Conversion
                  </span>
                </div>
                <div className="text-white text-sm font-bold truncate font-mono">
                  {promoUrl || 'Loading promo link...'}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(promoUrl, 'promo')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all shrink-0 cursor-pointer"
              >
                {copiedId === 'promo' ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Promo Link</>}
              </button>
            </div>
          </div>
        </div>

        {/* Active Promotions & Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0D0E12] border border-white/10 rounded-3xl p-6 sm:p-8 col-span-2 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white">Active Profile Campaigns</h2>
                <p className="text-zinc-400 text-xs mt-1">Discounts currently active on your profile page.</p>
              </div>
              <Link
                to="/edit-profile"
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold"
              >
                <Settings className="w-3.5 h-3.5" /> Adjust Pricing & Promo
              </Link>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold flex items-center gap-2 text-base text-white">
                    <Flame className="w-4 h-4 text-red-500" /> Limited-Time 50% Welcome Promo
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2">
                    <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Active on Profile</span>
                    <span>30-Day Duration</span>
                    <span className="px-2 py-0.5 bg-red-600/20 text-red-400 font-bold rounded-full">50% OFF</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/edit-profile"
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Edit Offer
                  </Link>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold flex items-center gap-2 text-base text-white">
                    <Tag className="w-4 h-4 text-blue-400" /> Multi-Month Subscription Bundles
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2">
                    <span>3 Months (15% OFF)</span>
                    <span>6 Months (25% OFF)</span>
                    <span>12 Months (35% OFF)</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl self-start sm:self-auto">
                  Enabled
                </span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-[#0D0E12] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" /> Growth Playbook
              </h2>
              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="font-black text-white block mb-1">Post 3+ Free Teasers:</span>
                  Free posts are visible to everyone without subscribing. They build curiosity and drive 4x higher subscription conversions.
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="font-black text-white block mb-1">Use PPV for Top Videos:</span>
                  Set individual PPV unlock prices (e.g. KES 250) on long-form videos so casual fans can buy single videos instantly via M-Pesa.
                </div>
              </div>
            </div>
            <Link
              to="/guide"
              className="mt-6 w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl border border-white/10 text-center transition-all block"
            >
              Read Full Creator Playbook →
            </Link>
          </div>
        </div>
      </div>
    </CreatorLayout>
  );
};

export default Promotions;
