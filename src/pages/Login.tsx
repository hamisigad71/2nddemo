import { Link } from 'react-router-dom';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md bg-input/10 border border-border p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold tracking-tighter text-primary">MALI<span className="text-muted-foreground">.</span></Link>
          <h2 className="text-2xl font-bold mt-6 mb-2 text-foreground">Welcome Back</h2>
          <p className="text-muted-foreground text-sm">Enter your credentials to access your account</p>
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
  );
};

export default Login;
