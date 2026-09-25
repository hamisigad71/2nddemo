import { BarChart3, Users, DollarSign, Eye, ArrowUp, Calendar } from 'lucide-react';
import CreatorLayout from '../../components/CreatorLayout';

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
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 w-full">
          {[
            { 
              label: "Total Earnings", value: "KES 145k", increase: "+12.5%", 
              glowClass: "bg-emerald-500/10", iconWrapperClass: "from-emerald-500/20 border-emerald-500/20",
              pillClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
              icon: <DollarSign className="w-5 h-5 text-emerald-500 drop-shadow-sm" /> 
            },
            { 
              label: "Active Subs", value: "284", increase: "+4.2%", 
              glowClass: "bg-secondary/10", iconWrapperClass: "from-secondary/20 border-secondary/20",
              pillClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
              icon: <Users className="w-5 h-5 text-secondary drop-shadow-sm" /> 
            },
            { 
              label: "Content Views", value: "12.4k", increase: "+22.1%", 
              glowClass: "bg-primary/10", iconWrapperClass: "from-primary/20 border-primary/20",
              pillClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
              icon: <Eye className="w-5 h-5 text-primary drop-shadow-sm" /> 
            },
            { 
              label: "Engagement", value: "8.4%", increase: "+1.9%", 
              glowClass: "bg-secondary/10", iconWrapperClass: "from-secondary/20 border-secondary/20",
              pillClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
              icon: <BarChart3 className="w-5 h-5 text-secondary drop-shadow-sm" /> 
            }
          ].map((stat, i) => (
            <div key={i} className="group relative bg-card border border-border/60 hover:border-border/80 p-4 sm:p-7 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col w-full min-w-0">
               {/* Subtle background glow on hover */}
               <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -translate-y-1/2 translate-x-1/3 ${stat.glowClass}`} />
               
               {/* Very subtle noise texture */}
               <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

               <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br to-transparent border flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0 ${stat.iconWrapperClass}`}>
                    {stat.icon}
                  </div>
                  <div className={`flex items-center gap-1 text-[9px] sm:text-[11px] font-bold border px-2 py-1 rounded-full shadow-sm backdrop-blur-sm ${stat.pillClass}`}>
                    <ArrowUp className="w-2.5 h-2.5" /> {stat.increase}
                  </div>
               </div>
               
               <div className="mt-auto relative z-10">
                 <p className="text-muted-foreground text-[9px] sm:text-[12px] font-bold tracking-wider uppercase mb-1 opacity-80 truncate">{stat.label}</p>
                 <h3 className="text-xl sm:text-3xl font-black text-foreground tracking-tight">{stat.value}</h3>
               </div>
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
