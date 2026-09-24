import UserLayout from '../components/UserLayout';
import { Wallet, Smartphone, CreditCard as CardIcon, Plus } from 'lucide-react';

const PaymentMethods = () => {
  return (
    <UserLayout>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
           <div>
              <h1 className="text-2xl font-bold tracking-tight">Payment Methods</h1>
              <p className="text-sm text-muted-foreground">Manage how you pay for subscriptions and content.</p>
           </div>
           <button className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 font-bold rounded-lg shadow hover:bg-secondary/90 transition-colors text-sm">
             <Plus className="w-4 h-4" /> Add Payment Method
           </button>
       </div>

       <div className="space-y-4">
          
          {/* Primary Method: M-Pesa */}
          <div className="bg-background border-2 border-emerald-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                DEFAULT
             </div>
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                   <Smartphone className="w-6 h-6" />
                </div>
                <div>
                   <div className="font-bold text-lg">M-Pesa Wallet</div>
                   <div className="text-sm text-muted-foreground">Linked Phone Number</div>
                </div>
             </div>
             <div className="flex items-center justify-between">
                <div className="font-mono font-bold tracking-wider text-xl">
                   +254 712 *** 890
                </div>
                <button className="text-sm text-red-500 font-bold hover:underline">Remove</button>
             </div>
          </div>

          {/* Secondary Method: Debit Card */}
          <div className="bg-background border border-border rounded-2xl p-6 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                   <CardIcon className="w-6 h-6" />
                </div>
                <div>
                   <div className="font-bold text-lg">Debit Card</div>
                   <div className="text-sm text-muted-foreground">Visa Bank Card</div>
                </div>
             </div>
             <div className="flex items-center justify-between">
                <div className="font-mono font-bold tracking-wider text-lg flex items-center gap-2">
                   **** **** **** 4242
                </div>
                <button className="text-sm text-muted-foreground font-bold hover:underline">Set Default</button>
             </div>
          </div>

       </div>

       <div className="mt-8 bg-muted/20 border border-border rounded-xl p-4">
          <div className="flex gap-3">
             <Wallet className="w-5 h-5 text-muted-foreground shrink-0" />
             <p className="text-xs text-muted-foreground">
               Transactions on your bank statement will appear as <strong>MALI TECH LTD</strong>. M-Pesa prompt will appear on your phone for verification when making new purchases.
             </p>
          </div>
       </div>

    </UserLayout>
  );
};
export default PaymentMethods;
