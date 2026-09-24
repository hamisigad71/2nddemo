import CreatorLayout from '../components/CreatorLayout';
import { Search, Filter, MessageSquareDiff, MoreHorizontal, ArrowUpDown } from 'lucide-react';

const FanManagement = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Fan Management</h1>
          <p className="text-muted-foreground">Organize your fans into lists and send mass messages.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          <MessageSquareDiff className="w-5 h-5" /> Mass Message
        </button>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/10">
           <div className="flex gap-2 overflow-x-auto w-full sm:w-auto scrollbar-hide pb-2 sm:pb-0">
             {['All active', 'Expired', 'Top Spenders', 'Recently Subscribed'].map((tab, i) => (
               <button key={tab} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${i === 0 ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:bg-muted'}`}>
                 {tab}
               </button>
             ))}
           </div>
           
           <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <input type="text" placeholder="Search fans..." className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
             </div>
             <button className="p-2 border border-border rounded-lg bg-background text-muted-foreground hover:text-foreground">
               <Filter className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="p-4 w-12"><input type="checkbox" className="rounded border-border" /></th>
                <th className="p-4">Fan</th>
                <th className="p-4">Status</th>
                <th className="p-4 flex items-center gap-1 cursor-pointer hover:text-foreground">Total Spent <ArrowUpDown className="w-3 h-3"/></th>
                <th className="p-4">Subscribed</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <tr key={i} className="hover:bg-muted/10 transition-colors group">
                  <td className="p-4"><input type="checkbox" className="rounded border-border" /></td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={`https://i.pravatar.cc/150?img=${i+20}`} alt="user" className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="font-bold">FanAccount{i}</div>
                        <div className="text-xs text-muted-foreground">@fan_zero{i}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {i === 3 ? (
                      <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded-md text-xs font-bold">Expired</span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-md text-xs font-bold">Active</span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-foreground">
                    KES {i * 1200}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    Oct {i}, 2026
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 text-muted-foreground hover:bg-muted rounded-full">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CreatorLayout>
  );
};
export default FanManagement;
