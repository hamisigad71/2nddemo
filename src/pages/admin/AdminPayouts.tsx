import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search, Wallet, Loader2, Copy, Phone } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAdminPayouts, updateAdminPayoutStatus } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { toast } from '../../context/ToastContext';

const statusStyles: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const AdminPayouts = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPayouts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getAdminPayouts();
      setPayouts(data || []);
    } catch (err) {
      console.error('Failed to load payouts:', err);
      setPayouts([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();

    const handleUpdate = () => loadPayouts(true);
    window.addEventListener('payouts_updated', handleUpdate);
    window.addEventListener('wallet_updated', handleUpdate);

    const channel = supabase
      .channel('admin_payouts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => loadPayouts(true)
      )
      .subscribe();

    return () => {
      window.removeEventListener('payouts_updated', handleUpdate);
      window.removeEventListener('wallet_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAction = async (payout: any, action: 'approved' | 'rejected') => {
    try {
      setProcessingId(payout.id);
      const rawAmount = payout.rawAmount || parseInt(String(payout.amount).replace(/\D/g, ''), 10) || 0;
      await updateAdminPayoutStatus(payout.id, payout.creatorId || '', rawAmount, payout.phone || 'M-Pesa', action);
      setPayouts(prev => prev.map(p => p.id === payout.id ? { ...p, status: action } : p));
      if (action === 'approved') {
        toast.success(`Approved ${payout.amount} payout to ${payout.creator} (${payout.phone})! Creator notified.`);
      } else {
        toast.info(`Declined payout ${payout.id}. ${payout.amount} has been restored to ${payout.creator}'s wallet.`);
      }
    } catch (err) {
      console.error('Error updating payout:', err);
      toast.error('Failed to update payout status');
    } finally {
      setProcessingId(null);
    }
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success(`Copied M-Pesa number: ${phone}`);
  };

  const filtered = payouts.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch = p.creator.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPending = payouts
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + (parseInt(p.amount.replace(/\D/g, ''), 10) || 0), 0);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-[#0d0e12] to-[#0d0e12] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Wallet className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Payout Management</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              Live balances and withdrawal requests for creators. Payouts are settled via Daraja / PayHero instant M-Pesa.
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Pending Requests', value: payouts.filter(p => p.status === 'pending').length, color: 'text-yellow-400' },
            { label: 'Total Pending Amount', value: `KES ${totalPending.toLocaleString()}`, color: 'text-red-500' },
            { label: 'Approved Payouts', value: payouts.filter(p => p.status === 'approved').length, color: 'text-emerald-400' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6">
              <div className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2">{label}</div>
              <div className={`text-3xl font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by creator or ID..."
              className="w-full bg-[#0d0e12] border border-zinc-800 pl-11 pr-4 py-3.5 rounded-2xl text-white text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="flex bg-[#0d0e12] border border-zinc-800 p-1.5 rounded-2xl">
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  filter === s ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0d0e12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-h-[250px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-3" />
                <span className="text-sm">Loading live payouts...</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0d0e12] border-b border-zinc-800">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-8">Creator</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Request ID</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Amount</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Method</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Requested</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-16 text-center text-zinc-500 font-medium">No live creator payout requests match your criteria.</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="group hover:bg-[#0d0e12]/50 transition-colors">
                      <td className="px-6 py-4 pl-8">
                        <div className="flex items-center gap-3">
                          <img src={p.img} alt={p.creator} className="w-10 h-10 rounded-full object-cover border-2 border-zinc-800 group-hover:border-red-500/30 transition-colors shrink-0" />
                          <div>
                            <div className="font-bold text-white text-sm">{p.creator}</div>
                            <div className="text-[11px] text-zinc-500">{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs font-mono">{p.id}</td>
                      <td className="px-6 py-4 font-black text-red-500 text-sm">{p.amount}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-white text-xs font-bold">{p.method}</div>
                            <div className="text-emerald-400 font-mono text-xs flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {p.phone}
                            </div>
                          </div>
                          {p.phone && p.phone !== 'Not provided' && (
                            <button
                              onClick={() => copyPhone(p.phone)}
                              title="Copy M-Pesa number"
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border ${statusStyles[p.status] || statusStyles.pending}`}>
                          {statusIcons[p.status] || statusIcons.pending} {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs font-medium">{p.requested}</td>
                      <td className="px-6 py-4 pr-8 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={processingId === p.id}
                              onClick={() => handleAction(p, 'approved')}
                              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {processingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Mark Paid
                            </button>
                            <button
                              disabled={processingId === p.id}
                              onClick={() => handleAction(p, 'rejected')}
                              className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{p.status === 'approved' ? 'Paid Out ✓' : 'Refunded to Wallet'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminPayouts;
