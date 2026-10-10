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
    const data = await getCreatorTransactions(user.id);
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
          creatorId: user.id,
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
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
            Wallet & Payouts
          </h1>
          <p className="text-zinc-400 font-medium text-sm">
            Manage your earnings and withdraw directly to M-Pesa.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Main Balance Card - Solid Black (#0d0e12), Crimson Red Accents, Crisp White Text */}
        <div className="lg:col-span-2 rounded-[2rem] p-8 md:p-10 bg-[#0d0e12] border border-red-900/30 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          
          {/* Top subtle glow accent */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }} />

          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            {/* Header Row */}
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded-full px-3.5 py-1.5 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black tracking-widest uppercase text-emerald-400">Live Balance</span>
                </div>
                <div className="text-xs font-black text-red-500 tracking-widest uppercase mb-1">Available to Withdraw</div>
                <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
                  <span className="text-red-500 text-2xl md:text-3xl font-extrabold align-top mt-2 mr-1.5 inline-block">KES</span>
                  {availableBalance.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                </h2>
              </div>

              {/* Wallet Icon Badge - Red glow */}
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 bg-red-950/50 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                <Wallet className="w-6 h-6 text-red-500" />
              </div>
            </div>

            {/* Stats Chips */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Total Earned</div>
                  <div className="text-sm font-black text-emerald-400">KES {availableBalance.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Pending</div>
                  <div className="text-sm font-black text-amber-400">KES {pendingBalance.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleWithdraw}
                disabled={withdrawStatus === 'pending' || availableBalance <= 0 || withdrawStatus === 'success'}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white bg-red-600 hover:bg-red-700 border border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.35)]"
              >
                {withdrawStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {withdrawStatus === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                {withdrawStatus === 'idle' && <ArrowUpRight className="w-4 h-4 shrink-0" />}
                <span>{withdrawStatus === 'success' ? 'Requested!' : 'Withdraw to M-Pesa'}</span>
              </button>

              <button className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all active:scale-95">
                <Building className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>Manage Bank</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Status & Method Cards */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-[2rem] p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-zinc-400 font-bold text-xs uppercase tracking-wider mb-3">
              <Clock className="w-4 h-4 text-amber-400" /> Pending Clearance
            </div>
            <div className="text-3xl font-black text-white">KES {pendingBalance.toLocaleString()}</div>
            <p className="text-xs text-zinc-400 mt-1 font-medium">Available in 2-3 business days.</p>
          </div>

          <div className="bg-[#0d0e12] border border-zinc-800 rounded-[2rem] p-6 shadow-xl flex-1 flex flex-col justify-between">
            <div className="flex items-center gap-2.5 text-zinc-400 font-bold text-xs uppercase tracking-wider">
              <Building className="w-4 h-4 text-red-500" /> Default Payout Method
            </div>
            <div className="flex items-center gap-3.5 mt-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
              <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-black text-xs shrink-0">
                MP
              </div>
              <div>
                <div className="font-black text-sm text-white">M-Pesa Wallet</div>
                <div className="text-xs text-zinc-400 font-medium">Ends in *4567</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-[#0d0e12] border border-zinc-800 rounded-[2rem] shadow-xl overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-none mb-1">Recent Transactions</h3>
              <p className="text-xs text-zinc-400 font-medium">All amounts shown after platform fee deduction</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 ml-2">
              Net · 15% Fee
            </span>
          </div>

          <button className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 px-4 py-2.5 rounded-xl transition-colors active:scale-95 self-start sm:self-auto bg-zinc-900/60">
            <ArrowDownRight className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <p className="text-sm font-medium">Loading transactions…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-black text-white text-base mb-1">No transactions yet</p>
              <p className="text-sm text-zinc-400 max-w-xs font-medium">Earnings from tips, subscriptions and PPV unlocks will appear here once you start earning.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {transactions.map((t) => {
              const isPayout = t.type === 'payout' || t.type === 'withdrawal';
              return (
                <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-900/60 transition-colors group">
                  <div className="flex items-center gap-4">
                    {/* Icon Badge: Green for incoming earnings, Red for payouts */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPayout 
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {t.status === 'pending_withdrawal'
                        ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        : isPayout
                          ? <ArrowDownRight className="w-5 h-5" />
                          : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2 group-hover:text-red-400 transition-colors">
                        {formatLabel(t.type)}
                        {t.status === 'pending_withdrawal' && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Processing</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 font-medium mt-0.5">
                        {new Date(t.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-black text-sm tracking-tight ${isPayout ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isPayout ? '−' : '+'} KES {(t.net_amount || 0).toLocaleString()}
                    </div>
                    {!isPayout && (
                      <div className="text-[10px] text-zinc-500 font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
