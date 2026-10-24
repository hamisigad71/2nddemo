import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Download, Receipt, ArrowUpRight, Loader2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAdminTransactions } from '../../lib/db';
import { getTransactionStatusStyles } from '../../lib/adminTransactionPresentation';
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
  const pendingTxCount = transactionsList.filter(t => t.status === 'pending').length;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 overflow-y-auto p-4 sm:p-6 lg:space-y-8 lg:p-8">
        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Finance / Operations</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Transactions</h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Review payments, platform fees, and creator payouts across your platform.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
              <Download className="h-4 w-4" /> Export CSV
            </button>
        </section>

        <section aria-label="Transaction summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total volume', value: `KES ${totalVolume.toLocaleString()}`, sub: `${successfulTxCount} completed payments`, icon: <ArrowUpRight className="h-4 w-4" />, iconTone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10', highlight: 'text-foreground' },
            { label: 'Platform fees', value: `KES ${totalFees.toLocaleString()}`, sub: 'Retained platform commission', icon: <Receipt className="h-4 w-4" />, iconTone: 'text-primary bg-primary/10', highlight: 'text-foreground' },
            { label: 'Transactions', value: `${transactionsList.length}`, sub: `${successfulTxCount} successful · ${failedTxCount} failed`, icon: <Receipt className="h-4 w-4" />, iconTone: 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/10', highlight: 'text-foreground' },
            { label: 'Success rate', value: `${successRate}%`, sub: `${pendingTxCount} pending transactions`, icon: <CheckCircle className="h-4 w-4" />, iconTone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10', highlight: 'text-foreground' },
          ].map(({ label, value, sub, icon, iconTone, highlight }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
               <div className="mb-4 flex items-center justify-between">
                 <span className="text-sm font-medium text-muted-foreground">{label}</span>
                 <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconTone}`}>{icon}</span>
               </div>
               <div className={`mb-1 text-2xl font-bold tracking-tight sm:text-3xl ${highlight}`}>{value}</div>
               <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          ))}
        </section>

        <section aria-label="Transaction records" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">All transactions</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Filter and review recent payment activity.</p>
            </div>
            <div role="group" aria-label="Filter transactions by status" className="flex w-full flex-wrap gap-1 rounded-xl border border-border bg-card p-1 sm:w-auto">
            {[
              { id: 'all', label: 'All', count: transactionsList.length },
              { id: 'success', label: 'Success', count: successfulTxCount },
              { id: 'pending', label: 'Pending', count: pendingTxCount },
              { id: 'failed', label: 'Failed', count: failedTxCount },
            ].map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold capitalize transition sm:flex-none ${
                  filter === id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}<span className={`rounded-md px-1.5 py-0.5 text-[10px] ${filter === id ? 'bg-white/15 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{count}</span>
              </button>
            ))}
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    {['Transaction ID', 'Fan', 'Creator', 'Method', 'Amount', 'Platform fee', 'Creator net', 'Status', 'Date'].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-4 py-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:pl-6 last:pr-6">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={9} className="py-14 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="py-14 text-center text-sm text-muted-foreground">No transactions found matching your criteria.</td></tr>
                  ) : filtered.map(t => (
                    <tr key={t.id} className="transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-4 py-4 pl-6 font-mono text-xs font-medium text-muted-foreground">{t.id}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-foreground">{t.user}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">{t.creator}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${t.method === 'M-Pesa' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-border bg-muted text-muted-foreground'}`}>{t.method}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold tabular-nums text-foreground">{t.amount}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm tabular-nums text-muted-foreground">{t.fee}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold tabular-nums text-foreground">{t.net}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getTransactionStatusStyles(t.status)}`}>
                          {statusIcons[t.status] || <Clock className="h-3.5 w-3.5 shrink-0" />} {t.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 pr-6 text-sm text-muted-foreground">{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {isLoading ? (
              <div className="rounded-2xl border border-border bg-card py-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">No transactions found matching your criteria.</div>
            ) : filtered.map(t => (
              <article key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transaction ID</p>
                    <p className="break-all font-mono text-xs font-medium text-foreground">{t.id}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${getTransactionStatusStyles(t.status)}`}>
                    {statusIcons[t.status] || <Clock className="h-3.5 w-3.5 shrink-0" />} {t.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 border-b border-border py-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fan</p>
                    <p className="truncate text-sm font-semibold text-foreground">{t.user}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Creator</p>
                    <p className="truncate text-sm font-medium text-foreground">{t.creator}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3">
                  <div>
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground">Amount</p>
                    <p className="text-xs font-semibold tabular-nums text-foreground">{t.amount}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground">Platform fee</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{t.fee}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground">Creator net</p>
                    <p className="text-xs font-semibold tabular-nums text-foreground">{t.net}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${t.method === 'M-Pesa' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-border bg-muted text-muted-foreground'}`}>{t.method}</span>
                  <span className="text-xs text-muted-foreground">{t.date}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminTransactions;
