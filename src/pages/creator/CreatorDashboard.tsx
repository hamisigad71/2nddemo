import { BarChart3, Users, DollarSign, Eye, ArrowUp, Calendar, Loader2 } from 'lucide-react';
import CreatorLayout from '../../components/CreatorLayout';
import CreatePostForm from '../../components/CreatePostForm';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { getCreatorDashboardStats } from '../../lib/db';

const CreatorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalEarnings: 0, activeSubs: 0, recentSubs: [] as any[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getCreatorDashboardStats(user.id).then(data => {
        setStats(data);
        setLoading(false);
      });
    }
  }, [user]);
  
  return (
    <CreatorLayout>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
         <div>
           <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
           <p className="text-muted-foreground">Welcome back, {(user?.user_metadata?.name || user?.user_metadata?.full_name)?.split(' ')[0] || 'Creator'}. Here's how your content is performing.</p>
         </div>
         <div className="flex items-center gap-2 bg-input/20 border border-border rounded-xl px-4 py-2 text-sm text-foreground">
           <Calendar className="w-4 h-4 text-muted-foreground" />
           Last 30 Days
         </div>
       </div>

       {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 w-full">
          {[
            { 
              label: "Total Earnings", value: `KES ${stats.totalEarnings.toLocaleString()}`, increase: "+12.5%", 
              iconWrapperClass: "bg-emerald-500/10",
              icon: <DollarSign className="w-5 h-5 text-emerald-500" /> 
            },
            { 
              label: "Active Subs", value: stats.activeSubs.toString(), increase: "+4.2%", 
              iconWrapperClass: "bg-blue-500/10",
              icon: <Users className="w-5 h-5 text-blue-500" /> 
            },
            { 
              label: "Content Views", value: "---", increase: "+0.0%", 
              iconWrapperClass: "bg-primary/10",
              icon: <Eye className="w-5 h-5 text-primary" /> 
            },
            { 
              label: "Engagement", value: "---", increase: "+0.0%", 
              iconWrapperClass: "bg-orange-500/10",
              icon: <BarChart3 className="w-5 h-5 text-orange-500" /> 
            }
          ].map((stat, i) => (
            <div key={i} className="bg-background border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className={`p-2 rounded-xl ${stat.iconWrapperClass}`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-3xl font-bold text-foreground mb-1 tracking-tight">{stat.value}</h3>
                <div className="flex items-center gap-1.5 text-sm mt-3">
                  <div className={`flex items-center gap-1 font-semibold ${stat.increase.startsWith('+') ? (stat.increase !== '+0.0%' ? 'text-emerald-500' : 'text-muted-foreground') : 'text-red-500'}`}>
                    {stat.increase.startsWith('+') && stat.increase !== '+0.0%' ? <ArrowUp className="w-4 h-4" /> : null}
                    {stat.increase}
                  </div>
                  <span className="text-muted-foreground text-xs ml-1 font-medium">from last month</span>
                </div>
              </div>
            </div>
          ))}
        </div>

       {/* Post Upload */}
       <CreatePostForm />

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
               {loading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
               ) : stats.recentSubs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No subscribers yet.
                  </div>
               ) : (
                 stats.recentSubs.map(t => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={t.users?.avatar || "https://i.pravatar.cc/150?img=1"} 
                          alt="user" 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover" 
                        />
                        <div>
                           <div className="text-sm font-bold text-foreground truncate w-32">{t.users?.name || 'Fan'}</div>
                           <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-primary">KES {t.gross_amount}</div>
                    </div>
                 ))
               )}
             </div>
             <button className="w-full mt-6 text-sm font-bold text-muted-foreground hover:text-foreground">View All</button>
          </div>
       </div>
    </CreatorLayout>
  );
};
export default CreatorDashboard;
