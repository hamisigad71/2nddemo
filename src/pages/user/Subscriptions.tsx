import UserLayout from '../../components/UserLayout';
import { CheckCircle2, XCircle, MoreVertical } from 'lucide-react';

const Subscriptions = () => {
  return (
    <UserLayout>
       <div className="mb-8">
           <h1 className="text-2xl font-bold tracking-tight">Active Subscriptions</h1>
           <p className="text-sm text-muted-foreground">Manage the creators you are currently supporting.</p>
       </div>

       <div className="space-y-4">
          {[1, 2, 3].map((i) => {
             const isAutoRenew = i !== 3; // Make one look canceled/manual
             return (
               <div key={i} className="bg-background border border-border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <img src={`https://i.pravatar.cc/150?img=${i+20}`} alt="creator" className="w-16 h-16 rounded-full object-cover border border-border" />
                     <div>
                        <div className="font-bold text-lg">Creator Name {i}</div>
                        <div className="text-xs text-muted-foreground mb-2">@creator_{i}</div>
                        <div className={`text-xs font-bold flex items-center gap-1 ${isAutoRenew ? 'text-emerald-600' : 'text-red-500'}`}>
                           {isAutoRenew ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                           {isAutoRenew ? 'Auto-renews Oct 28' : 'Expires Oct 15'}
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-border sm:border-0">
                     <div className="text-left sm:text-right">
                        <div className="font-black text-lg">KES 500<span className="text-sm text-muted-foreground font-medium">/mo</span></div>
                     </div>
                     <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors border border-border sm:border-transparent">
                        <MoreVertical className="w-5 h-5" />
                     </button>
                  </div>
               </div>
             )
          })}
       </div>

       <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Expired Subscriptions</h2>
          <div className="bg-muted/10 border border-border rounded-xl p-4 flex items-center justify-between opacity-70 hover:opacity-100 transition-opacity">
             <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/150?img=40" alt="creator" className="w-10 h-10 rounded-full grayscale" />
                <div>
                   <div className="font-bold text-sm">Creator Name 4</div>
                   <div className="text-xs text-muted-foreground">Expired Sept 12</div>
                </div>
             </div>
             <button className="px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-lg hover:brightness-110">
                Resubscribe
             </button>
          </div>
       </div>

    </UserLayout>
  );
};
export default Subscriptions;
