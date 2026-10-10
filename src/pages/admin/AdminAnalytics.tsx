import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight } from 'lucide-react';
import AdminLayout from './AdminLayout';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const revenueData = [42, 68, 55, 80, 62, 91, 76];
const userGrowth = [120, 145, 130, 170, 155, 198, 182];

const topCreators = [
  { name: 'Amina K.', category: 'Fitness', revenue: 'KES 420,000', growth: '+22%', img: 'https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg' },
  { name: 'Wanjiku Tech', category: 'Education', revenue: 'KES 380,000', growth: '+18%', img: 'https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg' },
  { name: 'ODC Music', category: 'Entertainment', revenue: 'KES 312,000', growth: '+31%', img: 'https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg' },
  { name: 'Chef Kamau', category: 'Culinary', revenue: 'KES 275,000', growth: '+9%', img: 'https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg' },
  { name: 'Grace Fashion', category: 'Fashion', revenue: 'KES 98,000', growth: '+44%', img: 'https://i.pravatar.cc/150?img=47' },
];

const paymentMethods = [
  { method: 'M-Pesa', percent: 72, color: 'bg-emerald-500' },
  { method: 'Visa / Card', percent: 21, color: 'bg-blue-500' },
  { method: 'Bank Transfer', percent: 7, color: 'bg-zinc-400' },
];

const AdminAnalytics = () => {
  const maxRevenue = Math.max(...revenueData);
  const maxUsers = Math.max(...userGrowth);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d0e12] to-[#14161d] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Platform Analytics</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium">Revenue trends, user growth, and top performer analysis for this week.</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: 'KES 48.2M', sub: '+18% MoM', icon: DollarSign, up: true },
            { label: 'Active Creators', value: '2,412', sub: '+34 this week', icon: Users, up: true },
            { label: 'Active Fans', value: '182,430', sub: '+2.1k this week', icon: TrendingUp, up: true },
            { label: 'Avg. Subscription Value', value: 'KES 650', sub: '+5% vs last month', icon: ArrowUpRight, up: true },
          ].map(({ label, value, sub, icon: Icon, up }, i) => (
            <div key={i} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[11px] font-black ${up ? 'text-emerald-400' : 'text-red-400'}`}>{sub}</span>
              </div>
              <div className="text-2xl font-black text-white mb-1">{value}</div>
              <div className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">{label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Revenue Chart */}
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-white text-base">Revenue This Week</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Daily platform revenue in KES thousands</p>
              </div>
              <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">↑ +18% MoM</span>
            </div>
            <div className="flex items-end gap-3 h-40">
              {revenueData.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-[9px] text-zinc-600 font-bold">{h}k</div>
                  <div className="w-full rounded-t-xl bg-gradient-to-t from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 transition-all cursor-pointer relative group/bar"
                    style={{ height: `${(h / maxRevenue) * 100}%`, minHeight: '8px' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] font-black px-2 py-0.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                      KES {h}k
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold">{weekDays[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* User Growth Chart */}
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-white text-base">New Users This Week</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Daily new registrations across all roles</p>
              </div>
              <span className="text-[11px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">↑ +12% WoW</span>
            </div>
            <div className="flex items-end gap-3 h-40">
              {userGrowth.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-[9px] text-zinc-600 font-bold">{h}</div>
                  <div className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 transition-all cursor-pointer"
                    style={{ height: `${(h / maxUsers) * 100}%`, minHeight: '8px' }} />
                  <span className="text-[10px] text-zinc-500 font-bold">{weekDays[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Top Creators */}
          <div className="lg:col-span-2 bg-[#0d0e12] border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-black text-white">Top Earning Creators</h3>
              <span className="text-xs text-zinc-500 font-medium">This Month</span>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {topCreators.map((c, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-900/50 transition-colors group">
                  <div className="text-zinc-600 font-black text-sm w-6 text-center shrink-0">#{i + 1}</div>
                  <img src={c.img} className="w-10 h-10 rounded-full object-cover border-2 border-zinc-800 group-hover:border-red-500/30 transition-colors shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">{c.name}</div>
                    <div className="text-[11px] text-zinc-500">{c.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-red-500 text-sm">{c.revenue}</div>
                    <div className="text-[11px] text-emerald-400 font-bold">{c.growth}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6">
            <h3 className="font-black text-white mb-6">Payment Methods</h3>
            <div className="space-y-5">
              {paymentMethods.map(({ method, percent, color }, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{method}</span>
                    <span className="text-sm font-black text-zinc-400">{percent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <div className="text-[11px] uppercase tracking-widest text-zinc-500 font-black mb-1">Peak Activity</div>
              <div className="text-white font-black text-lg">9 PM – 11 PM EAT</div>
              <div className="text-zinc-500 text-xs mt-1">Fridays and Saturdays see 3× traffic</div>
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
