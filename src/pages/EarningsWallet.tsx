import CreatorLayout from '../components/CreatorLayout';
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock, Building } from 'lucide-react';

const EarningsWallet = () => {
  return (
    <CreatorLayout>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
         <div>
           <h1 className="text-3xl font-bold mb-1">Wallet & Payouts</h1>
           <p className="text-muted-foreground">Manage your earnings and withdraw directly to M-Pesa.</p>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Main Balance Card */}
          <div className="md:col-span-2 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl p-8 text-primary-foreground shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-10 blur-xl">
               <DollarSign className="w-64 h-64 mix-blend-overlay" />
             </div>
             <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                <div>
                   <div className="text-emerald-100 font-medium mb-1">Available Balance</div>
                   <h2 className="text-5xl font-black tracking-tight">KES 45,200</h2>
                </div>
                <div className="flex gap-3">
                  <button className="bg-white text-primary px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-50 transition-colors">
                    Withdraw to M-Pesa
                  </button>
                  <button className="bg-black/20 text-white border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-black/30 transition-colors">
                    Manage Bank
                  </button>
                </div>
             </div>
          </div>

           {/* Pending / Method */}
           <div className="flex flex-col gap-6">
             <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground font-medium mb-2">
                   <Clock className="w-4 h-4" /> Pending Clearance
                </div>
                <div className="text-2xl font-bold">KES 12,800</div>
                <p className="text-xs text-muted-foreground mt-1">Available in 2-3 business days.</p>
             </div>
             <div className="bg-background border border-border rounded-xl p-5 shadow-sm flex-1">
                <div className="flex items-center gap-2 text-muted-foreground font-medium ">
                   <Building className="w-4 h-4" /> Default Payout Method
                </div>
                <div className="flex items-center gap-3 mt-4 bg-muted/40 p-3 rounded-lg border border-border">
                   <div className="w-10 h-10 bg-secondary/20 rounded-md flex items-center justify-center text-secondary font-black text-xs">MP</div>
                   <div>
                      <div className="font-bold text-sm">M-Pesa Wallet</div>
                      <div className="text-xs text-muted-foreground">Ends in *4567</div>
                   </div>
                </div>
             </div>
           </div>
       </div>

       {/* Transactions */}
       <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex justify-between items-center">
             <h3 className="text-lg font-bold">Recent Transactions</h3>
             <button className="text-primary text-sm font-bold hover:underline">Download CSV</button>
          </div>
          <div className="divide-y divide-border">
             {[1, 2, 3, 4, 5, 6].map((i) => {
               const isWithdrawal = i === 4;
               return (
               <div key={i} className="p-5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isWithdrawal ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                      {isWithdrawal ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                       <div className="font-bold text-sm">{isWithdrawal ? 'Withdrawal to M-Pesa' : 'Subscription: Fan ' + i}</div>
                       <div className="text-xs text-muted-foreground">Oct 24, 2026 • {isWithdrawal ? 'Completed' : 'Processed via M-Pesa'}</div>
                    </div>
                 </div>
                 <div className={`font-bold ${isWithdrawal ? 'text-foreground' : 'text-primary'}`}>
                    {isWithdrawal ? '-' : '+'} KES {isWithdrawal ? '15,000' : '500'}
                 </div>
               </div>
             )})}
          </div>
       </div>
    </CreatorLayout>
  );
};
export default EarningsWallet;
