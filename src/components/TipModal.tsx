import { useState } from 'react';
import { X, CheckCircle2, Phone, Coins } from 'lucide-react';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
}

export default function TipModal({ isOpen, onClose, creatorName }: TipModalProps) {
  const [step, setStep] = useState<'amount' | 'mpesa' | 'processing' | 'success'>('amount');
  const [amount, setAmount] = useState<number | null>(null);
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setStep('mpesa');
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    setTimeout(() => setStep('success'), 2500);
  };

  const handleClose = () => {
    setTimeout(() => {
      setStep('amount');
      setAmount(null);
      setPhone('');
    }, 300); // reset after animation
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-background border border-border/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary/50" />
        
        <button 
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          {step === 'amount' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                <Coins className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black mb-1">Send a Tip</h2>
              <p className="text-muted-foreground text-sm font-medium mb-8">
                Show your support for <span className="text-primary font-bold">{creatorName}</span>
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[100, 200, 500, 1000].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAmountSelect(val)}
                    className="p-4 rounded-2xl border border-border/50 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 font-bold text-lg group-hover:text-primary transition-colors">
                      KES {val}
                    </span>
                  </button>
                ))}
              </div>
              
              <div className="pt-4 border-t border-border/30 text-center">
                 <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                   Secure Direct M-Pesa 
                 </p>
              </div>
            </div>
          )}

          {step === 'mpesa' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="text-emerald-500 font-black text-2xl tracking-tight mb-2 flex items-center gap-2">
                 M-PESA
              </div>
              <h2 className="text-xl font-bold mb-1">Pay KES {amount}</h2>
              <p className="text-muted-foreground text-sm font-medium mb-6 leading-relaxed">
                Enter your Safaricom number. You will receive an STK prompt to complete the tip immediately.
              </p>

              <form onSubmit={handleProcessPayment}>
                <div className="mb-6 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-muted/40 border border-border/50 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold tracking-wide"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  Send STK Prompt
                </button>
              </form>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-300">
              <div className="w-16 h-16 border-4 border-muted border-t-emerald-500 rounded-full animate-spin mb-6" />
              <h3 className="text-lg font-bold mb-2 text-emerald-500">Wait for M-Pesa prompt...</h3>
              <p className="text-muted-foreground text-sm text-center max-w-[250px] mx-auto">
                Check your phone and enter your PIN to authorize KES {amount}.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-50 duration-500">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black mb-2">Tip Sent!</h3>
              <p className="text-muted-foreground text-sm font-medium mb-8 text-center max-w-[220px]">
                Thank you for supporting {creatorName}!
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
