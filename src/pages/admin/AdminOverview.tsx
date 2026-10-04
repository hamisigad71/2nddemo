import { TrendingUp, Users, DollarSign, ShieldAlert, ArrowUpRight, ArrowDownRight, BarChart3, Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';

const stats = [
  { label: 'Total Revenue', value: 'KES 48.2M', sub: '+18% this month', icon: DollarSign, color: 'primary', up: true },
  { label: 'Active Creators', value: '2,412', sub: '+34 this week', icon: Users, color: 'secondary', up: true },
  { label: 'Total Fans', value: '182,430', sub: '+2.1k this week', icon: TrendingUp, color: 'primary', up: true },
  { label: 'Pending Reviews', value: '15', sub: '3 content flags', icon: ShieldAlert, color: 'destructive', up: false },
];

const recentTx = [
  { name: 'Amina K.', type: 'M-Pesa', amount: '+KES 1,200', time: '2 min ago', status: 'success' },
  { name: 'Chef Kamau', type: 'Card', amount: '+KES 3,500', time: '8 min ago', status: 'success' },
  { name: 'Wanjiku Tech', type: 'M-Pesa', amount: '+KES 800', time: '15 min ago', status: 'success' },
  { name: 'ODC Music', type: 'Card', amount: '+KES 5,000', time: '32 min ago', status: 'failed' },
  { name: 'Grace Fashion', type: 'M-Pesa', amount: '+KES 1,500', time: '1 hr ago', status: 'success' },
];

const topCreators = [
  { name: 'Amina K.', category: 'Fitness', revenue: 'KES 420,000', subs: '12.4k', img: 'https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg' },
  { name: 'Wanjiku Tech', category: 'Education', revenue: 'KES 380,000', subs: '24.1k', img: 'https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg' },
  { name: 'ODC Music', category: 'Entertainment', revenue: 'KES 312,000', subs: '45.2k', img: 'https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg' },
  { name: 'Chef Kamau', category: 'Culinary', revenue: 'KES 275,000', subs: '8.5k', img: 'https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg' },
];

const AdminOverview = () => {
  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time snapshot of Hideaway platform performance.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, sub, icon: Icon, up }, i) => (
            <div key={i} className="bg-muted/30 border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {up ? 'Up' : 'Alert'}
                </span>
              </div>
              <div className="text-2xl font-black text-foreground mb-1">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className={`text-[10px] font-semibold mt-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>{sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Revenue Chart Placeholder */}
          <div className="lg:col-span-2 bg-muted/30 border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-foreground">Revenue Trend</h3>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
                <BarChart3 className="w-3.5 h-3.5" /> +18% MoM
              </div>
            </div>
            {/* Bar chart visual */}
            <div className="flex items-end gap-2 h-36">
              {[42, 68, 55, 80, 62, 91, 76].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary/60 to-primary transition-all duration-500 hover:from-primary hover:to-primary/80"
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{['M','T','W','T','F','S','S'][i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-muted/30 border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Recent Transactions</h3>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {recentTx.map((tx, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${tx.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{tx.name}</div>
                    <div className="text-[10px] text-muted-foreground">{tx.type} · {tx.time}</div>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${tx.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Creators */}
        <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">Top Earning Creators</h3>
            <span className="text-xs text-primary font-semibold">This Month</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Creator</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold">Subscribers</th>
                  <th className="px-6 py-3 font-semibold">Revenue</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {topCreators.map((c, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={c.img} className="w-9 h-9 rounded-full object-cover border border-border" />
                        <span className="font-semibold text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{c.category}</td>
                    <td className="px-6 py-4 font-semibold">{c.subs}</td>
                    <td className="px-6 py-4 font-bold text-primary">{c.revenue}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full w-fit">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Pending Creator Approvals', count: 12, icon: Clock, color: 'text-yellow-400 bg-yellow-400/10', link: '/admin/creators' },
            { label: 'Flagged Content', count: 3, icon: AlertCircle, color: 'text-red-400 bg-red-400/10', link: '/admin/content' },
            { label: 'Failed Payouts', count: 1, icon: DollarSign, color: 'text-orange-400 bg-orange-400/10', link: '/admin/transactions' },
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
