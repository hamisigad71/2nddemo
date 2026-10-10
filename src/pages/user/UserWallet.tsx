import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { Wallet, Plus, ArrowUpRight, ArrowRight, History, CreditCard, ShieldCheck } from 'lucide-react';

export default function UserWallet() {
  const navigate = useNavigate();
  const [balance] = useState(12500);
  const [quickAmounts] = useState([500, 1000, 2500, 5000]);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const handleTopup = (amt: number) => {
    navigate('/checkout', {
      state: {
        creator: {
          name: 'Wallet Top-Up',
          price: `KES ${amt}`,
          avatar: '/logo.svg',
          id: 'wallet'
        }
      }
    });
  };

  const transactions = [
    { id: 1, type: 'topup', amount: 15000, date: 'Oct 8, 2026', status: 'completed' },
    { id: 2, type: 'spent', amount: 2500, title: 'Tip to Valentina', date: 'Oct 7, 2026', status: 'completed' },
    { id: 3, type: 'spent', amount: 1000, title: 'Subscription to Sofia Monroe', date: 'Oct 5, 2026', status: 'completed' },
  ];

  return (
    <UserLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
            My Wallet
          </h1>
          <p className="text-zinc-400 font-medium text-sm">
            Manage your platform credits and transaction history.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Balance Card - Solid Black, Red Accents, White Text (NO GRADIENTS) */}
          <div className="lg:col-span-2 rounded-[2rem] p-8 md:p-10 bg-[#0d0e12] border border-red-900/30 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2.5 bg-red-950/40 px-4 py-2 rounded-full border border-red-500/30">
                <Wallet className="w-4 h-4 text-red-500" />
                <span className="text-xs font-black tracking-widest uppercase text-red-400">Available Balance</span>
              </div>
              <div className="w-11 h-11 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div className="mb-10">
              <div className="text-xs font-black text-red-500 tracking-widest uppercase mb-1">KES</div>
              <div className="text-5xl md:text-7xl font-black tracking-tight text-white">
                {balance.toLocaleString()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
              <button 
                onClick={() => handleTopup(1000)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-black text-sm transition-colors active:scale-95 flex items-center justify-center gap-2.5 border border-red-500 group/btn"
              >
                <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-300" />
                Add Funds
              </button>
              <button className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 hover:border-zinc-700 px-6 py-4 rounded-2xl font-bold text-sm transition-colors active:scale-95 flex items-center justify-center gap-2.5 group/btn2">
                <CreditCard className="w-5 h-5 text-zinc-400 group-hover/btn2:text-white transition-colors" />
                Manage Methods
              </button>
            </div>
          </div>

          {/* Quick Top Up - Solid Black & Red / White Buttons */}
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-[2rem] p-6 flex flex-col shadow-xl">
            <h3 className="font-black text-lg text-white mb-1">Quick Top-Up</h3>
            <p className="text-xs text-zinc-400 mb-6 font-medium">Select an amount to instantly add to your wallet.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
              {quickAmounts.map((amt) => (
                <button 
                  key={amt} 
                  onClick={() => handleTopup(amt)}
                  className="bg-zinc-900 hover:bg-red-600/10 border border-zinc-800 hover:border-red-500/50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-all group"
                >
                  <span className="text-[10px] text-zinc-400 group-hover:text-red-400 font-bold tracking-wider">KES</span>
                  <span className="text-lg font-black text-white group-hover:text-red-500 transition-colors">{amt.toLocaleString()}</span>
                </button>
              ))}
            </div>

            {!isCustom ? (
              <button 
                onClick={() => setIsCustom(true)}
                className="w-full bg-zinc-900 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 hover:border-red-600 py-3.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 group"
              >
                Custom Amount
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="w-full flex items-center bg-zinc-900 border border-red-500/40 rounded-xl overflow-hidden focus-within:border-red-500 transition-colors">
                <span className="pl-4 pr-1 text-xs font-bold text-red-500">KES</span>
                <input 
                   type="number" 
                   value={customAmount}
                   onChange={(e) => setCustomAmount(e.target.value)}
                   placeholder="Amount"
                   autoFocus
                   className="w-full bg-transparent border-none focus:outline-none focus:ring-0 py-3.5 text-sm font-bold text-white placeholder:text-zinc-600"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       const val = parseInt(customAmount);
                       if (val > 0) handleTopup(val);
                     }
                   }}
                />
                <button 
                   onClick={() => {
                      const val = parseInt(customAmount);
                      if (val > 0) handleTopup(val);
                   }}
                   className="bg-red-600 hover:bg-red-700 text-white px-5 py-3.5 transition-colors font-bold flex items-center justify-center shrink-0"
                >
                   <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-[#0d0e12] border border-zinc-800 rounded-[2rem] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl">
                   <History className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-black text-lg text-white">Recent Transactions</h3>
             </div>
             <button className="text-sm font-bold text-red-500 hover:text-red-400 transition-colors">View All</button>
          </div>
          
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 hover:bg-zinc-900 transition-colors group">
                <div className="flex items-center gap-4">
                  {/* Green icon for Top-Up / Income, Red icon for Spending */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    tx.type === 'topup' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {tx.type === 'topup' ? <ArrowUpRight className="w-5 h-5" /> : <div className="w-5 h-5 rotate-180"><ArrowUpRight className="w-full h-full" /></div>}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-red-400 transition-colors">
                      {tx.type === 'topup' ? 'Wallet Top-Up' : tx.title}
                    </div>
                    <div className="text-xs text-zinc-400 font-medium mt-0.5">{tx.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  {/* Green text for Top-Up, White/Red text for Spent */}
                  <div className={`font-black text-sm tracking-tight ${tx.type === 'topup' ? 'text-emerald-400' : 'text-white'}`}>
                    {tx.type === 'topup' ? '+' : '-'}KES {tx.amount.toLocaleString()}
                  </div>
                  <div className={`text-[10px] font-extrabold uppercase tracking-wider mt-0.5 ${tx.type === 'topup' ? 'text-emerald-500' : 'text-zinc-500'}`}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </UserLayout>
  );
}
