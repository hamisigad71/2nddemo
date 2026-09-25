import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
  const [accountType, setAccountType] = useState('creator'); // 'subscriber' or 'creator'
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (accountType === 'creator') {
      navigate('/dashboard');
    } else {
      navigate('/user');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground py-12">
      <div className="w-full max-w-lg bg-input/10 border border-border p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold tracking-tighter text-primary">Hideaway<span className="text-muted-foreground">.</span></Link>
          <h2 className="text-2xl font-bold mt-6 mb-2 text-foreground">Create an Account</h2>
          <p className="text-muted-foreground text-sm">Join the premium Kenyan creator platform</p>
        </div>
        
        <div className="flex gap-2 mb-8 bg-background p-1 rounded-xl border border-border">
          <button 
            type="button"
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${accountType === 'subscriber' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setAccountType('subscriber')}
          >
            I'm a Subscriber
          </button>
          <button 
            type="button"
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${accountType === 'creator' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setAccountType('creator')}
          >
            I'm a Creator
          </button>
        </div>
        
        <form className="flex flex-col gap-5" onSubmit={handleSignup}>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">First Name</label>
                <input type="text" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="Kamau" />
             </div>
             <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Last Name</label>
                <input type="text" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="Mwangi" />
             </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Phone Number (M-Pesa)</label>
            <div className="flex">
              <span className="bg-muted border border-border border-r-0 rounded-l-xl px-4 py-3 text-muted-foreground text-sm flex items-center font-medium">+254</span>
              <input type="tel" className="w-full bg-background border border-border rounded-r-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="712 345 678" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Required for {accountType === 'creator' ? 'receiving payouts' : 'frictionless payments'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Email Address</label>
            <input type="email" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="name@example.com" />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Password</label>
            <input type="password" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="Create a strong password" />
          </div>
          
          <button className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 mt-4 hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20">
            {accountType === 'creator' ? 'Apply as Creator' : 'Create Account'}
          </button>
          
          <p className="text-xs text-center text-muted-foreground mt-2">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
};
export default Signup;
