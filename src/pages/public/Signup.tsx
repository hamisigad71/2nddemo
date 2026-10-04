import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Signup = () => {
  const [accountType, setAccountType] = useState('creator'); // 'subscriber' or 'creator'
  const { user, signInWithGoogle, signInWithFacebook, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      if (accountType === 'creator') {
        navigate('/dashboard');
      } else {
        navigate('/user');
      }
    }
  }, [user, navigate, accountType]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(accountType);
      navigate(accountType === 'creator' ? '/dashboard' : '/user'); 
    } catch (err: any) {
      setError('Failed: ' + (err?.message || err));
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithFacebook(accountType);
      navigate(accountType === 'creator' ? '/dashboard' : '/user');
    } catch (err: any) {
      setError('Failed: ' + (err?.message || err));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !phone) {
      setError("Please fill out all fields.");
      return;
    }
    try {
      setError('');
      const fullPhone = `+254${phone.replace(/\s+/g, '').replace(/^0/, '')}`;
      await signUpWithEmail(email, password, `${firstName} ${lastName}`, fullPhone, accountType);
      navigate(accountType === 'creator' ? '/dashboard' : '/user');
    } catch (err: any) {
      setError('Registration failed: ' + (err?.message || err));
    }
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-4 py-12 lg:py-16 order-2 lg:order-1">
        <div className="w-full max-w-lg bg-input/10 border border-border p-8 pb-10 rounded-3xl shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="text-center mb-8">
          
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

        {error && <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-lg text-center mb-4">{error}</div>}

        <div className="grid grid-cols-2 gap-3 mb-6">
           <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 border border-border bg-background py-3 rounded-xl hover:bg-muted font-bold shadow-sm transition-colors text-sm">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.993 10.993 0 0012 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span>Google</span>
           </button>
           <button onClick={handleFacebookSignIn} className="w-full flex items-center justify-center gap-2 border border-[#1877F2]/20 bg-[#1877F2]/10 text-[#1877F2] py-3 rounded-xl hover:bg-[#1877F2]/20 font-bold shadow-sm transition-colors text-sm">
              <img src="https://i.pinimg.com/736x/0f/16/7c/0f167cb2b6ffa10d8672c17ec8aea8f5.jpg" alt="Facebook" className="w-5 h-5 flex-shrink-0 rounded-full object-cover" />
              <span>Facebook</span>
           </button>
        </div>

        <div className="relative mb-6">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
           <div className="relative flex justify-center text-sm"><span className="bg-input/10 px-2 text-muted-foreground">or</span></div>
        </div>
        
        <form className="flex flex-col gap-5" onSubmit={handleSignup}>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="Kamau" />
             </div>
             <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="Mwangi" />
             </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Phone Number (M-Pesa)</label>
            <div className="flex">
              <span className="bg-muted border border-border border-r-0 rounded-l-xl px-4 py-3 text-muted-foreground text-sm flex items-center font-medium">+254</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-background border border-border rounded-r-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="712 345 678" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Required for {accountType === 'creator' ? 'receiving payouts' : 'frictionless payments'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="name@example.com" />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" placeholder="Create a strong password" />
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
      
      {/* Creative Image Section */}
      <div className="flex w-full min-h-[65vh] lg:min-h-0 lg:w-[45%] xl:w-[50%] relative items-end p-8 pt-48 lg:p-16 border-t lg:border-t-0 lg:border-l border-border bg-black overflow-hidden order-1 lg:order-2">
        <img 
          src="/pic1.webp" 
          alt="Creative Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 object-top"
          loading="eager"
          fetchPriority="high"
          decoding="sync"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
        <div className="relative z-10 max-w-md">
          <div className="w-12 h-1 bg-primary mb-6 rounded-full"></div>
          
          <p className="text-lg text-muted-foreground">Join Hideaway and connect with premium creators defining the future of storytelling.</p>
        </div>
      </div>
    </div>
  );
};
export default Signup;
