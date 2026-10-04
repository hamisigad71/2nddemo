import { TrendingUp, Users, DollarSign, BarChart3, ArrowUpRight } from 'lucide-react';
import AdminLayout from './AdminLayout';

const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const revenueData = [28, 42, 38, 56, 62, 74, 91];
const signupData = [180, 245, 210, 310, 380, 420, 510];

const topCreators = [
  { name: 'Amina K.', revenue: 'KES 420K', growth: '+12%', img: 'https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg' },
  { name: 'Wanjiku Tech', revenue: 'KES 380K', growth: '+8%', img: 'https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg' },
  { name: 'ODC Music', revenue: 'KES 312K', growth: '+21%', img: 'https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg' },
  { name: 'Chef Kamau', revenue: 'KES 275K', growth: '+5%', img: 'https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg' },
  { name: 'Zuri Beauty', revenue: 'KES 210K', growth: '+34%', img: 'https://i.pravatar.cc/150?img=32' },
];

const AdminAnalytics = () => (
  <AdminLayout>
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide performance and growth trends.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Revenue', value: 'KES 12.8M', delta: '+18%', icon: DollarSign },
          { label: 'New Creators', value: '142', delta: '+34', icon: Users },
          { label: 'New Fans', value: '8,420', delta: '+2.1k', icon: TrendingUp },
          { label: 'Platform Fee Earned', value: 'KES 1.28M', delta: '+18%', icon: BarChart3 },
        ].map(({ label, value, delta, icon: Icon }, i) => (
          <div key={i} className="bg-muted/30 border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />{delta}
              </span>
            </div>
            <div className="text-2xl font-black">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Chart */}
        <div className="bg-muted/30 border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold">Revenue Growth</h3>
              <p className="text-xs text-muted-foreground">Last 7 months (KES millions)</p>
            </div>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2.5 py-1 rounded-full">+18% MoM</span>
          </div>
          <div className="flex items-end gap-2 h-40 mb-2">
            {revenueData.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-primary/70 to-primary hover:from-primary hover:to-primary/80 transition-all cursor-pointer relative group/bar"
                  style={{ height: `${(h / 91) * 100}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                    KES {h}M
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signups Chart */}
        <div className="bg-muted/30 border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold">New Signups</h3>
              <p className="text-xs text-muted-foreground">Last 7 months</p>
            </div>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2.5 py-1 rounded-full">+21% MoM</span>
          </div>
          <div className="flex items-end gap-2 h-40 mb-2">
            {signupData.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-secondary/60 to-secondary hover:brightness-110 transition-all cursor-pointer"
                  style={{ height: `${(h / 510) * 100}%` }}
                />
                <span className="text-[9px] text-muted-foreground">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Creators Leaderboard */}
      <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold">Top Earners Leaderboard</h3>
          <span className="text-xs text-muted-foreground">This Month</span>
        </div>
        <div className="divide-y divide-border">
          {topCreators.map((c, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
              <span className={`text-lg font-black w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-orange-400' : 'text-muted-foreground/50'}`}>
                {i + 1}
              </span>
              <img src={c.img} className="w-9 h-9 rounded-full object-cover border border-border" />
              <div className="flex-1">
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.revenue}</div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />{c.growth}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Geo Breakdown */}
      <div className="bg-muted/30 border border-border rounded-2xl p-6">
        <h3 className="font-bold mb-4">Geographic Distribution</h3>
        <div className="space-y-3">
          {[
            { city: 'Nairobi', pct: 62 },
            { city: 'Mombasa', pct: 14 },
            { city: 'Kisumu', pct: 9 },
            { city: 'Nakuru', pct: 7 },
            { city: 'Other', pct: 8 },
          ].map(({ city, pct }) => (
            <div key={city} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{city}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold w-8 text-right">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  </AdminLayout>
);

export default AdminAnalytics;
