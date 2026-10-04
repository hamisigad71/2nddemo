import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import AdminLayout from './AdminLayout';

const transactions = [
  { id: 'TXN001', user: 'Kevin Otieno', creator: 'Amina K.', method: 'M-Pesa', amount: 'KES 500', fee: 'KES 50', net: 'KES 450', status: 'success', date: 'Oct 4, 2026 · 03:12 AM' },
  { id: 'TXN002', user: 'Mercy Wanjiru', creator: 'Wanjiku Tech', method: 'Card', amount: 'KES 300', fee: 'KES 30', net: 'KES 270', status: 'success', date: 'Oct 4, 2026 · 02:55 AM' },
  { id: 'TXN003', user: 'John Mwangi', creator: 'ODC Music', method: 'M-Pesa', amount: 'KES 800', fee: 'KES 80', net: 'KES 720', status: 'failed', date: 'Oct 4, 2026 · 01:30 AM' },
  { id: 'TXN004', user: 'Aisha Salim', creator: 'Chef Kamau', method: 'Card', amount: 'KES 1,000', fee: 'KES 100', net: 'KES 900', status: 'success', date: 'Oct 3, 2026 · 11:45 PM' },
  { id: 'TXN005', user: 'Brian Kipkoech', creator: 'Grace Fashion', method: 'M-Pesa', amount: 'KES 500', fee: 'KES 50', net: 'KES 450', status: 'pending', date: 'Oct 3, 2026 · 10:20 PM' },
  { id: 'TXN006', user: 'John Mwangi', creator: 'Amina K.', method: 'M-Pesa', amount: 'KES 500', fee: 'KES 50', net: 'KES 450', status: 'success', date: 'Oct 3, 2026 · 09:10 PM' },
];

const statusStyles: Record<string, string> = {
  success: 'text-emerald-400 bg-emerald-400/10',
  failed: 'text-red-400 bg-red-400/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
};
const statusIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
};

const AdminTransactions = () => {
  const [filter, setFilter] = useState('all');

  const filtered = transactions.filter(t => filter === 'all' || t.status === filter);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Transactions & Payouts</h1>
            <p className="text-muted-foreground text-sm mt-1">Full transaction log across M-Pesa and Card payments.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Summary Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Volume', value: 'KES 48.2M', color: 'text-foreground' },
            { label: 'Platform Fees', value: 'KES 4.82M', color: 'text-primary' },
            { label: 'Failed Today', value: '2', color: 'text-red-400' },
            { label: 'Pending', value: '5', color: 'text-yellow-400' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="bg-muted/30 border border-border rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className={`text-xl font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'success', 'pending', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-semibold">TXN ID</th>
                  <th className="px-6 py-3 font-semibold">Fan</th>
                  <th className="px-6 py-3 font-semibold">Creator</th>
                  <th className="px-6 py-3 font-semibold">Method</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Fee (10%)</th>
                  <th className="px-6 py-3 font-semibold">Creator Net</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{t.id}</td>
                    <td className="px-6 py-4 font-semibold">{t.user}</td>
                    <td className="px-6 py-4 text-muted-foreground">{t.creator}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.method === 'M-Pesa' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                        {t.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">{t.amount}</td>
                    <td className="px-6 py-4 text-muted-foreground">{t.fee}</td>
                    <td className="px-6 py-4 font-bold text-primary">{t.net}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full w-fit capitalize ${statusStyles[t.status]}`}>
                        {statusIcons[t.status]}{t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-muted-foreground whitespace-nowrap">{t.date}</td>
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
