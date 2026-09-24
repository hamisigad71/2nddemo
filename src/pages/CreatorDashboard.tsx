import { BarChart3, Users, DollarSign, Eye, ArrowUp, Calendar } from 'lucide-react';
import CreatorLayout from '../components/CreatorLayout';

const CreatorDashboard = () => {
  return (
    <CreatorLayout>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
         <div>
           <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
           <p className="text-muted-foreground">Welcome back, Jane. Here's how your content is performing.</p>
         </div>
         <div className="flex items-center gap-2 bg-input/20 border border-border rounded-xl px-4 py-2 text-sm text-foreground">
           <Calendar className="w-4 h-4 text-muted-foreground" />
           Last 30 Days
         </div>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Total Earnings", value: "KES 145,000", increase: "+12.5%", icon: <DollarSign className="w-6 h-6 text-primary" /> },
            { label: "Active Subscribers", value: "284", increase: "+4.2%", icon: <Users className="w-6 h-6 text-secondary" /> },
            { label: "Content Views", value: "12,400", increase: "+22.1%", icon: <Eye className="w-6 h-6 text-primary" /> },
            { label: "Avg. Engagement", value: "8.4%", increase: "+1.9%", icon: <BarChart3 className="w-6 h-6 text-secondary" /> }
          ].map((stat, i) => (
            <div key={i} className="bg-background border border-border p-6 rounded-2xl shadow-sm">
               <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-input/30 rounded-lg">{stat.icon}</div>
                  <div className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                    <ArrowUp className="w-3 h-3" /> {stat.increase}
                  </div>
               </div>
               <p className="text-muted-foreground text-sm font-medium mb-1">{stat.label}</p>
               <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
            </div>
          ))}
       </div>

       {/* Charts / Activity Placeholder */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-background border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-foreground">Revenue Overview</h3>
            <div className="h-64 flex items-end justify-between gap-2 border-b border-l border-border pl-2 pb-2">
               {[40, 25, 60, 30, 80, 50, 95].map((h, i) => (
                  <div key={i} className="w-full bg-primary/80 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${h}%` }}></div>
               ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-4">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
          
          <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold mb-6 text-foreground">Recent Subscribers</h3>
             <div className="space-y-4">
               {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={`https://i.pravatar.cc/150?img=${i+20}`} alt="user" className="w-10 h-10 rounded-full" />
                      <div>
                         <div className="text-sm font-bold text-foreground">User {i}</div>
                         <div className="text-xs text-muted-foreground">{10 * i} mins ago</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-primary">KES 500</div>
                  </div>
               ))}
             </div>
             <button className="w-full mt-6 text-sm font-bold text-muted-foreground hover:text-foreground">View All</button>
          </div>
       </div>
    </CreatorLayout>
  );
};
export default CreatorDashboard;
