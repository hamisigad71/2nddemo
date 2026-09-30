import { useState, useEffect, useCallback } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock, Building, Loader2, CheckCircle } from 'lucide-react';
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
        <div className="md:col-span-2 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl p-8 text-primary-foreground shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 blur-xl">
            <DollarSign className="w-64 h-64 mix-blend-overlay" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div>
              <div className="text-emerald-100 font-medium mb-1">Available Balance</div>
              <h2 className="text-5xl font-black tracking-tight">
                KES {availableBalance.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
              </h2>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleWithdraw}
                disabled={withdrawStatus === 'pending' || availableBalance <= 0 || withdrawStatus === 'success'}
                className="bg-white text-primary px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {withdrawStatus === 'pending' && <Loader2 className="w-5 h-5 animate-spin" />}
                {withdrawStatus === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                {withdrawStatus === 'success' ? 'Withdrawal Requested' : 'Withdraw to M-Pesa'}
              </button>
              <button className="bg-black/20 text-white border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-black/30 transition-colors">
                Manage Bank
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

      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            Recent Transactions
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Net (After 15% Fee)</span>
          </h3>
          <button className="text-primary text-sm font-bold hover:underline">Download CSV</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-bold mb-1">No transactions yet</p>
            <p className="text-sm">Earnings from tips, subscriptions and PPV will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((t) => {
              const isPayout = t.type === 'payout' || t.type === 'withdrawal';
              return (
                <div key={t.id} className="p-5 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPayout ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                       {t.status === 'pending_withdrawal' ? <Loader2 className="w-5 h-5 animate-spin" /> 
                       : (isPayout ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />)}
                    </div>
                    <div>
                      <div className="font-bold text-sm">
                        {formatLabel(t.type)} {t.status === 'pending_withdrawal' && <span className="text-amber-500 text-xs ml-1">(Processing)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${isPayout ? 'text-foreground' : 'text-primary'}`}>
                      {isPayout ? '-' : '+'} KES {(t.net_amount || 0).toLocaleString()}
                    </div>
                    {!isPayout && (
                      <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Gross: {t.gross_amount} • Fee: {t.platform_fee?.toFixed(0)}
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
