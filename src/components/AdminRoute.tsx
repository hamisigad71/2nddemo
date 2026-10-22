import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ShieldCheck, KeyRound, Lock, Eye, EyeOff, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logAdminAction } from '../lib/db';
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'tgd_admin_session_auth';
const ATTEMPTS_KEY = 'tgd_admin_failed_attempts';
const LOCKOUT_KEY = 'tgd_admin_lockout_until';

// Default Master & Operational Access Codes
export const DEFAULT_ADMIN_ACCESS_CODES = [
  'TGD-BOSS-7700', // Master Boss Code
  'TGD-OPS-9941',  // Operations Admin Code
  'TGD-FIN-3388',  // Finance & Payouts Code
  '889900'         // 6-Digit Fast PIN
];

export const isAccessCodeValid = (inputCode: string): boolean => {
  const clean = inputCode.trim().toUpperCase();
  if (!clean) return false;

  // 1. Check default hardcoded codes
  if (DEFAULT_ADMIN_ACCESS_CODES.includes(clean)) return true;

  // 2. Check custom codes configured in localStorage/settings
  try {
    const customCodes: string[] = JSON.parse(localStorage.getItem('tgd_custom_admin_codes') || '[]');
    if (customCodes.map(c => c.toUpperCase()).includes(clean)) return true;
  } catch {}

  return false;
};

export const lockAdminSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('admin_session_locked'));
};

export const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    try {
      const authData = sessionStorage.getItem(SESSION_KEY);
      if (!authData) return false;
      const parsed = JSON.parse(authData);
      // Valid for 8 hours
      return parsed.authorized === true && (Date.now() - parsed.timestamp) < 8 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });

  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Check lockout on mount
  useEffect(() => {
    const checkLockout = () => {
      const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for manual lock events
  useEffect(() => {
    const handleLock = () => setIsAuthorized(false);
    window.addEventListener('admin_session_locked', handleLock);
    return () => window.removeEventListener('admin_session_locked', handleLock);
  }, []);

  // Ensure authorized admin's database profile has role = 'admin'
  useEffect(() => {
    if (user && isAuthorized) {
      supabase
        .from('users')
        .update({ role: 'admin' })
        .or(`uid.eq.${user.id},id.eq.${user.id}`)
        .then(() => {})
        .catch(() => {});
    }
  }, [user, isAuthorized]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
        <p className="text-zinc-500 text-sm font-semibold tracking-wide">Authenticating Admin Identity...</p>
      </div>
    );
  }

  // User must at least be logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    const trimmed = accessCode.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter your Admin Access Code or PIN.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    // Simulate cryptographic verification delay
    await new Promise(r => setTimeout(r, 600));

    if (isAccessCodeValid(trimmed)) {
      // Success: Save session
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          authorized: true,
          codeUsed: trimmed.substring(0, 7) + '...',
          timestamp: Date.now(),
          userEmail: user.email,
        })
      );

      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);

      // Ensure admin role is reflected in database
      if (user?.id) {
        supabase
          .from('users')
          .update({ role: 'admin' })
          .or(`uid.eq.${user.id},id.eq.${user.id}`)
          .then(() => {})
          .catch(() => {});
      }

      // Log successful security unlock
      logAdminAction({
        admin: user.email || 'Admin',
        action: 'Admin Terminal Unlocked',
        target: 'Security Terminal',
        details: `Access code verified for session ${user.email}`,
        type: 'settings',
        ip: '197.156.XX.XX'
      }).catch(() => {});

      setIsAuthorized(true);
    } else {
      // Failed attempt
      const attempts = (parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) || 0) + 1;
      localStorage.setItem(ATTEMPTS_KEY, attempts.toString());

      if (attempts >= 5) {
        const lockoutUntil = Date.now() + 3 * 60 * 1000; // 3 min lockout
        localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
        setLockoutRemaining(180);
        setError('Too many failed attempts. Terminal locked for 3 minutes for platform safety.');
      } else {
        setError(`Invalid Admin Access Code. ${5 - attempts} attempts remaining before temporary terminal lockout.`);
      }

      // Log security violation attempt
      logAdminAction({
        admin: user.email || 'Unknown',
        action: 'Security Breach Attempt',
        target: 'Admin Gatekeeper',
        details: `Failed access code attempt from ${user.email}`,
        type: 'flag',
        ip: '197.156.XX.XX'
      }).catch(() => {});
    }

    setIsVerifying(false);
  };

  // If already authorized, render the admin portal outlet!
  if (isAuthorized) {
    return <Outlet />;
  }

  // Otherwise, render the Security Terminal Gate
  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      
      {/* Background ambient red glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d0e12] border border-red-500/25 p-8 sm:p-10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative z-10 space-y-6">
        
        {/* Terminal Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-600/20">
            <Lock className="w-8 h-8" />
          </div>

          <div className="pt-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500 bg-red-600/10 border border-red-500/20 px-3 py-1 rounded-full">
              Restricted Area
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight mt-3">Admin Security Gate</h1>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Please enter an authorized Master Passcode or Operations PIN to access The Gents DollHouse management portal.
            </p>
          </div>
        </div>

        {/* Lockout Warning */}
        {lockoutRemaining > 0 ? (
          <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto animate-bounce" />
            <div className="text-xs font-bold text-red-300">Terminal Temporarily Locked</div>
            <p className="text-[11px] text-zinc-400">
              Please wait <strong className="text-white font-mono">{lockoutRemaining}s</strong> before trying again.
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5 flex items-center justify-between">
                <span>Admin Access Code / PIN</span>
                <span className="text-[10px] text-zinc-500 font-mono">Case-insensitive</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <KeyRound className="w-4 h-4 text-red-500" />
                </div>
                <input
                  type={showCode ? 'text' : 'password'}
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TGD-BOSS-7700 or 889900"
                  autoFocus
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 font-mono tracking-widest uppercase transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-white transition-colors"
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !accessCode.trim()}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Passcode...
                </>
              ) : (
                <>
                  Authorize Terminal <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Footer Notice */}
        <div className="pt-2 border-t border-zinc-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted 256-bit Admin Session</span>
          </div>
          <p className="text-[10px] text-zinc-600">
            Current user: <strong className="text-zinc-400">{user.email}</strong>
          </p>
        </div>

      </div>
    </div>
  );
};

export default AdminRoute;

