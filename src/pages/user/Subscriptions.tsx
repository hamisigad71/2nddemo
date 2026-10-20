import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { CheckCircle2, XCircle, MoreVertical, RefreshCw, ExternalLink, MessageCircle, Loader2, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getFanSubscriptions, cancelSubscription } from '../../lib/db';
import { toast } from '../../context/ToastContext';
import SubscribeModal from '../../components/SubscribeModal';
import { resolveUserAvatar } from '../../lib/avatar';

interface SubItem {
  id: string;
  creatorId: string;
  name: string;
  handle: string;
  avatar: string;
  tier: string;
  tierBadgeClass: string;
  price: number;
  autoRenew: boolean;
  renewDate: string;
  isReal?: boolean;
}

const Subscriptions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeSubs, setActiveSubs] = useState<SubItem[]>([]);
  const [expiredSubs, setExpiredSubs] = useState<SubItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Resubscribe modal
  const [resubCreator, setResubCreator] = useState<{ id: string; name: string; price: number } | null>(null);

  const fetchSubscriptions = async () => {
    if (!user?.id) {
      setActiveSubs([]);
      setExpiredSubs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const rawSubs = await getFanSubscriptions(user.id);

      if (rawSubs && rawSubs.length > 0) {
        const active: SubItem[] = [];
        const expired: SubItem[] = [];

        rawSubs.forEach((sub: any) => {
          const isExpired = sub.expires_at && new Date(sub.expires_at) < new Date();
          const renewText = sub.expires_at
            ? `Expires ${new Date(sub.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'Auto-renews monthly';

          const item: SubItem = {
            id: sub.id,
            creatorId: sub.creator?.id || sub.creator_id,
            name: sub.creator?.name || 'Creator',
            handle: sub.creator?.handle || `@creator_${sub.creator_id.slice(0, 5)}`,
            avatar: resolveUserAvatar(sub.creator?.avatar, sub.creator?.name),
            tier: sub.tier_name || 'VIP Tier',
            tierBadgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
            price: sub.creator?.price || 1000,
            autoRenew: !isExpired && sub.status === 'active',
            renewDate: renewText,
            isReal: true,
          };

          if (sub.status === 'active' && !isExpired) {
            active.push(item);
          } else {
            expired.push(item);
          }
        });

        setActiveSubs(active);
        setExpiredSubs(expired);
      } else {
        setActiveSubs([]);
        setExpiredSubs([]);
      }
    } catch (err) {
      console.error('Error fetching user subscriptions:', err);
      setActiveSubs([]);
      setExpiredSubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [user?.id]);

  const handleCancelSub = async (sub: SubItem) => {
    setOpenMenuId(null);
    if (!confirm(`Are you sure you want to cancel your subscription to ${sub.name}?`)) return;

    if (sub.isReal) {
      try {
        await cancelSubscription(sub.id);
        toast.success(`Cancelled subscription to ${sub.name}`);
        fetchSubscriptions();
      } catch (e: any) {
        toast.error('Failed to cancel: ' + (e?.message || 'Server error'));
      }
    } else {
      setActiveSubs(prev => prev.filter(s => s.id !== sub.id));
      toast.success(`Removed subscription to ${sub.name}`);
    }
  };

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1 flex items-center gap-2">
            Active Subscriptions
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              {activeSubs.length} Active
            </span>
          </h1>
          <p className="text-sm text-zinc-400">
            Manage the creators you are currently supporting. Tap any creator to visit their profile.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm">Loading your subscriptions...</p>
          </div>
        ) : activeSubs.length === 0 ? (
          <div className="py-16 text-center bg-black/60 border border-white/10 rounded-3xl p-8">
            <div className="w-14 h-14 rounded-2xl bg-red-600/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Active Subscriptions</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-6">
              You haven't subscribed to any creators yet. Support your favorite creators to unlock exclusive content and direct messaging.
            </p>
            <button
              onClick={() => navigate('/feed')}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/20"
            >
              Explore Feed
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSubs.map((sub) => {
              const isMenuOpen = openMenuId === sub.id;

              return (
                <div
                  key={sub.id}
                  className="bg-black border border-white/10 rounded-2xl p-5 md:p-6 shadow-lg hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative group"
                >
                  {/* Left: Avatar & Creator Details (Clickable) */}
                  <div
                    onClick={() => navigate(`/creator/${sub.creatorId}`)}
                    className="flex items-center gap-4 cursor-pointer flex-1"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={sub.avatar}
                        alt={sub.name}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-red-500/30 ring-offset-2 ring-offset-black transition-transform group-hover:scale-105"
                      />
                      {sub.autoRenew && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-black" />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-lg text-white flex items-center gap-2.5 flex-wrap">
                        <span className="group-hover:text-red-400 transition-colors">{sub.name}</span>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold border ${sub.tierBadgeClass}`}
                        >
                          {sub.tier}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mb-1.5">{sub.handle}</div>
                      <div
                        className={`text-xs font-semibold flex items-center gap-1.5 ${
                          sub.autoRenew ? 'text-zinc-300' : 'text-red-400'
                        }`}
                      >
                        {sub.autoRenew ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        {sub.renewDate}
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Options Menu */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/10 sm:border-0 relative">
                    <div className="text-left sm:text-right">
                      <div className="font-extrabold text-xl text-white">
                        KES {sub.price.toLocaleString()}
                        <span className="text-xs text-zinc-400 font-medium ml-1">/mo</span>
                      </div>
                    </div>

                    {/* View Profile Direct Button on Desktop */}
                    <button
                      onClick={() => navigate(`/creator/${sub.creatorId}`)}
                      className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-red-500" />
                      Profile
                    </button>

                    {/* Three-dots menu button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : sub.id);
                        }}
                        className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors border border-white/10 cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mt-2 w-48 bg-[#121318] border border-white/15 rounded-xl shadow-2xl p-1.5 z-30 text-xs font-bold animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                navigate(`/creator/${sub.creatorId}`);
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/10 text-white flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4 text-red-500" />
                              View Profile
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                navigate('/user/messages');
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/10 text-white flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4 text-zinc-400" />
                              Send Message
                            </button>
                            <button
                              onClick={() => handleCancelSub(sub)}
                              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel Subscription
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expired Subscriptions Section */}
        <div className="mt-12">
          <h2 className="text-xl font-extrabold text-white mb-4">
            Expired Subscriptions
          </h2>

          {expiredSubs.length > 0 ? (
            <div className="space-y-3">
              {expiredSubs.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-black border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition-all cursor-pointer group"
                  onClick={() => navigate(`/creator/${exp.creatorId}`)}
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={exp.avatar}
                      alt={exp.name}
                      className="w-12 h-12 rounded-full object-cover grayscale opacity-60 ring-1 ring-white/10 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                    />
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-red-400 transition-colors">
                        {exp.name}
                      </div>
                      <div className="text-xs text-zinc-400">{exp.renewDate}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setResubCreator({ id: exp.creatorId, name: exp.name, price: exp.price });
                    }}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_2px_10px_rgba(220,38,38,0.3)] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resubscribe
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-black/40 border border-white/5 rounded-2xl p-6 text-zinc-500 text-sm font-medium">
              No expired subscriptions.
            </div>
          )}
        </div>

        {/* Resubscribe Modal */}
        {resubCreator && (
          <SubscribeModal
            isOpen={!!resubCreator}
            onClose={() => {
              setResubCreator(null);
              fetchSubscriptions();
            }}
            creatorName={resubCreator.name}
            creatorId={resubCreator.id}
            price={resubCreator.price}
          />
        )}
      </div>
    </UserLayout>
  );
};

export default Subscriptions;
