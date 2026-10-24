import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, DollarSign, ShieldAlert, ArrowUpRight, ArrowDownRight, BarChart3, Activity, CheckCircle, Clock, Loader2, UserCheck } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAdminOverviewStats, getAdminTransactions, getAdminCreators } from '../../lib/db';

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalRevenue: 0,
    totalCreators: 0,
    totalFans: 0,
    pendingReviews: 0,
    revenueHistory: [0, 0, 0, 0, 0, 0, 0],
  });
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        const [stats, txs, creatorList] = await Promise.all([
          getAdminOverviewStats(),
          getAdminTransactions(),
          getAdminCreators(),
        ]);

        setStatsData(stats);
        setRecentTx((txs || []).slice(0, 5));
        setCreators((creatorList || []).slice(0, 5));
      } catch (err) {
        console.error('Failed to load admin overview metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, []);

  const statCards = [
    {
      label: 'Total Platform Revenue',
      value: `KES ${statsData.totalRevenue.toLocaleString()}`,
      sub: statsData.totalRevenue > 0 ? 'Live transaction total' : 'Awaiting live sales',
      icon: DollarSign,
      color: 'primary',
      up: statsData.totalRevenue > 0,
    },
    {
      label: 'Active Creators',
      value: `${statsData.totalCreators}`,
      sub: statsData.totalCreators > 0 ? 'Verified on platform' : 'No creators registered yet',
      icon: Users,
      color: 'secondary',
      up: statsData.totalCreators > 0,
    },
    {
      label: 'Total Fans / Subscribers',
      value: `${statsData.totalFans}`,
      sub: statsData.totalFans > 0 ? 'Active fan accounts' : 'No fans registered yet',
      icon: TrendingUp,
      color: 'primary',
      up: statsData.totalFans > 0,
    },
    {
      label: 'Pending Creator KYC & Applications',
      value: `${statsData.pendingReviews}`,
      sub: statsData.pendingReviews > 0 ? 'Review & approve creators' : 'All clear',
      icon: ShieldAlert,
      color: statsData.pendingReviews > 0 ? 'destructive' : 'primary',
      up: statsData.pendingReviews === 0,
      link: '/admin/applications',
    },
  ];

  const maxHistory = Math.max(...statsData.revenueHistory, 1);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Live Platform Overview</h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time live database metrics from The Gents Dollhouse.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/applications"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/20"
            >
              <UserCheck className="w-4 h-4" />
              Review Applications
            </Link>
            {loading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-3.5 py-1.5 rounded-full self-start">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                <span>Syncing metrics...</span>
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, sub, icon: Icon, up, link }: any, i) => {
            const Content = (
              <div className="bg-muted/30 border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors group h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {up ? 'Live' : 'Action'}
                  </span>
                </div>
                <div className="text-2xl font-black text-foreground mb-1">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className={`text-[10px] font-semibold mt-1 ${up ? 'text-emerald-400' : 'text-zinc-500'}`}>{sub}</div>
              </div>
            );

            return link ? (
              <Link key={i} to={link} className="block transition-transform hover:-translate-y-0.5">
                {Content}
              </Link>
            ) : (
              <div key={i}>{Content}</div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-muted/30 border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-foreground">Revenue Trend</h3>
                <p className="text-xs text-muted-foreground">Last 7 days (live transactions)</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
                <BarChart3 className="w-3.5 h-3.5" /> 100% Real Activity
              </div>
            </div>
            {/* Bar chart visual */}
            <div className="flex items-end gap-2 h-36">
              {statsData.revenueHistory.map((val, i) => {
                const heightPercent = maxHistory > 0 ? Math.max(8, Math.round((val / maxHistory) * 100)) : 8;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[9px] text-zinc-500 font-semibold tabular-nums">
                      {val > 0 ? `${Math.round(val / 1000)}k` : '-'}
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary/60 to-primary transition-all duration-500 hover:from-primary hover:to-primary/80"
                      style={{ height: `${heightPercent}%` }}
                      title={`Day ${i + 1}: KES ${val.toLocaleString()}`}
                    />
                    <span className="text-[9px] text-muted-foreground">{['M','T','W','T','F','S','S'][i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-muted/30 border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Recent Transactions</h3>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {recentTx.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No live transactions recorded yet. Real subscriber orders will appear here automatically.
                </div>
              ) : (
                recentTx.map((tx, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${tx.status === 'success' || tx.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{tx.user} → {tx.creator}</div>
                      <div className="text-[10px] text-muted-foreground">{tx.method} · {tx.date}</div>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${tx.status === 'success' || tx.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>{tx.amount}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top Creators */}
        <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">Active Creators</h3>
            <span className="text-xs text-primary font-semibold">Live Database Records</span>
          </div>
          <div className="overflow-x-auto">
            {creators.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No creator accounts registered yet.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Creator</th>
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold">Subscribers</th>
                    <th className="px-6 py-3 font-semibold">Total Revenue</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {creators.map((c, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={c.img} alt={c.name} className="w-9 h-9 rounded-full object-cover border border-border" />
                          <div>
                            <span className="font-semibold text-sm text-white block">{c.name}</span>
                            <span className="text-[11px] text-zinc-500">{c.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{c.category}</td>
                      <td className="px-6 py-4 font-semibold text-zinc-200">{c.subs}</td>
                      <td className="px-6 py-4 font-bold text-primary">{c.revenue}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full w-fit">
                          <CheckCircle className="w-3 h-3" /> {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Pending Creator & Escort Approvals', count: statsData.pendingReviews, icon: Clock, color: 'text-yellow-400 bg-yellow-400/10', link: '/admin/creators' },
            { label: 'Active Platform Creators', count: statsData.totalCreators, icon: Users, color: 'text-primary bg-primary/10', link: '/admin/creators' },
            { label: 'Registered Fans / Subscribers', count: statsData.totalFans, icon: TrendingUp, color: 'text-emerald-400 bg-emerald-400/10', link: '/admin/users' },
          ].map(({ label, count, icon: Icon, color, link }, i) => (
            <a key={i} href={link} className="flex items-center gap-4 bg-muted/30 border border-border rounded-2xl p-4 hover:border-primary/30 transition-colors group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-xl font-black">{count}</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminOverview;
