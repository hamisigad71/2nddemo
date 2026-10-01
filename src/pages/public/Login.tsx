import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const Login = () => {
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle('subscriber');
      navigate('/dashboard'); // route depending on role, fallback to dashboard
    } catch (err) {
      setError('Failed to sign in with Google');
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithFacebook('subscriber');
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to sign in with Facebook');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col-reverse lg:flex-row bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-4 py-12 lg:py-16">
        <div className="w-full max-w-md bg-input/10 border border-border p-8 pb-10 rounded-3xl shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold tracking-tighter text-primary">Hideaway<span className="text-muted-foreground">.</span></Link>
          <h2 className="text-2xl font-bold mt-6 mb-2 text-foreground">Welcome Back</h2>
          <p className="text-muted-foreground text-sm">Enter your credentials to access your account</p>
        </div>
        
        {error && <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-lg text-center mb-4">{error}</div>}

        <div className="grid grid-cols-2 gap-3 mb-6">
           <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 border border-border bg-background py-3 rounded-xl hover:bg-muted font-bold shadow-sm transition-colors text-sm">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.993 10.993 0 0012 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span>Google</span>
           </button>
           <button onClick={handleFacebookSignIn} className="w-full flex items-center justify-center gap-2 border border-[#1877F2]/20 bg-[#1877F2]/10 text-[#1877F2] py-3 rounded-xl hover:bg-[#1877F2]/20 font-bold shadow-sm transition-colors text-sm">
              <img src="https://i.pinimg.com/736x/98/39/6a/98396a0075923b69838d31ba316051e2.jpg" alt="Facebook" className="w-5 h-5 flex-shrink-0 rounded-full object-cover" />
              <span>Facebook</span>
           </button>
        </div>

        <div className="relative mb-6">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
           <div className="relative flex justify-center text-sm"><span className="bg-input/10 px-2 text-muted-foreground">or</span></div>
        </div>
        
        <form className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Email or Phone via M-Pesa</label>
            <input 
              type="text" 
              placeholder="e.g. 0712345678 or name@example.com"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground text-sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">Password</label>
              <a href="#" className="text-xs text-primary font-medium hover:underline">Forgot password?</a>
            </div>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground text-sm"
            />
          </div>
          
          <button className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 mt-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20">
            Sign In
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/signup" className="text-primary font-bold hover:underline">Sign up</Link>
        </div>
      </div>
      </div>
      
      {/* Creative Image Section */}
      <div className="flex w-full min-h-[65vh] lg:min-h-0 lg:w-[45%] xl:w-[50%] relative items-end p-8 pt-48 lg:p-16 border-t lg:border-t-0 lg:border-l border-border bg-black overflow-hidden">
        <img 
          src="/pic2.png" 
          alt="Creative Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 object-top" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
        <div className="relative z-10 max-w-md">
          <div className="w-12 h-1 bg-primary mb-6 rounded-full"></div>

          <p className="text-lg text-muted-foreground">Continue building, growing, and experiencing the finest creative work from the continent.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
