import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { checkEmailExists } from '../../lib/db';

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setError('');
      setSuccess(false);
      setLoading(true);
      
      const emailExists = await checkEmailExists(email);
      if (!emailExists) {
        setError('Email not registered');
        setLoading(false);
        return;
      }

      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-4 py-12 lg:py-16 order-2 lg:order-1">
        <div className="w-full max-w-md bg-input/10 border border-border p-8 pb-10 rounded-3xl shadow-2xl relative z-10 backdrop-blur-xl">
          <div className="text-center mb-8">
            <Link to="/" className="text-3xl font-bold tracking-tighter text-primary">Hideaway<span className="text-muted-foreground">.</span></Link>
            <h2 className="text-2xl font-bold mt-6 mb-2 text-foreground">Reset Your Password</h2>
            <p className="text-muted-foreground text-sm">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-lg text-center mb-4 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Check Your Email</h3>
              <p className="text-muted-foreground text-sm mb-6">
                We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>. 
                Click the link in the email to create a new password.
              </p>
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-left text-sm text-muted-foreground mb-6">
                <p className="font-semibold text-foreground mb-2">Didn't get the email?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>
              <button
                onClick={() => { setSuccess(false); setEmail(''); }}
                className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20"
              >
                Try Another Email
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground text-sm"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 mt-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Remember your password? <Link to="/login" className="text-primary font-bold hover:underline">Back to Login</Link>
          </div>
        </div>
      </div>

      {/* Creative Image Section */}
      <div className="flex w-full min-h-[65vh] lg:min-h-0 lg:w-[45%] xl:w-[50%] relative items-end p-8 pt-48 lg:p-16 border-t lg:border-t-0 lg:border-l border-border bg-black overflow-hidden order-1 lg:order-2">
        <img 
          src="/pic2.png" 
          alt="Creative Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 object-top" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
        <div className="relative z-10 max-w-md">
          <div className="w-12 h-1 bg-primary mb-6 rounded-full"></div>
          <p className="text-lg text-muted-foreground">Your account security matters. Reset your password to get back to creating and discovering.</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
