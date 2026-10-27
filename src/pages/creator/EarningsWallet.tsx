import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorLayout from '../../components/CreatorLayout';
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2,
  CheckCircle,
  Wallet,
  MessageCircle,
  X,
  Smartphone,
  ShieldCheck,
  XCircle,
  Receipt,
  Download,
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
import { hasPrivateKycEvidence } from '../../lib/verification';
import {
  getCreatorPayoutAmountError,
  MINIMUM_CREATOR_PAYOUT_KES,
} from '../../lib/creatorPayoutRules';

const EarningsWallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [txFilter, setTxFilter] = useState<'all' | 'earnings' | 'payouts'>('all');

  // Payout Phone & Modal State
  const [payoutPhone, setPayoutPhone] = useState('');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [payoutKycRequired, setPayoutKycRequired] = useState(false);
  const [payoutKycEvidenceProvided, setPayoutKycEvidenceProvided] = useState(false);
  const [payoutProfileStatus, setPayoutProfileStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isKycPromptOpen, setIsKycPromptOpen] = useState(false);

  const refreshPayoutKycStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const profile = await getUserProfile(user.id);
      if (!profile) {
        setPayoutProfileStatus('error');
        return;
      }
      const required = Boolean(profile.payout_kyc_required);
      setPayoutKycRequired(required);
      setPayoutKycEvidenceProvided(
        required && hasPrivateKycEvidence(user.id, profile.kyc_id_url, profile.kyc_selfie_url)
      );
      setPayoutProfileStatus('ready');
    } catch (err) {
      console.error('Could not check withdrawal identity requirements:', err);
      setPayoutProfileStatus('error');
    }
  }, [user?.id]);

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
    }).catch((err) => {
      console.error('Could not load payout phone number:', err);
    });
    refreshPayoutKycStatus();

    const handleRefresh = () => {
      fetchTransactions();
    };
    const handleKycRefresh = () => refreshPayoutKycStatus();

    window.addEventListener('wallet_updated', handleRefresh);
    window.addEventListener('payouts_updated', handleRefresh);
    window.addEventListener('kyc_documents_updated', handleKycRefresh);

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
      window.removeEventListener('kyc_documents_updated', handleKycRefresh);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.user_metadata?.phone, fetchTransactions, refreshPayoutKycStatus]);

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
    if (payoutProfileStatus !== 'ready') {
      toast.error('Could not verify your withdrawal requirements. Please try again.');
      void refreshPayoutKycStatus();
      return;
    }
    if (availableBalance < MINIMUM_CREATOR_PAYOUT_KES) {
      toast.error('The minimum withdrawal amount is KES 1,000.');
      return;
    }
    if (payoutKycRequired && !payoutKycEvidenceProvided) {
      setIsKycPromptOpen(true);
      return;
    }
    setWithdrawAmount(String(availableBalance));
    setIsWithdrawModalOpen(true);
  };

  const handleConfirmWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (payoutKycRequired && !payoutKycEvidenceProvided) {
      setIsWithdrawModalOpen(false);
      setIsKycPromptOpen(true);
      return;
    }

    const numericAmount = Number(withdrawAmount);
    const payoutAmountError = getCreatorPayoutAmountError(numericAmount, availableBalance);
    if (payoutAmountError) {
      toast.error(payoutAmountError);
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

  const filteredTransactions = transactions.filter((t) => {
    if (txFilter === 'all') return true;
    const isPayout = t.type === 'payout' || t.type === 'withdrawal';
    if (txFilter === 'earnings') return !isPayout;
    if (txFilter === 'payouts') return isPayout;
    return true;
  });

  return (
    <CreatorLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wide uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Financial Suite & Live Settlement
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Wallet & Payouts
          </h1>
          <p className="text-zinc-400 font-normal text-sm mt-1 max-w-2xl leading-relaxed">
            Real-time automated 70/30 ledger. Track net earnings from subscriptions, tips and PPVs, and request direct Safaricom M-Pesa payouts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Export accounting statement"
          >
            <Download className="w-4 h-4 text-zinc-400" />
            <span>Export Statement (CSV)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Main Balance Card */}
        <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#0d0e12] border border-zinc-800 shadow-xl relative flex flex-col justify-between gap-6 sm:gap-8">
          <div className="relative z-10 flex flex-col gap-6">
            {/* Card Header Status */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300">
                  Live Ledger · 70% Creator Net Share
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Safaricom M-Pesa Settlement</span>
              </div>
            </div>

            {/* Prominent Balance Display */}
            <div>
              <div className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Available to Withdraw <span className="text-zinc-500 normal-case font-normal">(Net after 30% platform fee)</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-zinc-500 font-bold text-2xl sm:text-3xl">KES</span>
                <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white tabular-nums">
                  {availableBalance.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                </h2>
              </div>
            </div>

            {/* 4-Metric Accounting Matrix */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Gross Activity */}
              <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-2xl p-3.5 sm:p-4 transition-colors">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Gross Activity</div>
                <div className="text-base sm:text-lg font-extrabold text-white mt-1 tabular-nums">
                  KES {totalGrossEarned.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Total fan volume</div>
              </div>

              {/* 30% Platform Fee */}
              <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-2xl p-3.5 sm:p-4 transition-colors">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Platform Fee</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">30%</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-zinc-300 mt-1 tabular-nums">
                  - KES {totalPlatformFees.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Infra & hosting fee</div>
              </div>

              {/* Net 70% */}
              <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-emerald-500/15 rounded-2xl p-3.5 sm:p-4 transition-colors">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Net Earned</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">70%</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1 tabular-nums">
                  KES {totalNetEarned.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Your earnings to date</div>
              </div>

              {/* Total Paid Out */}
              <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-2xl p-3.5 sm:p-4 transition-colors">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Paid Out</div>
                <div className="text-base sm:text-lg font-extrabold text-white mt-1 tabular-nums">
                  KES {totalWithdrawn.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Completed M-Pesa</div>
              </div>
            </div>

            {/* Primary Actions - Fully Responsive Stacking */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={openWithdrawModal}
                disabled={withdrawStatus === 'pending' || availableBalance < MINIMUM_CREATOR_PAYOUT_KES}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed border border-red-500 shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                {withdrawStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {withdrawStatus === 'success' && <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />}
                {withdrawStatus === 'idle' && <ArrowUpRight className="w-4 h-4 shrink-0" />}
                <span>{withdrawStatus === 'success' ? 'Request Sent!' : 'Withdraw to M-Pesa'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold text-sm text-zinc-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{payoutPhone ? `M-Pesa: ${payoutPhone}` : 'Set M-Pesa Number'}</span>
              </button>
            </div>

            {availableBalance < MINIMUM_CREATOR_PAYOUT_KES && (
              <p className="text-center sm:text-left text-xs text-zinc-500 -mt-2">
                Withdrawals are available once your balance reaches KES {MINIMUM_CREATOR_PAYOUT_KES.toLocaleString()}.
              </p>
            )}

            {/* Live Support Concierge Banner */}
            <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                    alt="Amina"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-rose-500/30"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0E0F15]" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Questions about withdrawal schedule?</div>
                  <div className="text-[11px] text-zinc-400">Admin reviews and disburses to M-Pesa daily.</div>
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
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3.5 py-2 rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Ask Live Support</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Status & Destination Cards */}
        <div className="flex flex-col gap-6">
          {/* Pending Admin Approval Card */}
          <div className={`rounded-3xl p-6 border transition-all ${
            pendingBalance > 0
              ? 'bg-amber-950/20 border-amber-500/30 shadow-[0_8px_30px_rgba(245,158,11,0.1)]'
              : 'bg-[#0E0F15] border-white/[0.08]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Clock className={`w-4 h-4 ${pendingBalance > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
                <span>Pending Clearance</span>
              </div>
              {pendingBalance > 0 && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  In Review
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-zinc-500 font-semibold text-sm">KES</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 tabular-nums">
                {pendingBalance.toLocaleString()}
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
              {pendingBalance > 0
                ? 'Withdrawal requested. Admin has been notified to send your funds via Safaricom M-Pesa B2C.'
                : 'No pending requests. Payouts move here immediately after submission.'}
            </p>
          </div>

          {/* Default Payout Destination Card */}
          <div className="rounded-3xl p-6 bg-[#0E0F15] border border-white/[0.08] flex-1 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Payout Destination</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(true)}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline underline-offset-4 cursor-pointer"
                >
                  {payoutPhone ? 'Change' : 'Set Number'}
                </button>
              </div>

              <div className="flex items-center gap-3.5 mt-4 bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0">
                  M
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Safaricom M-Pesa</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                    {payoutPhone || 'No phone set yet'}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed border-t border-white/[0.06] pt-3">
              Disbursements are sent in Kenyan Shillings (KES) directly to this registered line.
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Activity & Ledger Section */}
      <div className="bg-[#0E0F15] border border-white/[0.08] rounded-3xl shadow-xl overflow-hidden">
        {/* Ledger Header & Filter Controls */}
        <div className="p-5 sm:p-6 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white leading-none">
                Wallet Activity & Ledger
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Detailed record of all subscriptions, tips, PPVs and M-Pesa payouts.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl self-start sm:self-auto">
            {(
              [
                ['all', 'All Activity'],
                ['earnings', 'Earnings (70%)'],
                ['payouts', 'Withdrawals'],
              ] as const
            ).map(([f, label]) => (
              <button
                key={f}
                type="button"
                onClick={() => setTxFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  txFilter === f
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <p className="text-sm font-medium">Loading wallet activity…</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Wallet className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="font-bold text-white text-base">No transactions found</p>
            <p className="text-xs text-zinc-400 max-w-sm mt-1">
              {txFilter === 'all'
                ? 'Earnings from tips, VIP subscriptions and PPV content unlocks will appear here automatically.'
                : txFilter === 'earnings'
                  ? 'No earnings records match this filter yet.'
                  : 'No withdrawal requests recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredTransactions.map((t) => {
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
                  className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isPayout
                          ? isRejectedPayout
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                            : isPendingPayout
                              ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                      }`}
                    >
                      {isPendingPayout ? (
                        <Clock className="w-4 h-4 text-amber-400" />
                      ) : isRejectedPayout ? (
                        <XCircle className="w-4 h-4 text-zinc-400" />
                      ) : isPayout ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                        <span>{formatLabel(t.type)}</span>
                        {isPendingPayout && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Pending Admin Approval
                          </span>
                        )}
                        {isApprovedPayout && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Disbursed
                          </span>
                        )}
                        {isRejectedPayout && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Declined · Restored
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
                          <span className="text-zinc-500 font-mono text-[11px]">· Ref: {t.reference_id}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-0 border-white/[0.04] pt-2 sm:pt-0">
                    <div
                      className={`font-black text-sm sm:text-base tracking-tight tabular-nums ${
                        isRejectedPayout
                          ? 'text-zinc-500 line-through'
                          : isPayout
                            ? 'text-rose-400'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0E0F15] border border-white/10 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
              <Wallet className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-white mb-1">Request M-Pesa Withdrawal</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Disbursed directly to your Safaricom M-Pesa line upon Admin approval. Zero processing fees.
            </p>

            <form onSubmit={handleConfirmWithdraw} className="space-y-5">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Available to Withdraw</span>
                <span className="text-lg font-extrabold text-white tabular-nums">
                  KES {availableBalance.toLocaleString()}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Amount to Withdraw (KES)
                  </label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(availableBalance))}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    Withdraw Max
                  </button>
                </div>
                <input
                  type="number"
                  min={MINIMUM_CREATOR_PAYOUT_KES}
                  max={availableBalance}
                  required
                  placeholder="1000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-white font-extrabold text-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-2 mt-2">
                  {[1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={availableBalance < preset}
                      onClick={() => setWithdrawAmount(String(preset))}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 border border-white/[0.06] text-zinc-300 transition-all cursor-pointer"
                    >
                      KES {preset.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={availableBalance < MINIMUM_CREATOR_PAYOUT_KES}
                    onClick={() => setWithdrawAmount(String(availableBalance))}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-600/10 hover:bg-red-600/20 disabled:opacity-30 border border-red-500/20 text-rose-400 transition-all cursor-pointer"
                  >
                    Max
                  </button>
                </div>

                <p className="mt-2 text-[11px] text-zinc-500">
                  Minimum withdrawal threshold: KES {MINIMUM_CREATOR_PAYOUT_KES.toLocaleString()}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0712 345 678 or +254712345678"
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 flex items-start gap-2.5 text-xs text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Once submitted, the amount moves to <strong>Pending Clearance</strong> and will be disbursed directly to your M-Pesa account.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawStatus === 'pending'}
                  className="flex-1 py-3.5 rounded-xl font-extrabold text-xs text-white bg-red-600 hover:bg-red-700 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {withdrawStatus === 'pending' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isKycPromptOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-identity-title"
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0E0F15] p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 id="withdraw-identity-title" className="mb-2 text-xl font-extrabold text-white">
              Identity documents required
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-zinc-300">
              Before you can withdraw funds, upload a clear photo of your National ID or passport and a selfie holding that ID. Your verified creator badge will remain active.
            </p>
            <ul className="mb-6 space-y-2 text-sm text-zinc-300">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-sky-400" /> National ID or passport</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-sky-400" /> Selfie holding the same ID</li>
            </ul>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsKycPromptOpen(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-white/[0.08] transition-colors"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsKycPromptOpen(false);
                  navigate('/edit-profile?tab=kyc');
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-red-700 shadow-md transition-all"
              >
                Upload documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payout Phone Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0E0F15] border border-white/10 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsPhoneModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm mb-4">
              M
            </div>

            <h3 className="text-xl font-extrabold text-white mb-1">Default M-Pesa Payout Number</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Set the Safaricom M-Pesa phone number where Admin will send your approved payouts.
            </p>

            <form onSubmit={handleSavePhoneOnly} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Safaricom M-Pesa Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +254712345678 or 0712345678"
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPhone}
                  className="flex-1 py-3.5 rounded-xl font-extrabold text-xs text-white bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-50 transition-all shadow-md"
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
