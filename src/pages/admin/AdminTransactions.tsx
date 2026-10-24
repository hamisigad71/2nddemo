import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Download, Receipt, ArrowUpRight, Loader2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAdminTransactions } from '../../lib/db';

const statusStyles: Record<string, string> = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  failed: 'text-red-400 bg-red-500/10 border-red-500/20',
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};
const statusIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle className="w-3.5 h-3.5 shrink-0" />,
  failed: <XCircle className="w-3.5 h-3.5 shrink-0" />,
  pending: <Clock className="w-3.5 h-3.5 shrink-0" />,
};

const AdminTransactions = () => {
  const [filter, setFilter] = useState('all');
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTx = async () => {
      setIsLoading(true);
      try {
        const data = await getAdminTransactions();
        setTransactionsList(data || []);
      } catch (err) {
        console.error('Error loading admin transactions:', err);
        setTransactionsList([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadTx();
  }, []);

  const filtered = transactionsList.filter(t => filter === 'all' || t.status === filter);

  const totalVolume = transactionsList.reduce((acc, t) => acc + (t.rawGross || 0), 0);
  const totalFees = transactionsList.reduce((acc, t) => acc + (t.rawFee || 0), 0);
  const successfulTxCount = transactionsList.filter(t => t.status === 'success').length;
  const failedTxCount = transactionsList.filter(t => t.status === 'failed').length;
  const successRate = transactionsList.length > 0 ? Math.round((successfulTxCount / transactionsList.length) * 100) : 100;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto custom-scrollbar overflow-y-auto">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-[#0d0e12] to-[#0d0e12] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Receipt className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Transactions & Ledger</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium max-w-xl leading-relaxed">
              Live transaction log across M-Pesa, Card payments, and platform fee deductions.
            </p>
          </div>
          
          <div className="relative z-10 shrink-0">
            <button className="flex items-center gap-2 px-6 py-3.5 bg-[#0d0e12] border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-lg active:scale-95 group cursor-pointer">
              <Download className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Volume', value: `KES ${totalVolume.toLocaleString()}`, sub: `${successfulTxCount} completed payments`, icon: <ArrowUpRight className="w-4 h-4 text-emerald-500" />, highlight: 'text-white' },
            { label: 'Platform Fees (30%)', value: `KES ${totalFees.toLocaleString()}`, sub: 'Retained platform commission', icon: <ArrowUpRight className="w-4 h-4 text-emerald-500" />, highlight: 'text-red-500' },
            { label: 'Transactions Count', value: `${transactionsList.length}`, sub: `${successfulTxCount} completed · ${failedTxCount} failed`, icon: <Receipt className="w-4 h-4 text-blue-500" />, highlight: 'text-white' },
            { label: 'Success Rate', value: `${successRate}%`, sub: 'Payment completion rate', icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, highlight: 'text-emerald-400' },
          ].map(({ label, value, sub, icon, highlight }, i) => (
            <div key={i} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:opacity-100 transition-opacity">
                 {icon}
               </div>
               <div className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2">{label}</div>
               <div className={`text-3xl font-black mb-1 drop-shadow-md ${highlight}`}>{value}</div>
               <div className="text-xs text-zinc-500 font-medium">{sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <div className="flex bg-[#0d0e12] border border-zinc-800 p-1.5 rounded-2xl">
            {['all', 'success', 'pending', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  filter === s 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 border border-red-500' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Extravagant Table */}
        <div className="bg-[#0d0e12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0d0e12] border-b border-zinc-800">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-8">TXN ID</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Fan</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Creator</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Method</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Amount</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Platform Fee (30%)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Creator Net</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-red-500 animate-spin mx-auto opacity-80" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500 font-medium">No transactions found matching your criteria.</td>
                  </tr>
                ) : filtered.map(t => (
                  <tr key={t.id} className="group hover:bg-[#0d0e12]/50 transition-colors">
                    <td className="px-6 py-5 pl-8">
                      <span className="font-mono text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">{t.id}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-bold text-white text-sm">{t.user}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-medium text-zinc-300">{t.creator}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-bold ${
                        t.method === 'M-Pesa' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-[#0d0e12] border-zinc-700 text-zinc-300'
                      }`}>
                        {t.method}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-black text-white text-sm">{t.amount}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-zinc-500 font-medium text-sm">{t.fee}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-black text-red-500 text-sm drop-shadow-md">{t.net}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border ${statusStyles[t.status]}`}>
                        {statusIcons[t.status]} {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 pr-8">
                       <span className="text-xs font-medium text-zinc-500 whitespace-nowrap group-hover:text-zinc-400 transition-colors">{t.date}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminTransactions;
