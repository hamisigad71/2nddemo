import CreatorLayout from '../../components/CreatorLayout';
import { Search, Filter, MessageSquareDiff, MoreHorizontal, ArrowUpDown } from 'lucide-react';

const FanManagement = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">Fan Management</h1>
          <p className="text-muted-foreground text-sm">Organize your fans into lists and send mass messages.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/40 transition-all duration-200">
          <MessageSquareDiff className="w-5 h-5" /> Mass Message
        </button>
      </div>

      <div className="bg-background border border-border/60 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-border/40 flex flex-col lg:flex-row gap-5 justify-between items-center bg-background/50 backdrop-blur-md">
           <div className="flex gap-2 overflow-x-auto w-full lg:w-auto scrollbar-hide pb-2 lg:pb-0">
             {['All active', 'Expired', 'Top Spenders', 'Recently Subscribed'].map((tab, i) => (
               <button key={tab} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${i === 0 ? 'bg-foreground text-background shadow-sm' : 'bg-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground'}`}>
                 {tab}
               </button>
             ))}
           </div>
           
           <div className="flex items-center gap-3 w-full lg:w-auto">
             <div className="relative flex-1 lg:w-72 group">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
               <input type="text" placeholder="Search fans..." className="w-full pl-10 pr-4 py-2.5 bg-foreground/5 border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all" />
             </div>
             <button className="p-2.5 rounded-xl bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors">
               <Filter className="w-5 h-5" />
             </button>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-foreground/[0.02] border-b border-border/40 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">
              <tr>
                <th className="p-5 w-12"><input type="checkbox" className="rounded-[4px] border-border/50 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer" /></th>
                <th className="p-5">Fan</th>
                <th className="p-5">Status</th>
                <th className="p-5">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors group">
                    Total Spent <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground"/>
                  </div>
                </th>
                <th className="p-5">Subscribed</th>
                <th className="p-5 text-right flex justify-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <tr key={i} className="hover:bg-foreground/[0.02] transition-colors group">
                  <td className="p-5"><input type="checkbox" className="rounded-[4px] border-border/50 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer" /></td>
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <img src={`https://i.pravatar.cc/150?img=${i+20}`} alt="user" className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all" />
                      <div>
                        <div className="font-bold text-[14px] text-foreground tracking-tight">FanAccount{i}</div>
                        <div className="text-[12px] font-medium text-muted-foreground mt-0.5">@fan_zero{i}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    {i === 3 ? (
                      <span className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest inline-flex items-center">Expired</span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-5 font-bold text-[14px] text-foreground tracking-tight">
                    KES {(i * 1200).toLocaleString()}
                  </td>
                  <td className="p-5 text-muted-foreground font-medium text-[13px]">
                    Oct {i}, 2026
                  </td>
                  <td className="p-5 text-right">
                    <button className="p-2 text-muted-foreground hover:bg-foreground/5 hover:text-foreground rounded-xl transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
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
