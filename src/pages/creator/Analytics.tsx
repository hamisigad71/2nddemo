import CreatorLayout from '../../components/CreatorLayout';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

const Analytics = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Analytics & Insights</h1>
          <p className="text-muted-foreground">Deep dive into your performance metrics and audience retention.</p>
        </div>
        <select className="bg-background border border-border px-4 py-2 font-bold rounded-lg shadow-sm focus:outline-none">
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>This Year</option>
        </select>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         {[
           { label: 'Total Gross Revenue', val: 'KES 245K', icon: DollarSign, trend: '+12%' },
           { label: 'Active Subscribers', val: '1,430', icon: Users, trend: '+5%' },
           { label: 'Churn Rate', val: '4.2%', icon: Activity, trend: '-1.1%' },
           { label: 'Profile Views', val: '45K', icon: TrendingUp, trend: '+34%' },
         ].map((stat, i) => (
           <div key={i} className="bg-background border border-border rounded-xl p-5 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                  {stat.trend}
                </div>
             </div>
             <div className="font-bold text-2xl">{stat.val}</div>
             <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
           </div>
         ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
         {/* Fake Chart 1 */}
         <div className="bg-background border border-border rounded-xl p-6 shadow-sm h-80 flex flex-col">
            <h3 className="font-bold mb-4">Revenue Growth</h3>
            <div className="flex-1 flex items-end gap-2 mt-4 border-b border-l border-border px-2 pb-2">
               {[40, 60, 45, 80, 50, 90, 75].map((h, i) => (
                 <div key={i} className="flex-1 bg-primary/90 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${h}%` }}></div>
               ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
               <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
         </div>

         {/* Subscriber Sources */}
         <div className="bg-background border border-border rounded-xl p-6 shadow-sm h-80 flex flex-col">
            <h3 className="font-bold mb-6">Top Traffic Sources</h3>
            <div className="space-y-6 flex-1">
               {[
                 { source: 'Direct / Existing Link', pct: 45, color: 'bg-primary' },
                 { source: 'TikTok Bio', pct: 30, color: 'bg-secondary' },
                 { source: 'Twitter Profile', pct: 20, color: 'bg-blue-400' },
                 { source: 'Instagram', pct: 5, color: 'bg-pink-500' },
               ].map((item, i) => (
                 <div key={i}>
                    <div className="flex justify-between text-sm mb-1 font-medium">
                      <span>{item.source}</span>
                      <span>{item.pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                       <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }}></div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </CreatorLayout>
  );
};
export default Analytics;
