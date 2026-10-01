import { useState, useEffect, useCallback } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import { ArrowUpRight, ArrowDownRight, Clock, Building, Loader2, CheckCircle, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCreatorTransactions } from '../../lib/db';
import { supabase } from '../../lib/supabase';

const EarningsWallet = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getCreatorTransactions(user.uid);
    setTransactions(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Dynamically calculate totals from real data
  const availableBalance = transactions
    .filter(t => t.status === 'completed' && t.type !== 'payout')
    .reduce((sum, t) => sum + (t.net_amount || 0), 0);

  const pendingBalance = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + (t.net_amount || 0), 0);

  const formatLabel = (type: string) => {
    if (type === 'tip') return 'Tip received';
    if (type === 'subscription') return 'Subscription payment';
    if (type === 'ppv') return 'PPV unlock';
    if (type === 'withdrawal' || type === 'payout') return 'Withdrawal to M-Pesa';
    return type;
  };

  const handleWithdraw = async () => {
    if (!user || availableBalance <= 0) return;
    setWithdrawStatus('pending');

    try {
      const { data, error } = await supabase.functions.invoke('daraja-b2c-withdrawal', {
        body: {
          amount: availableBalance, // For MVP, withdraw entire balance
          creatorId: user.uid,
          phoneNumber: '0712345678' // In production, grab phone from user profile
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setWithdrawStatus('success');
      fetchTransactions(); // Refresh UI to show the pending withdrawal
      setTimeout(() => setWithdrawStatus('idle'), 5000);
    } catch (err: any) {
      console.error(err);
      setWithdrawStatus('failed');
      alert(`Withdrawal failed: ${err.message || 'Unknown error'}`);
      setTimeout(() => setWithdrawStatus('idle'), 3000);
    }
  };

  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Wallet & Payouts</h1>
          <p className="text-muted-foreground">Manage your earnings and withdraw directly to M-Pesa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Main Balance Card */}
        <div className="md:col-span-2 rounded-[28px] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden bg-zinc-950 ring-1 ring-white/10">

          {/* Glowing orb accents — theme colors */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Primary: crimson red — top right */}
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-25"
              style={{ background: 'radial-gradient(circle, hsl(350 80% 50%) 0%, transparent 70%)' }} />
            {/* Secondary: terracotta — bottom left */}
            <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, hsl(15 65% 65%) 0%, transparent 70%)' }} />
            {/* Subtle top sheen */}
            <div className="absolute top-0 left-0 w-full h-full"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 55%)' }} />
          </div>

          {/* Subtle dot-grid texture */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="relative z-10 flex flex-col h-full justify-between gap-8">

            {/* Header row */}
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-white/8 border border-white/12 rounded-full px-3 py-1 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-white/60">Live Balance</span>
                </div>
                <div className="text-zinc-500 text-xs font-medium tracking-widest uppercase mb-1">Available to Withdraw</div>
                <h2 className="text-5xl sm:text-6xl font-bold tracking-tight leading-none">
                  <span className="text-white/40 text-2xl sm:text-3xl font-semibold align-top mt-2 mr-1 inline-block">KES</span>
                  {availableBalance.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                </h2>
              </div>
              {/* Wallet icon — primary theme color */}
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl shrink-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(350 80% 40% / 0.5), hsl(15 65% 55% / 0.35))',
                  boxShadow: '0 0 22px hsl(350 80% 50% / 0.3)',
                  border: '1px solid rgba(255,255,255,0.12)'
                }}>
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Stats chips */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
                <ArrowUpRight className="w-4 h-4" style={{ color: 'hsl(350 80% 60%)' }} />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Earned</div>
                  <div className="text-sm font-bold text-white">KES {availableBalance.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
                <Clock className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Pending</div>
                  <div className="text-sm font-bold text-white">KES {pendingBalance.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWithdraw}
                disabled={withdrawStatus === 'pending' || availableBalance <= 0 || withdrawStatus === 'success'}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white"
                style={{
                  background: 'linear-gradient(135deg, hsl(350 80% 50%), hsl(15 65% 55%))',
                  boxShadow: '0 4px 20px hsl(350 80% 50% / 0.35)'
                }}
              >
                {withdrawStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {withdrawStatus === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
                {withdrawStatus === 'idle' && <ArrowUpRight className="w-4 h-4 shrink-0" />}
                <span>{withdrawStatus === 'success' ? 'Requested!' : 'Withdraw to M-Pesa'}</span>
              </button>

              <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white/80 transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}>
                <Building className="w-4 h-4 shrink-0" />
                <span>Manage Bank</span>
              </button>
            </div>
          </div>
        </div>


        {/* Pending / Method */}
        <div className="flex flex-col gap-6">
          <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground font-medium mb-2">
              <Clock className="w-4 h-4" /> Pending Clearance
            </div>
            <div className="text-2xl font-bold">KES {pendingBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Available in 2-3 business days.</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-5 shadow-sm flex-1">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Building className="w-4 h-4" /> Default Payout Method
            </div>
            <div className="flex items-center gap-3 mt-4 bg-muted/40 p-3 rounded-lg border border-border">
              <div className="w-10 h-10 bg-secondary/20 rounded-md flex items-center justify-center text-secondary font-black text-xs">MP</div>
              <div>
                <div className="font-bold text-sm">M-Pesa Wallet</div>
                <div className="text-xs text-muted-foreground">Ends in *4567</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl overflow-hidden ring-1 ring-border shadow-sm" style={{ background: 'var(--bg)' }}>

        {/* Section header */}
        <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(350 80% 50% / 0.12)', border: '1px solid hsl(350 80% 50% / 0.2)' }}>
              <ArrowUpRight className="w-4 h-4" style={{ color: 'hsl(350 80% 55%)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-none mb-1">Recent Transactions</h3>
              <p className="text-xs text-muted-foreground">All amounts shown after platform fee deduction</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: 'hsl(350 80% 50% / 0.1)', color: 'hsl(350 80% 55%)', border: '1px solid hsl(350 80% 50% / 0.2)' }}>
              Net · 15% Fee
            </span>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-95 self-start sm:self-auto"
            style={{ border: '1px solid var(--border)', color: 'hsl(350 80% 55%)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsl(350 80% 50% / 0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <ArrowDownRight className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(350 80% 55%)' }} />
            <p className="text-sm">Loading transactions…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'hsl(350 80% 50% / 0.08)', border: '1px solid hsl(350 80% 50% / 0.15)' }}>
              <Wallet className="w-7 h-7" style={{ color: 'hsl(350 80% 55%)' }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground mb-1">No transactions yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">Earnings from tips, subscriptions and PPV unlocks will appear here once you start earning.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((t) => {
              const isPayout = t.type === 'payout' || t.type === 'withdrawal';
              return (
                <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors group">
                  <div className="flex items-center gap-4">
                    {/* Icon badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}
                      style={isPayout
                        ? { background: 'hsl(0 80% 50% / 0.1)', border: '1px solid hsl(0 80% 50% / 0.2)' }
                        : { background: 'hsl(350 80% 50% / 0.1)', border: '1px solid hsl(350 80% 50% / 0.2)' }}>
                      {t.status === 'pending_withdrawal'
                        ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        : isPayout
                          ? <ArrowDownRight className="w-4 h-4" style={{ color: 'hsl(0 80% 60%)' }} />
                          : <ArrowUpRight className="w-4 h-4" style={{ color: 'hsl(350 80% 60%)' }} />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {formatLabel(t.type)}
                        {t.status === 'pending_withdrawal' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Processing</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(t.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: isPayout ? 'var(--fg)' : 'hsl(350 80% 55%)' }}>
                      {isPayout ? '−' : '+'} KES {(t.net_amount || 0).toLocaleString()}
                    </div>
                    {!isPayout && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Gross: {t.gross_amount} · Fee: {t.platform_fee?.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CreatorLayout>
  );
};

export default EarningsWallet;

