import { useState } from 'react';
import { ArrowLeft, CheckCircle, ShieldCheck, CreditCard, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Checkout = () => {
  const location = useLocation();
  const creator = location.state?.creator || {
    name: "Jane Doe",
    price: "KES 500/mo",
    avatar: "https://i.pravatar.cc/150?img=12"
  };

  const [method, setMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  const handleMpesaPay = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('pending');
    setTimeout(() => {
      setStatus('success');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {/* Left side - Order Summary */}
      <div className="lg:w-1/2 p-6 md:p-12 lg:p-20 border-b lg:border-b-0 lg:border-r border-border bg-input/5">
        <Link to="/creator/123" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>
        <h1 className="text-3xl lg:text-4xl font-bold mb-8">Checkout</h1>
        
        <div className="bg-background border border-border p-6 rounded-2xl shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <img src={creator.avatar} alt="creator" className="w-16 h-16 rounded-full object-cover" />
            <div>
              <h2 className="text-xl font-bold">{creator.name}</h2>
              <p className="text-muted-foreground text-sm">Monthly Subscription</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4 text-muted-foreground">
             <span>Subscription Fee</span>
             <span>{creator.price}</span>
          </div>
          <div className="flex justify-between items-center mb-6 text-muted-foreground">
             <span>Platform Fee</span>
             <span>KES 0.00</span>
          </div>
          <div className="flex justify-between items-center font-bold text-xl border-t border-border pt-6 text-foreground">
             <span>Total Due</span>
             <span className="text-primary">{creator.price}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Secure, encrypted transactions. Cancel anytime.
        </div>
      </div>

      {/* Right side - Payment Method */}
      <div className="lg:w-1/2 p-6 md:p-12 lg:p-20 bg-background relative">
        <h3 className="text-2xl font-bold mb-6">Select Payment Method</h3>
        
        {status === 'success' ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
             <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <CheckCircle className="w-12 h-12 text-primary" />
             </div>
             <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
             <p className="text-muted-foreground mb-8 text-lg max-w-sm">You are now subscribed to {creator.name}. Enjoy the premium content.</p>
             <Link to="/creator/123" className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20 text-lg">
               Return to Profile
             </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 mb-8">
          {/* M-Pesa Option */}
          <button
            type="button"
            onClick={() => setMethod('mpesa')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${method === 'mpesa' ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-border bg-input/10 hover:border-primary/40'}`}
          >
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4NrGQhzTgIhXHqB15-5h3BWFd2hAVWucCZjleiDXKuA&s=10"
                alt="M-Pesa"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-foreground">M-Pesa STK Push</div>
              <div className="text-xs text-muted-foreground mt-0.5">Instant STK prompt to your phone. No card needed.</div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${method === 'mpesa' ? 'border-primary' : 'border-border'}`}>
              {method === 'mpesa' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </button>

          {/* Card Option */}
          <button
            type="button"
            onClick={() => setMethod('card')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${method === 'card' ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-border bg-input/10 hover:border-primary/40'}`}
          >
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden gap-1 px-1">
              <img
                src="https://i.pinimg.com/236x/2c/2e/a2/2c2ea23f50347ec3cc8ec0d47536aee8.jpg"
                alt="Visa"
                className="h-5 object-contain"
              />
              <img
                src="https://i.pinimg.com/1200x/cf/01/7c/cf017c3df4b4b6ce716a19b6d146a93c.jpg"
                alt="Mastercard"
                className="h-6 object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-foreground">Credit / Debit Card</div>
              <div className="text-xs text-muted-foreground mt-0.5">Visa & Mastercard accepted. Secure 3D checkout.</div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${method === 'card' ? 'border-primary' : 'border-border'}`}>
              {method === 'card' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </button>
        </div>

        {method === 'mpesa' && (
          <form onSubmit={handleMpesaPay} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">M-Pesa Phone Number</label>
              <div className="flex">
                <span className="bg-input border border-border border-r-0 rounded-l-xl px-4 py-4 text-muted-foreground font-bold flex items-center">+254</span>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-r-xl px-4 py-4 text-lg font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground" 
                  placeholder="712 345 678" 
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground mt-3">An STK prompt will be sent to your phone to enter your PIN.</p>
            </div>
            
            <button 
               type="submit" 
               disabled={status === 'pending'}
               className="w-full bg-primary text-primary-foreground font-bold text-lg rounded-xl py-4 mt-4 hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === 'pending' ? (
                 <>
                   <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                   Waiting for M-Pesa PIN...
                 </>
              ) : (
                <>Pay {creator.price.replace('/mo', '')} <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        )}

        {method === 'card' && (
          <div className="text-center p-8 border border-dashed border-border rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold mb-2">Card Payments Coming Soon</h3>
            <p className="text-sm text-muted-foreground">For this prototype, please select M-Pesa to experience the flow.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default Checkout;
