import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, ArrowRight, RefreshCw, AlertTriangle, Eye, EyeOff, ShieldCheck, Camera, UploadCloud, CheckCircle2, FileCheck, Check } from 'lucide-react';
import { toast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabase, getStoredCreatorProfile } from '../../lib/db';

const DISPOSABLE_OR_DUMMY_DOMAINS = new Set([
  'test.com', 'example.com', 'dummy.com', 'fake.com', 'invalid.com', 'none.com',
  'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
  'guerrillamail.com', 'yopmail.com', 'trashmail.com', 'fakeinbox.com',
  'throwawaymail.com', 'getnada.com', 'maildrop.cc', 'sharklasers.com',
  'dispostable.com', 'mailnesia.com', 'tempmailaddress.com', 'burnermail.io',
]);

const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'hotmial.com': 'hotmail.com',
};

function validateEmailAddress(rawEmail: string): string | null {
  const trimmed = rawEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@([^\s@]+\.[a-zA-Z]{2,})$/;
  const match = trimmed.match(emailRegex);
  if (!match) {
    return 'Please enter a valid email address (e.g. name@gmail.com).';
  }

  const domain = match[1];
  if (DOMAIN_TYPOS[domain]) {
    return `This email domain looks misspelled ("@${domain}"). Did you mean "@${DOMAIN_TYPOS[domain]}"? Please use a real email address.`;
  }

  if (DISPOSABLE_OR_DUMMY_DOMAINS.has(domain)) {
    return 'Dummy or temporary email addresses are not allowed. Please enter a real, active email address.';
  }

  return null;
}

function formatSignupErrorMessage(err: any, email: string): string {
  const raw = String(err?.message || err || '').trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes('error sending confirmation email') ||
    lower.includes('error sending confirmation mail')
  ) {
    return `Supabase email delivery rate limit reached for "${email.trim()}". Supabase's free built-in email service only allows 3 emails per hour. To fix this: sign up with Google above, or turn off "Confirm email" in your Supabase Dashboard (Authentication → Providers → Email) for instant registration.`;
  }

  if (
    lower.includes('unable to validate email') ||
    lower.includes('invalid email') ||
    lower.includes('mailbox unavailable') ||
    lower.includes('recipient') ||
    lower.includes('undeliverable')
  ) {
    return `We could not deliver a verification code to "${email.trim()}". Please double-check your email address.`;
  }

  if (lower.includes('already registered') || lower.includes('already exists')) {
    return `An account with ${email.trim()} already exists. Please log in with your password.`;
  }

  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
    return 'Too many email attempts in the last hour (Supabase limit). Please wait a few minutes, use Google Sign-In, or log in if you already have an account.';
  }

  return raw || 'Registration failed. Please check your details and try again.';
}

const Signup = () => {
  const [accountType, setAccountType] = useState('creator'); // 'subscriber' or 'creator'
  const { user, signInWithGoogle, signInWithFacebook, signUpWithEmail, signInWithEmail, verifyOtp } = useAuth();
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
  const [showPassword, setShowPassword] = useState(false);

  // Mandatory Creator KYC verification fields
  const [legalName, setLegalName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dob, setDob] = useState('');
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string>('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>('');

  const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return 0;
    const birth = new Date(birthDateString);
    if (isNaN(birth.getTime())) return 0;
    const diffMs = Date.now() - birth.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleIdDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdDocFile(file);
      const reader = new FileReader();
      reader.onload = () => setIdDocPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfieFile(file);
      const reader = new FileReader();
      reader.onload = () => setSelfiePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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

    const emailError = validateEmailAddress(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (accountType === 'creator') {
      if (!legalName.trim()) {
        setError("Legal Full Name is strictly required (must match your government ID & M-Pesa).");
        return;
      }
      if (!nationalId.trim()) {
        setError("National ID or Passport number is strictly required.");
        return;
      }
      if (!dob) {
        setError("Please enter your Date of Birth. Creators must be 18+.");
        return;
      }
      const age = calculateAge(dob);
      if (age < 18) {
        setError("You must be at least 18 years of age to register as a creator.");
        return;
      }
      if (!idDocFile) {
        setError("Strict verification required: Please upload a clear photo of your National ID or Passport.");
        return;
      }
      if (!selfieFile) {
        setError("Strict verification required: Please upload a live selfie photo holding your ID next to your face.");
        return;
      }
    }

    try {
      setError('');
      setLoading(true);
      const cleanEmail = email.trim();
      const fullPhone = `+254${phone.replace(/\s+/g, '').replace(/^0/, '')}`;
      const result: any = await signUpWithEmail(cleanEmail, password, `${firstName} ${lastName}`, fullPhone, accountType);
      
      // If user already exists in Supabase
      if (result?.isExistingUser) {
        setError(`An account with ${cleanEmail} already exists. Please log in with your password.`);
        return;
      }

      const uid = result?.id || result?.uid || result?.user?.id || user?.id;

      if (accountType === 'creator') {
        let uploadedIdUrl = idDocPreview;
        let uploadedSelfieUrl = selfiePreview;

        if (uid && idDocFile && selfieFile) {
          try {
            const idExt = idDocFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
            const selfieExt = selfieFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
            const idPath = `kyc/${uid}/${Date.now()}-id.${idExt}`;
            const selfiePath = `kyc/${uid}/${Date.now()}-selfie.${selfieExt}`;

            const [idUploaded, selfieUploaded] = await Promise.all([
              uploadFileToSupabase(idDocFile, 'kyc-documents', idPath),
              uploadFileToSupabase(selfieFile, 'kyc-documents', selfiePath)
            ]);

            if (idUploaded) uploadedIdUrl = idUploaded;
            if (selfieUploaded) uploadedSelfieUrl = selfieUploaded;

            await supabase.from('users').update({
              legal_name: legalName.trim(),
              national_id_number: nationalId.trim(),
              dob: dob,
              kyc_id_url: uploadedIdUrl,
              kyc_selfie_url: uploadedSelfieUrl,
              kyc_status: 'pending',
              is_verified: false
            }).eq('uid', uid);

            await supabase.from('creator_profiles').upsert({
              user_id: uid,
              legal_name: legalName.trim(),
              national_id_number: nationalId.trim(),
              dob: dob,
              kyc_id_url: uploadedIdUrl,
              kyc_selfie_url: uploadedSelfieUrl,
              kyc_status: 'pending',
              is_verified: false
            }, { onConflict: 'user_id' });

            const local = getStoredCreatorProfile(uid) || {};
            localStorage.setItem(`tgd_creator_profile_${uid}`, JSON.stringify({
              ...local,
              legalName: legalName.trim(),
              nationalId: nationalId.trim(),
              dob: dob,
              kyc_id_url: uploadedIdUrl,
              kyc_selfie_url: uploadedSelfieUrl,
              kyc_status: 'pending',
              is_verified: false
            }));
          } catch (uploadErr) {
            console.warn('KYC file persistence notice:', uploadErr);
          }
        }

        // Cache pending KYC for email OTP/link fallback
        localStorage.setItem('pending_creator_kyc', JSON.stringify({
          legalName: legalName.trim(),
          nationalId: nationalId.trim(),
          dob,
          idUrl: uploadedIdUrl,
          selfieUrl: uploadedSelfieUrl,
          email: cleanEmail
        }));
      }

      // If session exists (email confirmation disabled in Supabase), user is already logged in!
      if (result?.hasSession || result?.session) {
        toast.success(
          accountType === 'creator'
            ? 'Creator application submitted! Documents are pending admin review.'
            : 'Registration successful! Welcome.'
        );
        navigate(accountType === 'creator' ? '/dashboard' : '/user');
        return;
      }

      // Move to confirmation / OTP step
      setOtpStep(true);
    } catch (err: any) {
      setError(formatSignupErrorMessage(err, email));
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPasswordLogin = async () => {
    if (!email || !password) {
      navigate('/login');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await signInWithEmail(email, password);
      navigate(accountType === 'creator' ? '/dashboard' : '/user');
    } catch (err: any) {
      setError(err?.message || 'Login failed. If you clicked the email link, please visit the Login page.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = otpCode.replace(/\s+/g, '').trim();
    if (!cleanToken || cleanToken.length < 6) {
      setError("Please enter the complete verification code from your email.");
      return;
    }
    try {
      setError('');
      setLoading(true);
      const verifiedUser: any = await verifyOtp(email, cleanToken);

      // Flush pending KYC if available
      try {
        const pendingKycRaw = localStorage.getItem('pending_creator_kyc');
        if (pendingKycRaw) {
          const kyc = JSON.parse(pendingKycRaw);
          const vUid = verifiedUser?.id || verifiedUser?.uid || user?.id;
          if (vUid) {
            await supabase.from('users').update({
              legal_name: kyc.legalName,
              national_id_number: kyc.nationalId,
              dob: kyc.dob,
              kyc_id_url: kyc.idUrl,
              kyc_selfie_url: kyc.selfieUrl,
              kyc_status: 'pending',
              is_verified: false
            }).eq('uid', vUid);

            await supabase.from('creator_profiles').upsert({
              user_id: vUid,
              legal_name: kyc.legalName,
              national_id_number: kyc.nationalId,
              dob: kyc.dob,
              kyc_id_url: kyc.idUrl,
              kyc_selfie_url: kyc.selfieUrl,
              kyc_status: 'pending',
              is_verified: false
            }, { onConflict: 'user_id' });

            const local = getStoredCreatorProfile(vUid) || {};
            localStorage.setItem(`tgd_creator_profile_${vUid}`, JSON.stringify({
              ...local,
              legalName: kyc.legalName,
              nationalId: kyc.nationalId,
              dob: kyc.dob,
              kyc_id_url: kyc.idUrl,
              kyc_selfie_url: kyc.selfieUrl,
              kyc_status: 'pending',
              is_verified: false
            }));

            localStorage.removeItem('pending_creator_kyc');
          }
        }
      } catch (flushErr) {
        console.warn('Could not flush pending KYC after OTP:', flushErr);
      }

      toast.success(
        accountType === 'creator'
          ? 'Registration and verification documents submitted! Awaiting admin approval.'
          : 'Registration successful! Welcome.'
      );
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
      await signUpWithEmail(email.trim(), password, `${firstName} ${lastName}`, fullPhone, accountType);
      toast.success('Code resent', {
        description: `A new verification code was sent to ${email.trim()}.`
      });
    } catch (err: any) {
      setError(formatSignupErrorMessage(err, email));
    }
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0a0b0e] text-white">
      <div className="flex-1 flex items-center justify-center p-4 py-12 lg:py-16 order-2 lg:order-1">
        <div className="w-full max-w-lg bg-[#0d0e12] border border-zinc-800 p-8 pb-10 rounded-3xl shadow-2xl relative z-10">
        
        {/* Step 2: OTP Code Verification Screen */}
        {otpStep ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-950/60 border border-red-500/40 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/10">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Check Your Email</h2>
              <p className="text-zinc-400 text-sm">
                We've sent a verification email to <strong className="text-white">{email}</strong>
              </p>
            </div>

            {/* Helpful instructions for Supabase link vs code */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 mb-6 space-y-2 text-xs text-zinc-300">
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span>Please check your <strong>Spam / Junk</strong> or <strong>Promotions</strong> folder if not in primary inbox.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span>If your email contains a <strong>Confirmation Link / Button</strong>, click it in your email to instantly activate your account.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span>If your email contains a <strong>6-digit code</strong>, enter it below:</span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/40 rounded-2xl p-4 mb-6">
                <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-red-400 font-black text-xs uppercase tracking-wider mb-1">Notice</div>
                  <div className="text-red-300/90 text-sm font-medium leading-relaxed break-words">{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2 text-zinc-400 text-center">Enter Verification Code</label>
                <input 
                  type="text" 
                  maxLength={12}
                  value={otpCode} 
                  onChange={e => setOtpCode(e.target.value.replace(/\s+/g, ''))} 
                  className="w-full bg-[#0d0e12] border border-zinc-800 rounded-2xl px-4 py-4 text-center text-3xl font-black tracking-[0.25em] text-white focus:border-red-500 focus:outline-none" 
                  placeholder="Code from email" 
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl py-4 transition-all border border-red-500 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Verify & Complete Registration <ArrowRight className="w-5 h-5" /></>}
              </button>

              <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-3 text-center">
                <button
                  type="button"
                  onClick={handleDirectPasswordLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Already confirmed via link? Sign In with Password →
                </button>

                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium px-1">
                  <button 
                    type="button" 
                    onClick={() => setOtpStep(false)}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    ← Back to details
                  </button>
                  <button 
                    type="button" 
                    onClick={handleResendOtp}
                    className="text-red-500 font-bold hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Resend email
                  </button>
                </div>
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
            
            <div className="flex gap-2 mb-8 bg-[#0d0e12] p-1.5 rounded-2xl border border-zinc-800">
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

            {error && (
              <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/40 rounded-2xl p-4 mb-4">
                <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-red-400 font-black text-xs uppercase tracking-wider mb-1">Notice</div>
                  <div className="text-red-300/90 text-sm font-medium leading-relaxed break-words">{error}</div>
                  {error.includes('already exists') && (
                    <div className="mt-3 pt-3 border-t border-red-500/20 flex flex-wrap gap-2">
                      <Link 
                        to={`/login?email=${encodeURIComponent(email.trim())}`}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        Log In With Password
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
               <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 border border-zinc-800 bg-[#0d0e12] py-3 rounded-xl hover:bg-zinc-800 font-bold transition-colors text-sm text-white">
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
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="Kamau" />
                 </div>
                 <div>
                    <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">Last Name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="Mwangi" />
                 </div>
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">Phone Number (M-Pesa)</label>
                <div className="flex">
                  <span className="bg-[#0d0e12] border border-zinc-800 border-r-0 rounded-l-xl px-4 py-3 text-zinc-400 text-sm flex items-center font-bold">+254</span>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#0d0e12] border border-zinc-800 rounded-r-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="712 345 678" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="name@example.com" />
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-4 py-3 pr-11 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" placeholder="Create a strong password" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Creator-only Mandatory Identity Verification Fields */}
              {accountType === 'creator' && (
                <div className="pt-4 mt-2 border-t border-zinc-800 space-y-4">
                  <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider mb-1">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Mandatory Creator Verification (KYC)
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                      Under Kenya regulations and platform trust policy, creators must provide government identity and a selfie holding their ID to unlock the official <strong>Blue Verification Badge 👑</strong>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                        Legal Full Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={legalName} 
                        onChange={e => setLegalName(e.target.value)} 
                        className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" 
                        placeholder="As on National ID" 
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">Must match M-Pesa registered name</span>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                        National ID / Passport <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={nationalId} 
                        onChange={e => setNationalId(e.target.value)} 
                        className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600 text-sm" 
                        placeholder="e.g. 12345678" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date" 
                      value={dob} 
                      onChange={e => setDob(e.target.value)} 
                      max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none text-sm" 
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">You must be 18+ to register as a creator</span>
                  </div>

                  {/* Required Uploads: ID Document & Selfie holding ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* 1. National ID Upload */}
                    <div className="border border-dashed border-zinc-700 hover:border-red-500/60 rounded-2xl p-4 bg-zinc-900/40 relative flex flex-col items-center justify-center text-center transition-all group overflow-hidden min-h-[140px]">
                      <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        onChange={handleIdDocSelect} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                      />
                      {idDocPreview ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          <img src={idDocPreview} alt="ID preview" className="w-full h-24 object-cover rounded-xl mb-1.5" />
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ID Attached
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-0.5">Click to replace</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-white mb-0.5">Upload ID Document <span className="text-red-500">*</span></div>
                          <div className="text-[10px] text-zinc-400">Front & Back of National ID or Passport</div>
                        </>
                      )}
                    </div>

                    {/* 2. Selfie Upload */}
                    <div className="border border-dashed border-zinc-700 hover:border-red-500/60 rounded-2xl p-4 bg-zinc-900/40 relative flex flex-col items-center justify-center text-center transition-all group overflow-hidden min-h-[140px]">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="user" 
                        onChange={handleSelfieSelect} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                      />
                      {selfiePreview ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          <img src={selfiePreview} alt="Selfie preview" className="w-full h-24 object-cover rounded-xl mb-1.5" />
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Selfie Attached
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-0.5">Click to replace</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-white mb-0.5">Upload Selfie with ID <span className="text-red-500">*</span></div>
                          <div className="text-[10px] text-zinc-400">Holding ID next to your face clearly</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-black rounded-xl py-3.5 mt-2 transition-all shadow-lg shadow-red-600/20 border border-red-500 flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (accountType === 'creator' ? 'Apply & Submit Verification' : 'Create Account')}
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
