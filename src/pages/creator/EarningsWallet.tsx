import { useState, useEffect, useCallback } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Building,
  Loader2,
  CheckCircle,
  Wallet,
  MessageCircle,
  X,
  Smartphone,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getCreatorTransactions,
  getUserProfile,
  updateUserProfile,
  requestCreatorPayout,
  PLATFORM_FEE,
} from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { toast } from '../../context/ToastContext';

const EarningsWallet = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  // Payout Phone & Modal State
  const [payoutPhone, setPayoutPhone] = useState('');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [savingPhone, setSavingPhone] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getCreatorTransactions(user.id);
      setTransactions(data || []);
    } catch (err) {
      console.error('Error loading wallet transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchTransactions();

    getUserProfile(user.id).then((profile) => {
      if (profile?.phone) {
        setPayoutPhone(profile.phone);
      } else if (user.user_metadata?.phone) {
        setPayoutPhone(user.user_metadata.phone);
      }
    }).catch(() => {});

    const handleRefresh = () => {
      fetchTransactions();
    };

    window.addEventListener('wallet_updated', handleRefresh);
    window.addEventListener('payouts_updated', handleRefresh);

    // Real-time Supabase listener for instant balance updates
    const channel = supabase
      .channel(`creator_wallet_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `to_creator_id=eq.${user.id}`,
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('wallet_updated', handleRefresh);
      window.removeEventListener('payouts_updated', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchTransactions]);

  // ── 30% Platform Fee / 70% Creator Net Ledger Calculations ────────────
  const incomingTransactions = transactions.filter(
    (t) => t.type !== 'payout' && t.type !== 'withdrawal' && t.status === 'completed'
  );

  const payoutTransactions = transactions.filter(
    (t) => t.type === 'payout' || t.type === 'withdrawal'
  );

  const totalGrossEarned = incomingTransactions.reduce(
    (sum, t) => sum + Number(t.gross_amount || 0),
    0
  );

  const totalPlatformFees = incomingTransactions.reduce((sum, t) => {
    const gross = Number(t.gross_amount || 0);
    const fee = t.platform_fee !== undefined && t.platform_fee !== null
      ? Number(t.platform_fee)
      : Math.round(gross * PLATFORM_FEE);
    return sum + fee;
  }, 0);

  const totalNetEarned = incomingTransactions.reduce((sum, t) => {
    const gross = Number(t.gross_amount || 0);
    const net = t.net_amount !== undefined && t.net_amount !== null
      ? Number(t.net_amount)
      : Math.round(gross * (1 - PLATFORM_FEE));
    return sum + net;
  }, 0);

  const pendingBalance = payoutTransactions
    .filter((t) => t.status === 'pending' || t.status === 'pending_withdrawal')
    .reduce((sum, t) => sum + Number(t.net_amount || t.gross_amount || 0), 0);

  const totalWithdrawn = payoutTransactions
    .filter((t) => t.status === 'completed' || t.status === 'approved')
    .reduce((sum, t) => sum + Number(t.net_amount || t.gross_amount || 0), 0);

  const availableBalance = Math.max(0, totalNetEarned - pendingBalance - totalWithdrawn);

  const formatLabel = (type: string) => {
    if (type === 'tip') return 'Tip received';
    if (type === 'subscription') return 'VIP Subscription';
    if (type === 'ppv') return 'PPV Content Unlock';
    if (type === 'withdrawal' || type === 'payout') return 'Withdrawal Request (M-Pesa)';
    return type;
  };

  const openWithdrawModal = () => {
    if (availableBalance <= 0) {
      toast.error('No available balance to withdraw.');
      return;
    }
    setWithdrawAmount(String(availableBalance));
    setIsWithdrawModalOpen(true);
  };

  const handleConfirmWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const numericAmount = Number(withdrawAmount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid withdrawal amount.');
      return;
    }
    if (numericAmount > availableBalance) {
      toast.error(`Amount cannot exceed your available balance of KES ${availableBalance.toLocaleString()}.`);
      return;
    }
    if (!payoutPhone || payoutPhone.replace(/\D/g, '').length < 9) {
      toast.error('Please provide a valid M-Pesa phone number to receive your payout.');
      return;
    }

    setWithdrawStatus('pending');
    try {
      // Save updated phone to user profile if changed
      try {
        await updateUserProfile(user.id, { phone: payoutPhone.trim() });
      } catch {}

      await requestCreatorPayout(user.id, numericAmount, payoutPhone.trim(), 'M-Pesa');

      setWithdrawStatus('success');
      setIsWithdrawModalOpen(false);
      toast.success('Withdrawal Request Sent to Admin!', {
        description: `KES ${numericAmount.toLocaleString()} is now pending Admin approval and M-Pesa transfer to ${payoutPhone.trim()}.`,
      });
      await fetchTransactions();
      setTimeout(() => setWithdrawStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Withdrawal request error:', err);
      setWithdrawStatus('failed');
      toast.error('Withdrawal request failed', {
        description: err?.message || 'Could not submit withdrawal request.',
      });
      setTimeout(() => setWithdrawStatus('idle'), 3000);
    }
  };

  const handleSavePhoneOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!payoutPhone || payoutPhone.replace(/\D/g, '').length < 9) {
      toast.error('Please enter a valid M-Pesa phone number.');
      return;
    }
    setSavingPhone(true);
    try {
      await updateUserProfile(user.id, { phone: payoutPhone.trim() });
      toast.success('Payout M-Pesa number updated!');
      setIsPhoneModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save phone number.');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleDownloadCSV = () => {
    if (transactions.length === 0) {
      toast.info('No transactions to export yet.');
      return;
    }
    const headers = ['Date', 'Type', 'Gross (KES)', 'Platform Fee 30% (KES)', 'Net Credited 70% (KES)', 'Status', 'Reference'];
    const rows = transactions.map((t) => {
      const isPayout = t.type === 'payout' || t.type === 'withdrawal';
      const gross = Number(t.gross_amount || 0);
      const fee = isPayout ? 0 : Number(t.platform_fee ?? Math.round(gross * PLATFORM_FEE));
      const net = Number(t.net_amount ?? (isPayout ? gross : gross - fee));
      return [
        t.created_at ? new Date(t.created_at).toISOString() : '',
        t.type,
        gross,
        fee,
        isPayout ? -net : net,
        t.status,
        `"${(t.reference_id || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creator-wallet-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
            Wallet & Payouts
          </h1>
          <p className="text-zinc-400 font-medium text-sm">
            Track your net earnings (70% after 30% platform fee) and request M-Pesa payouts from Admin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Main Balance Card */}
        <div className="lg:col-span-2 rounded-[2rem] p-8 md:p-10 bg-[#0d0e12] border border-zinc-900 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            {/* Header Row */}
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded-full px-3.5 py-1.5 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black tracking-widest uppercase text-emerald-400">
                    Live Wallet Ledger · 70% Creator Share
                  </span>
                </div>
                <div className="text-xs font-black text-red-500 tracking-widest uppercase mb-1">
                  Available to Withdraw (Net after 30% Fee)
                </div>
                <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
                  <span className="text-red-500 text-2xl md:text-3xl font-extrabold align-top mt-2 mr-1.5 inline-block">
                    KES
                  </span>
                  {availableBalance.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                </h2>
              </div>

              <div className="flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 bg-red-950/50 border border-zinc-800">
                <Wallet className="w-6 h-6 text-red-500" />
              </div>
            </div>

            {/* Stats Breakdown Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Gross Activity</div>
                <div className="text-sm font-black text-white mt-0.5">KES {totalGrossEarned.toLocaleString()}</div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">30% Platform Fee</div>
                <div className="text-sm font-black text-red-400 mt-0.5">- KES {totalPlatformFees.toLocaleString()}</div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Net Earned (70%)</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">KES {totalNetEarned.toLocaleString()}</div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Total Paid Out</div>
                <div className="text-sm font-black text-sky-400 mt-0.5">KES {totalWithdrawn.toLocaleString()}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={openWithdrawModal}
                disabled={withdrawStatus === 'pending' || availableBalance <= 0}
                className="flex items-center justify-center gap-1.5 py-3 sm:py-4 rounded-2xl font-black text-[11px] sm:text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white bg-red-600 hover:bg-red-700 border border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.35)] cursor-pointer"
              >
                {withdrawStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {withdrawStatus === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                {withdrawStatus === 'idle' && <ArrowUpRight className="w-4 h-4 shrink-0" />}
                <span>{withdrawStatus === 'success' ? 'Request Sent!' : 'Withdraw to M-Pesa'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-3 sm:py-4 rounded-2xl font-bold text-[11px] sm:text-sm text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all active:scale-95 cursor-pointer"
              >
                <Building className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>Payout Number</span>
              </button>
            </div>

            {/* Live Support Concierge Banner */}
            <div className="pt-4 mt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                    alt="Amina"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-rose-500/40"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0d0e12]" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Questions about payout hours or clearance?</div>
                  <div className="text-[11px] text-zinc-400">Admin processes M-Pesa withdrawal requests directly to your registered number.</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open_creator_support', {
                      detail: { prompt: 'How many hours does it take to receive my payout?' },
                    })
                  );
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 px-3 py-2 rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Ask Live Support</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Status & Method Cards */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-[2rem] p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-zinc-400 font-bold text-xs uppercase tracking-wider mb-3">
              <Clock className="w-4 h-4 text-amber-400" /> Pending Admin Approval
            </div>
            <div className="text-3xl font-black text-amber-400">KES {pendingBalance.toLocaleString()}</div>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              {pendingBalance > 0
                ? 'Withdrawal requested — Admin has been notified to disburse your funds.'
                : 'No pending withdrawal requests right now.'}
            </p>
          </div>

          <div className="bg-[#0d0e12] border border-zinc-800 rounded-[2rem] p-6 shadow-xl flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-zinc-400 font-bold text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-red-500" /> Default Payout Method
              </div>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(true)}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
              >
                Edit
              </button>
            </div>
            <div className="flex items-center gap-3.5 mt-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
              <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-black text-xs shrink-0">
                MP
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm text-white">M-Pesa Direct</div>
                <div className="text-xs text-zinc-400 font-mono truncate">
                  {payoutPhone || 'No number set — click Edit'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-[#0d0e12] border border-zinc-800 rounded-[2rem] shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-none mb-1">Wallet Activity & Ledger</h3>
              <p className="text-xs text-zinc-400 font-medium">
                30% platform fee is automatically deducted from every tip, subscription & PPV unlock
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              70% Creator Net · 30% Fee
            </span>
          </div>

          <button
            type="button"
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 px-4 py-2.5 rounded-xl transition-colors active:scale-95 self-start sm:self-auto bg-zinc-900/60 cursor-pointer"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <p className="text-sm font-medium">Loading wallet activity…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-black text-white text-base mb-1">No transactions yet</p>
              <p className="text-sm text-zinc-400 max-w-xs font-medium">
                Earnings from tips, VIP subscriptions and PPV unlocks will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {transactions.map((t) => {
              const isPayout = t.type === 'payout' || t.type === 'withdrawal';
              const gross = Number(t.gross_amount || 0);
              const fee = isPayout
                ? 0
                : t.platform_fee !== undefined && t.platform_fee !== null
                  ? Number(t.platform_fee)
                  : Math.round(gross * PLATFORM_FEE);
              const net = isPayout
                ? Number(t.net_amount || t.gross_amount || 0)
                : t.net_amount !== undefined && t.net_amount !== null
                  ? Number(t.net_amount)
                  : Math.round(gross - fee);

              const rawStatus = String(t.status || 'completed').toLowerCase();
              const isPendingPayout = isPayout && (rawStatus === 'pending' || rawStatus === 'pending_withdrawal');
              const isRejectedPayout = isPayout && (rawStatus === 'rejected' || rawStatus === 'failed');
              const isApprovedPayout = isPayout && (rawStatus === 'completed' || rawStatus === 'approved');

              return (
                <div
                  key={t.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-zinc-900/60 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        isPayout
                          ? isRejectedPayout
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                            : isPendingPayout
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {isPendingPayout ? (
                        <Clock className="w-5 h-5 text-amber-400" />
                      ) : isRejectedPayout ? (
                        <XCircle className="w-5 h-5 text-zinc-400" />
                      ) : isPayout ? (
                        <ArrowDownRight className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                        <span>{formatLabel(t.type)}</span>
                        {isPendingPayout && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Pending Admin Approval
                          </span>
                        )}
                        {isApprovedPayout && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Paid Out
                          </span>
                        )}
                        {isRejectedPayout && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Declined · Restored to Wallet
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>
                          {t.created_at
                            ? new Date(t.created_at).toLocaleDateString('en-KE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recent'}
                        </span>
                        {isPayout && t.reference_id && (
                          <span className="text-zinc-500 font-mono text-[11px]">· {t.reference_id}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-black text-sm tracking-tight ${
                        isRejectedPayout
                          ? 'text-zinc-500 line-through'
                          : isPayout
                            ? 'text-red-400'
                            : 'text-emerald-400'
                      }`}
                    >
                      {isPayout ? '−' : '+'} KES {net.toLocaleString()}
                    </div>
                    {!isPayout && (
                      <div className="text-[11px] text-zinc-500 font-medium mt-0.5">
                        Gross: KES {gross.toLocaleString()} · 30% Fee: -KES {fee.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdrawal Request Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
              <Wallet className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-white mb-1">Request M-Pesa Withdrawal</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Admin will receive an instant notification with your M-Pesa number and requested amount to disburse your funds.
            </p>

            <form onSubmit={handleConfirmWithdraw} className="space-y-5">
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Available Wallet Balance</span>
                <span className="text-lg font-black text-emerald-400">
                  KES {availableBalance.toLocaleString()}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Amount to Withdraw (KES)
                  </label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(availableBalance))}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Withdraw Max
                  </button>
                </div>
                <input
                  type="number"
                  min={1}
                  max={availableBalance}
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-black text-lg focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0712 345 678 or +254712345678"
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Once submitted, this amount moves to <strong>Pending Admin Approval</strong> and will be sent directly to your M-Pesa.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawStatus === 'pending'}
                  className="flex-1 py-3 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {withdrawStatus === 'pending' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Submit Request</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payout Phone Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsPhoneModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-white mb-1">Default M-Pesa Payout Number</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Set the M-Pesa phone number where Admin will send your approved withdrawals.
            </p>

            <form onSubmit={handleSavePhoneOnly} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Safaricom M-Pesa Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +254712345678 or 0712345678"
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPhone}
                  className="flex-1 py-3 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-500 cursor-pointer disabled:opacity-50"
                >
                  {savingPhone ? 'Saving...' : 'Save Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CreatorLayout>
  );
};

export default EarningsWallet;
