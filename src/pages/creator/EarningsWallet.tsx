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
  Smartphone,
  ShieldCheck,
  XCircle,
  Receipt,
  Download,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
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
  getCreatorPayoutPhoneError,
  MINIMUM_CREATOR_PAYOUT_KES,
  normalizeKenyanMpesaPhone,
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
  const [confirmPayoutPhone, setConfirmPayoutPhone] = useState('');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawReceipt, setWithdrawReceipt] = useState<{
    amount: number;
    phone: string;
    submittedAt: string;
  } | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);
  const [payoutKycRequired, setPayoutKycRequired] = useState(false);
  const [payoutKycEvidenceProvided, setPayoutKycEvidenceProvided] = useState(false);
  const [payoutKycStatus, setPayoutKycStatus] = useState<string>('unverified');
  const [payoutKycDocsUploaded, setPayoutKycDocsUploaded] = useState(false);
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
      const required = true;
      const isApproved = profile.kyc_status === 'verified' || profile.is_verified === true;
      const hasUploadedDocs = hasPrivateKycEvidence(user.id, profile.kyc_id_url, profile.kyc_selfie_url);

      setPayoutKycRequired(required);
      setPayoutKycStatus(profile.kyc_status || 'unverified');
      setPayoutKycDocsUploaded(hasUploadedDocs);
      setPayoutKycEvidenceProvided(isApproved);
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

    getUserProfile(user.id)
      .then((profile) => {
        if (profile?.phone) {
          setPayoutPhone(profile.phone);
        } else if (user.user_metadata?.phone) {
          setPayoutPhone(user.user_metadata.phone);
        }
      })
      .catch((err) => {
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
    const fee =
      t.platform_fee !== undefined && t.platform_fee !== null
        ? Number(t.platform_fee)
        : Math.round(gross * PLATFORM_FEE);
    return sum + fee;
  }, 0);

  const totalNetEarned = incomingTransactions.reduce((sum, t) => {
    const gross = Number(t.gross_amount || 0);
    const net =
      t.net_amount !== undefined && t.net_amount !== null
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
  const thresholdProgress = Math.min(100, (availableBalance / MINIMUM_CREATOR_PAYOUT_KES) * 100);
  const remainingToMinimum = Math.max(0, MINIMUM_CREATOR_PAYOUT_KES - availableBalance);

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
    setConfirmPayoutPhone('');
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
    const phoneError = getCreatorPayoutPhoneError(payoutPhone, confirmPayoutPhone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    const normalizedPhone = normalizeKenyanMpesaPhone(payoutPhone)!;

    setWithdrawStatus('pending');
    try {
      try {
        await updateUserProfile(user.id, { phone: normalizedPhone });
        setPayoutPhone(normalizedPhone);
      } catch {}

      await requestCreatorPayout(user.id, numericAmount, normalizedPhone, 'M-Pesa');

      setWithdrawStatus('success');
      setIsWithdrawModalOpen(false);
      setConfirmPayoutPhone('');
      setWithdrawReceipt({
        amount: numericAmount,
        phone: normalizedPhone,
        submittedAt: new Date().toLocaleString('en-KE', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
      toast.success('Withdrawal request submitted', {
        description: `Processing KES ${numericAmount.toLocaleString()} to ${normalizedPhone}. Expect your funds within 48 hours.`,
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
    const phoneError = getCreatorPayoutPhoneError(payoutPhone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    const normalizedPhone = normalizeKenyanMpesaPhone(payoutPhone)!;
    setSavingPhone(true);
    try {
      await updateUserProfile(user.id, { phone: normalizedPhone });
      setPayoutPhone(normalizedPhone);
      toast.success(`Payout M-Pesa number updated to ${normalizedPhone}!`);
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

  const normalizedPreviewPhone = normalizeKenyanMpesaPhone(payoutPhone);
  const normalizedConfirmPhone = normalizeKenyanMpesaPhone(confirmPayoutPhone);
  const phonesMatch =
    Boolean(normalizedPreviewPhone) && normalizedPreviewPhone === normalizedConfirmPhone;
  const isPendingKyc = payoutKycStatus === 'pending' || payoutKycDocsUploaded;

  return (
    <CreatorLayout>
      <div className="mx-auto max-w-6xl space-y-6 pb-8">
        {/* Page Header — clean, restrained typography */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Wallet & Payouts
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Track your 70% creator net earnings from subscriptions, tips, and PPVs, and request Safaricom M-Pesa payouts.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadCSV}
            title="Export accounting statement"
            className="self-start sm:self-auto shrink-0 gap-2 bg-card"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Top Grid: Primary Balance Surface + Status Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Primary Balance Card */}
          <Card className="lg:col-span-8 flex flex-col justify-between overflow-hidden border-border/90 shadow-sm">
            <div>
              <CardHeader className="px-5 sm:px-7 pt-6 pb-5 space-y-5">
                {/* Subtle status strip */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>70% Creator Share</span>
                    <span aria-hidden="true" className="text-border">·</span>
                    <span>Safaricom M-Pesa</span>
                  </div>

                  {payoutProfileStatus === 'ready' && (
                    payoutKycEvidenceProvided ? (
                      <Badge
                        variant="success"
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-medium gap-1.5"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        KYC Verified
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-medium gap-1.5 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {isPendingKyc ? 'KYC In Review' : 'ID Verification Needed'}
                      </Badge>
                    )
                  )}
                </div>

                {/* Optical Hero Balance */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Available to withdraw
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-semibold text-muted-foreground tracking-tight">
                      KES
                    </span>
                    <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground tabular-nums">
                      {availableBalance.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Progress toward KES 1,000 threshold (only when below minimum) */}
                {availableBalance < MINIMUM_CREATOR_PAYOUT_KES && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Minimum payout threshold
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        KES {availableBalance.toLocaleString()} / {MINIMUM_CREATOR_PAYOUT_KES.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={thresholdProgress}
                      className="h-1.5"
                      indicatorClassName="bg-emerald-500"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Earn KES {remainingToMinimum.toLocaleString()} more to unlock direct M-Pesa withdrawals.
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-5 sm:px-7 pt-0 pb-6 space-y-5">
                {/* Uniform 4-Metric Strip — single-line headers, aligned baselines */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border/80 bg-muted/35 p-3.5 transition-[background-color,border-color] duration-150 ease-out hover:bg-muted/55">
                    <div className="text-[11px] font-medium text-muted-foreground truncate">
                      Gross Volume
                    </div>
                    <div className="mt-1.5 text-base sm:text-lg font-semibold text-foreground tabular-nums">
                      KES {totalGrossEarned.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                      Total fan spend
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/35 p-3.5 transition-[background-color,border-color] duration-150 ease-out hover:bg-muted/55">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground truncate">
                        Platform Fee
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">30%</span>
                    </div>
                    <div className="mt-1.5 text-base sm:text-lg font-semibold text-foreground tabular-nums">
                      −KES {totalPlatformFees.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                      Hosting & ops
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] p-3.5 transition-[background-color,border-color] duration-150 ease-out hover:bg-emerald-500/[0.08]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
                        Net Earned
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">70%</span>
                    </div>
                    <div className="mt-1.5 text-base sm:text-lg font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      KES {totalNetEarned.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                      Lifetime share
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/35 p-3.5 transition-[background-color,border-color] duration-150 ease-out hover:bg-muted/55">
                    <div className="text-[11px] font-medium text-muted-foreground truncate">
                      Paid Out
                    </div>
                    <div className="mt-1.5 text-base sm:text-lg font-semibold text-foreground tabular-nums">
                      KES {totalWithdrawn.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                      Settled M-Pesa
                    </div>
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Button
                    onClick={openWithdrawModal}
                    disabled={
                      withdrawStatus === 'pending' ||
                      payoutProfileStatus === 'loading' ||
                      availableBalance < MINIMUM_CREATOR_PAYOUT_KES
                    }
                    className="flex-1 min-h-11"
                  >
                    {(withdrawStatus === 'pending' || payoutProfileStatus === 'loading') && (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    )}
                    {withdrawStatus === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
                    {withdrawStatus === 'idle' && payoutProfileStatus !== 'loading' && (
                      <ArrowUpRight className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {withdrawStatus === 'success'
                        ? 'Request Sent'
                        : payoutProfileStatus === 'loading'
                          ? 'Checking Verification...'
                          : 'Withdraw to M-Pesa'}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPhoneModalOpen(true)}
                    className="min-h-11 bg-card sm:min-w-[200px]"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate font-mono text-xs sm:text-sm font-semibold">
                      {payoutPhone || 'Set M-Pesa Number'}
                    </span>
                  </Button>
                </div>

                {/* Accessible High-Contrast KYC Alert (Light + Dark mode) */}
                {payoutProfileStatus === 'ready' && payoutKycRequired && !payoutKycEvidenceProvided && (
                  <Alert
                    variant="warning"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <AlertDescription className="text-amber-950 dark:text-amber-100 opacity-100">
                        {isPendingKyc
                          ? 'Identity verification pending review — withdrawals to M-Pesa will unlock once an admin approves your National ID and selfie.'
                          : 'Identity verification required to cash out — upload your National ID and verification selfie to unlock M-Pesa withdrawals.'}
                      </AlertDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/edit-profile?tab=kyc')}
                      className="shrink-0 border-amber-400/70 bg-amber-100/80 text-amber-950 hover:bg-amber-200/80 dark:border-amber-400/30 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30"
                    >
                      {isPendingKyc ? 'View Status' : 'Verify ID'}
                    </Button>
                  </Alert>
                )}
              </CardContent>
            </div>

            {/* Understated Support Footer */}
            <CardFooter className="px-5 sm:px-7 py-3.5 border-t border-border/80 bg-muted/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                    alt="Payout Support"
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-border"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Payouts processed within 48 hours</div>
                  <div className="text-muted-foreground">Need help with a settlement or M-Pesa line?</div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open_creator_support', {
                      detail: { prompt: 'How many hours does it take to receive my payout?' },
                    })
                  );
                }}
                className="self-start sm:self-auto text-xs font-semibold text-foreground hover:bg-muted"
              >
                <MessageCircle className="w-3.5 h-3.5 text-primary" />
                <span>Ask Live Support</span>
              </Button>
            </CardFooter>
          </Card>

          {/* Right Sidebar: Pending Clearance + Payout Destination */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <Card
              className={`border-border/90 shadow-sm ${
                pendingBalance > 0
                  ? 'border-amber-300/90 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/[0.08]'
                  : ''
              }`}
            >
              <CardHeader className="p-5 pb-3 space-y-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Clock
                      className={`w-3.5 h-3.5 ${
                        pendingBalance > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <span>Pending Clearance</span>
                  </div>
                  {pendingBalance > 0 && (
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px] font-semibold border-amber-400/60 bg-amber-100/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
                    >
                      In Review
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0 space-y-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">KES</span>
                  <span
                    className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
                      pendingBalance > 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-foreground'
                    }`}
                  >
                    {pendingBalance.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pendingBalance > 0
                    ? 'Your payout request is queued for finance verification and M-Pesa disbursement within 48 hours.'
                    : 'No pending withdrawals. Requested payouts move here until disbursed.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/90 shadow-sm flex-1 flex flex-col justify-between">
              <CardHeader className="p-5 pb-3 space-y-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Payout Destination</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPhoneModalOpen(true)}
                    className="text-xs font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
                  >
                    {payoutPhone ? 'Change' : 'Set Number'}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0 space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    M
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span>Safaricom M-Pesa</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {payoutPhone || 'No number configured'}
                    </div>
                  </div>
                </div>
                <Separator />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Disbursements are sent in Kenyan Shillings (KES) directly to the M-Pesa number you confirm at withdrawal.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Wallet Activity & Ledger — full Light & Dark mode parity */}
        <Card className="overflow-hidden border-border/90 shadow-sm">
          <CardHeader className="px-5 sm:px-6 py-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/60 text-foreground">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Wallet Activity & Ledger</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Subscriptions, tips, PPV unlocks, and M-Pesa withdrawal requests.
                </CardDescription>
              </div>
            </div>

            <Tabs
              value={txFilter}
              onValueChange={(val) => setTxFilter(val as 'all' | 'earnings' | 'payouts')}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="all">All Activity</TabsTrigger>
                <TabsTrigger value="earnings">Earnings (70%)</TabsTrigger>
                <TabsTrigger value="payouts">Withdrawals</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading wallet activity…</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/50 mb-3">
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                  {txFilter === 'all'
                    ? 'Earnings from tips, VIP subscriptions, and PPV unlocks will appear here automatically.'
                    : txFilter === 'earnings'
                      ? 'No earnings records match this filter yet.'
                      : 'No withdrawal requests recorded yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
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
                  const isPendingPayout =
                    isPayout && (rawStatus === 'pending' || rawStatus === 'pending_withdrawal');
                  const isRejectedPayout =
                    isPayout && (rawStatus === 'rejected' || rawStatus === 'failed');
                  const isApprovedPayout =
                    isPayout && (rawStatus === 'completed' || rawStatus === 'approved');

                  return (
                    <div
                      key={t.id}
                      className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-150 ease-out hover:bg-muted/35"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            isPayout
                              ? isRejectedPayout
                                ? 'border-border bg-muted text-muted-foreground'
                                : isPendingPayout
                                  ? 'border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400'
                                  : 'border-rose-300/70 bg-rose-50 text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400'
                              : 'border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400'
                          }`}
                        >
                          {isPendingPayout ? (
                            <Clock className="w-4 h-4" />
                          ) : isRejectedPayout ? (
                            <XCircle className="w-4 h-4" />
                          ) : isPayout ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {formatLabel(t.type)}
                            </span>
                            {isPendingPayout && (
                              <Badge
                                variant="outline"
                                className="rounded-full text-[10px] font-semibold border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
                              >
                                Processing · 48h
                              </Badge>
                            )}
                            {isApprovedPayout && (
                              <Badge
                                variant="success"
                                className="rounded-full text-[10px] font-semibold"
                              >
                                Disbursed
                              </Badge>
                            )}
                            {isRejectedPayout && (
                              <Badge
                                variant="muted"
                                className="rounded-full text-[10px] font-semibold"
                              >
                                Declined · Restored
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
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
                              <span className="font-mono text-[11px] text-muted-foreground/80">
                                · {t.reference_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-0 border-border/60 pt-2.5 sm:pt-0 shrink-0">
                        <div
                          className={`text-sm sm:text-base font-bold tracking-tight tabular-nums ${
                            isRejectedPayout
                              ? 'text-muted-foreground line-through'
                              : isPayout
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isPayout ? '−' : '+'} KES {net.toLocaleString()}
                        </div>
                        {!isPayout && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                            Gross KES {gross.toLocaleString()} · Fee −KES {fee.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 1. Withdrawal Request Dialog */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <DialogTitle>Request M-Pesa Withdrawal</DialogTitle>
            <DialogDescription>
              Disbursed directly to your Safaricom M-Pesa line within 48 hours. Zero processing fees.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmWithdraw} className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">Available balance</span>
              <span className="text-base font-bold text-foreground tabular-nums">
                KES {availableBalance.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Amount to withdraw (KES)
                </label>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(availableBalance))}
                  className="text-xs font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
                >
                  Withdraw Max
                </button>
              </div>
              <Input
                type="number"
                min={MINIMUM_CREATOR_PAYOUT_KES}
                max={availableBalance}
                required
                placeholder="1000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="text-base font-bold tabular-nums"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {[1000, 2500, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={availableBalance < preset}
                    onClick={() => setWithdrawAmount(String(preset))}
                    className="rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted disabled:opacity-35 transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] cursor-pointer"
                  >
                    KES {preset.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={availableBalance < MINIMUM_CREATOR_PAYOUT_KES}
                  onClick={() => setWithdrawAmount(String(availableBalance))}
                  className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-35 transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] cursor-pointer"
                >
                  Max
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Minimum withdrawal: KES {MINIMUM_CREATOR_PAYOUT_KES.toLocaleString()}.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                M-Pesa Phone Number *
              </label>
              <Input
                type="tel"
                required
                placeholder="e.g. 0712 345 678 or +254712345678"
                value={payoutPhone}
                onChange={(e) => setPayoutPhone(e.target.value)}
                className="font-mono"
              />
              {normalizedPreviewPhone ? (
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  Formatted M-Pesa number:{' '}
                  <span className="font-mono font-bold">{normalizedPreviewPhone}</span>
                </p>
              ) : payoutPhone.trim().length > 0 ? (
                <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  Enter a valid 10-digit Kenyan mobile number (07XX or 01XX) or +254 format.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Confirm M-Pesa Phone Number *
              </label>
              <Input
                type="tel"
                required
                placeholder="Re-enter your M-Pesa number to confirm"
                value={confirmPayoutPhone}
                onChange={(e) => setConfirmPayoutPhone(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                className="font-mono"
              />
              {confirmPayoutPhone.trim().length > 0 && (
                phonesMatch ? (
                  <p className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    <Check className="w-3 h-3" /> M-Pesa numbers match.
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-3 h-3" /> Numbers do not match — please verify every digit.
                  </p>
                )
              )}
            </div>

            <Alert variant="success" className="py-2.5">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <AlertDescription className="text-[11px] opacity-100">
                  Once submitted, your request is forwarded to our payout team and disbursed to your M-Pesa account within{' '}
                  <strong>48 hours</strong>.
                </AlertDescription>
              </div>
            </Alert>

            <DialogFooter className="flex-row gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={withdrawStatus === 'pending'}
                className="flex-1"
              >
                {withdrawStatus === 'pending' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Submit Request</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Withdrawal Processing Confirmation Dialog (48hr SLA) */}
      <Dialog
        open={Boolean(withdrawReceipt)}
        onOpenChange={(open) => {
          if (!open) setWithdrawReceipt(null);
        }}
      >
        {withdrawReceipt && (
          <DialogContent className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="h-7 w-7" />
            </div>

            <div className="mb-2 flex justify-center">
              <Badge
                variant="outline"
                className="rounded-full px-3 py-0.5 text-[11px] font-semibold gap-1.5 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Processing Payment
              </Badge>
            </div>

            <DialogTitle id="withdraw-processing-title" className="text-xl text-center">
              Withdrawal Request Received
            </DialogTitle>

            <DialogDescription className="mt-2 text-center text-xs sm:text-sm">
              Your payout request has been securely forwarded to our finance team for verification and disbursement. Please expect your funds directly in your M-Pesa account within{' '}
              <strong className="text-foreground">48 hours</strong>.
            </DialogDescription>

            <div className="my-5 rounded-xl border border-border/80 bg-muted/35 p-4 space-y-3 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Amount Requested</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  KES {withdrawReceipt.amount.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">M-Pesa Destination</span>
                <span className="font-mono font-semibold text-foreground">{withdrawReceipt.phone}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Estimated Arrival</span>
                <span className="font-semibold text-foreground">Less than 48 hours</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Submitted</span>
                <span className="text-muted-foreground">{withdrawReceipt.submittedAt}</span>
              </div>
            </div>

            <Alert variant="success" className="mb-5 text-left py-2.5">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <AlertDescription className="text-[11px] opacity-100">
                  You will receive an in-app notification and a Safaricom M-Pesa confirmation SMS as soon as your transfer is completed.
                </AlertDescription>
              </div>
            </Alert>

            <Button
              type="button"
              onClick={() => setWithdrawReceipt(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              Back to Wallet
            </Button>
          </DialogContent>
        )}
      </Dialog>

      {/* 3. KYC Gate Dialog */}
      <Dialog open={isKycPromptOpen} onOpenChange={setIsKycPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle id="withdraw-identity-title">
              {isPendingKyc ? 'Verification pending approval' : 'Identity verification required'}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {isPendingKyc
                ? 'Your National ID and verification selfie are currently under admin review. Withdrawals to M-Pesa will be unlocked as soon as your KYC verification is approved.'
                : 'You can keep posting content and earning on the platform, but before you can cash out to M-Pesa you must upload your National ID (or passport) and a verification selfie holding that ID and have them approved.'}
            </DialogDescription>
          </DialogHeader>

          <ul className="my-5 space-y-2.5 rounded-xl border border-border/80 bg-muted/35 p-4 text-xs text-foreground">
            <li className="flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>National ID or passport photo</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Verification selfie holding the same ID</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Admin KYC approval</span>
            </li>
          </ul>

          <DialogFooter className="flex-row gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsKycPromptOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsKycPromptOpen(false);
                navigate('/edit-profile?tab=kyc');
              }}
              className="flex-1"
            >
              {isPendingKyc ? 'View KYC status' : 'Upload documents'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Default M-Pesa Number Dialog */}
      <Dialog open={isPhoneModalOpen} onOpenChange={setIsPhoneModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              M
            </div>
            <DialogTitle>Default M-Pesa Payout Number</DialogTitle>
            <DialogDescription>
              Set the Safaricom M-Pesa phone number where Admin will send your approved payouts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePhoneOnly} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Safaricom M-Pesa Number
              </label>
              <Input
                type="tel"
                required
                placeholder="e.g. +254712345678 or 0712345678"
                value={payoutPhone}
                onChange={(e) => setPayoutPhone(e.target.value)}
                className="font-mono"
              />
              {normalizedPreviewPhone && (
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  Will save as <span className="font-mono font-bold">{normalizedPreviewPhone}</span>
                </p>
              )}
            </div>

            <DialogFooter className="flex-row gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPhoneModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingPhone} className="flex-1">
                {savingPhone ? 'Saving...' : 'Save Number'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CreatorLayout>
  );
};

export default EarningsWallet;
