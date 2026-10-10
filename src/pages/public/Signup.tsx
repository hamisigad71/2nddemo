import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, ArrowRight, RefreshCw } from 'lucide-react';

const Signup = () => {
  const [accountType, setAccountType] = useState('creator'); // 'subscriber' or 'creator'
  const { user, signInWithGoogle, signInWithFacebook, signUpWithEmail, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Only auto-redirect if OTP step is not active or user is confirmed
  useEffect(() => {
    if (user && !otpStep) {
      if (accountType === 'creator') {
        navigate('/dashboard');
      } else {
        navigate('/user');
      }
    }
  }, [user, navigate, accountType, otpStep]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(accountType);
    } catch (err: any) {
      setError('Failed: ' + (err?.message || err));
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithFacebook(accountType);
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
      setLoading(true);
      const fullPhone = `+254${phone.replace(/\s+/g, '').replace(/^0/, '')}`;
      await signUpWithEmail(email, password, `${firstName} ${lastName}`, fullPhone, accountType);
      // Move to OTP step
      setOtpStep(true);
    } catch (err: any) {
      setError('Registration failed: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }
    try {
      setError('');
      setLoading(true);
      await verifyOtp(email, otpCode.trim());
      navigate(accountType === 'creator' ? '/dashboard' : '/user');
    } catch (err: any) {
      setError('Invalid or expired OTP code: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setError('');
      const fullPhone = `+254${phone.replace(/\s+/g, '').replace(/^0/, '')}`;
      await signUpWithEmail(email, password, `${firstName} ${lastName}`, fullPhone, accountType);
      alert('Verification code resent to ' + email);
    } catch (err: any) {
      setError('Failed to resend code: ' + (err?.message || err));
    }
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0a0b0e] text-white">
      <div className="flex-1 flex items-center justify-center p-4 py-12 lg:py-16 order-2 lg:order-1">
        <div className="w-full max-w-lg bg-[#0d0e12] border border-zinc-800 p-8 pb-10 rounded-3xl shadow-2xl relative z-10">
        
        {/* Step 2: OTP Code Verification Screen */}
        {otpStep ? (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-950/60 border border-red-500/40 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Check Your Email</h2>
              <p className="text-zinc-400 text-sm">
                We've sent a 6-digit verification code to <strong className="text-white">{email}</strong>
              </p>
            </div>

            {error && <div className="text-red-400 text-sm font-bold bg-red-950/50 border border-red-500/30 p-3.5 rounded-xl text-center mb-6">{error}</div>}

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2 text-zinc-400 text-center">Enter 6-Digit Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={otpCode} 
                  onChange={e => setOtpCode(e.target.value)} 
                  className="w-full bg-[#14161d] border border-zinc-800 rounded-2xl px-4 py-4 text-center text-3xl font-black tracking-[0.4em] text-white focus:border-red-500 focus:outline-none" 
                  placeholder="123456" 
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl py-4 transition-all border border-red-500 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Verify & Complete Registration <ArrowRight className="w-5 h-5" /></>}
              </button>

              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium pt-2">
                <button 
                  type="button" 
                  onClick={() => setOtpStep(false)}
                  className="hover:text-white transition-colors"
                >
                  ← Back to details
                </button>
                <button 
                  type="button" 
                  onClick={handleResendOtp}
                  className="text-red-500 font-bold hover:text-red-400 transition-colors"
                >
                  Resend code
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Step 1: Initial Registration Form */
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black mt-2 mb-2 text-white">Create an Account</h2>
              <p className="text-zinc-400 text-sm">Join the premium Kenyan creator platform</p>
            </div>
            
            <div className="flex gap-2 mb-8 bg-[#14161d] p-1.5 rounded-2xl border border-zinc-800">
              <button 
                type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-colors ${accountType === 'subscriber' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setAccountType('subscriber')}
              >
                I'm a Subscriber
              </button>
              <button 
                type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-colors ${accountType === 'creator' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setAccountType('creator')}
              >
                I'm a Creator
              </button>
            </div>

            {error && <div className="text-red-400 text-sm font-bold bg-red-950/50 border border-red-500/30 p-3.5 rounded-xl text-center mb-4">{error}</div>}

            <div className="grid grid-cols-2 gap-3 mb-6">
               <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 border border-zinc-800 bg-[#14161d] py-3 rounded-xl hover:bg-zinc-800 font-bold transition-colors text-sm text-white">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.993 10.993 0 0012 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <span>Google</span>
               </button>
               <button onClick={handleFacebookSignIn} className="w-full flex items-center justify-center gap-2 border border-[#1877F2]/20 bg-[#1877F2]/10 text-[#1877F2] py-3 rounded-xl hover:bg-[#1877F2]/20 font-bold transition-colors text-sm">
                  <img src="https://i.pinimg.com/736x/0f/16/7c/0f167cb2b6ffa10d8672c17ec8aea8f5.jpg" alt="Facebook" className="w-5 h-5 flex-shrink-0 rounded-full object-cover" />
                  <span>Facebook</span>
               </button>
            </div>

            <div className="relative mb-6">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
               <div className="relative flex justify-center text-sm"><span className="bg-[#0d0e12] px-2 text-zinc-500 font-medium">or</span></div>
            </div>
            
            <form className="flex flex-col gap-4" onSubmit={handleSignup}>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">First Name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-[#14161d] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="Kamau" />
                 </div>
                 <div>
                    <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">Last Name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-[#14161d] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="Mwangi" />
                 </div>
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">Phone Number (M-Pesa)</label>
                <div className="flex">
                  <span className="bg-[#181a22] border border-zinc-800 border-r-0 rounded-l-xl px-4 py-3 text-zinc-400 text-sm flex items-center font-bold">+254</span>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#14161d] border border-zinc-800 rounded-r-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="712 345 678" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#14161d] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="name@example.com" />
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#14161d] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="Create a strong password" />
              </div>
              
              <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-black rounded-xl py-3.5 mt-2 transition-all shadow-lg shadow-red-600/20 border border-red-500 flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (accountType === 'creator' ? 'Apply as Creator' : 'Create Account')}
              </button>
            </form>
            
            <div className="mt-8 text-center text-sm text-zinc-400">
              Already have an account? <Link to="/login" className="text-red-500 font-bold hover:underline">Log in</Link>
            </div>
          </div>
        )}

      </div>
      </div>
      
      {/* Creative Image Section */}
      <div className="flex w-full min-h-[65vh] lg:min-h-0 lg:w-[45%] xl:w-[50%] relative items-end p-8 pt-48 lg:p-16 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-black overflow-hidden order-1 lg:order-2">
        <img 
          src="/pic1.webp" 
          alt="Creative Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 object-top"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
        <div className="relative z-10 max-w-md">
          <div className="w-12 h-1 bg-red-600 mb-6 rounded-full"></div>
          <p className="text-lg text-zinc-300 font-medium">Join The Gents Dollhouse and connect with premium creators defining the future of storytelling.</p>
        </div>
      </div>
    </div>
  );
};
export default Signup;
