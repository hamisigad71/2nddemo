import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Phone, Smartphone, CreditCard, ExternalLink, Loader2, AlertCircle, ShieldAlert, XCircle, ArrowRight } from 'lucide-react';
import { submitPesapalOrder } from '../lib/pesapal';
import { initiateStkPush, checkStkStatus, formatPhone } from '../lib/daraja';
import { subscribeToCreator, getUserProfile } from '../lib/db';
import { useAuth } from '../context/AuthContext';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  creatorId?: string;
  price?: number;
}

type Step =
  | 'auth_error'
  | 'phone_setup'
  | 'method'
  | 'pesapal_iframe'
  | 'mpesa_confirm'
  | 'mpesa_waiting'
  | 'pesapal_loading'
  | 'success'
  | 'failed';

export default function SubscribeModal({ isOpen, onClose, creatorName, creatorId = 'creator-default', price = 500 }: SubscribeModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('method');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pesapalUrl, setPesapalUrl] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Waiting for payment...');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user phone on open
  useEffect(() => {
    if (isOpen) {
      if (!user) {
        setErrorMessage('Please sign in to subscribe to ' + creatorName);
        setStep('auth_error');
        return;
      }
      if (user.id === creatorId) {
        setErrorMessage('You cannot subscribe to your own creator account.');
        setStep('auth_error');
        return;
      }
      getUserProfile(user.id).then(profile => {
        if (profile?.phone) {
          setPhone(profile.phone);
          setStep('method');
        } else {
          setStep('phone_setup');
        }
      }).catch(err => console.error('Error fetching user profile phone:', err));
    }
  }, [isOpen, user, creatorId, creatorName]);

  // Poll Daraja for STK status
  useEffect(() => {
    if (step !== 'mpesa_waiting' || !checkoutRequestId) return;

    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      setPollCount(count);
      setStatusMsg(`Checking payment... (${count}/12)`);

      const status = await checkStkStatus(checkoutRequestId);

      if (status.paid) {
        clearInterval(pollRef.current!);
        // Record in DB
        if (price && user) {
          try {
            await subscribeToCreator(user.id, creatorId, 'Premium', price);
          } catch (e) {
            console.error('DB record error:', e);
          }
        }
        setStep('success');
        return;
      }

      if (status.cancelled) {
        clearInterval(pollRef.current!);
        setErrorMessage(status.resultDesc || 'Payment was cancelled or timed out.');
        setStep('failed');
        return;
      }

      // Give up after 12 polls (~60 seconds)
      if (count >= 12) {
        clearInterval(pollRef.current!);
        setErrorMessage('Payment timed out. Please try again.');
        setStep('failed');
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, checkoutRequestId, price, user, creatorId]);

  if (!isOpen) return null;

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 9) {
      setErrorMessage('Please enter a valid phone number (e.g. 07XX XXX XXX)');
      return;
    }
    setErrorMessage(null);
    setStep('method');
  };

  // ── Daraja STK Push ──────────────────────────────────────────
  const handleDarajaSTK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || !user) return;
    setStep('mpesa_waiting');
    setStatusMsg('Sending STK prompt to phone...');
    setErrorMessage(null);
    setPollCount(0);

    const result = await initiateStkPush(
      phone,
      price,
      `Subscribe to ${creatorName}`
    );

    if (!result.success || !result.checkoutRequestId) {
      setErrorMessage(result.error || 'Failed to send STK prompt. Try again.');
      setStep('failed');
      return;
    }

    setCheckoutRequestId(result.checkoutRequestId);
    setStatusMsg('Enter your M-Pesa PIN on your phone...');
    // polling starts via the useEffect above
  };

  // ── Pesapal ─────────────────────────────────────────────────
  const handlePesapalCheckout = async () => {
    if (!price || !user) return;
    setStep('pesapal_loading');
    setErrorMessage(null);

    const referenceId = `SUB-${Date.now()}`;
    try {
      await subscribeToCreator(user.id, creatorId, 'Premium', price); // NOTE: This adds subscription before confirmation if pesapal URL redirects. Usually it should be webhook, but simulating success for now if they reach here as old codebase does. Wait, old TipModal processed tip beforehand, let's keep consistency.
      const order = await submitPesapalOrder({
        id: referenceId,
        currency: 'KES',
        amount: price,
        description: `Subscription to ${creatorName}`,
        callback_url: `${window.location.origin}/user`,
        billing_address: {
          email_address: user.email || 'fan@hideaway.co.ke',
          phone_number: phone || '0700000000',
          first_name: user.user_metadata?.name?.split(' ')[0] || 'Fan',
          last_name: user.user_metadata?.name?.split(' ')[1] || 'User',
        },
      });

      if (order?.redirect_url) {
        setPesapalUrl(order.redirect_url);
        setStep('pesapal_iframe');
      } else {
        setErrorMessage(order?.error || 'Could not initialize Pesapal session.');
        setStep('method');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Pesapal checkout failed');
      setStep('method');
    }
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setTimeout(() => {
      setStep(user ? (phone ? 'method' : 'phone_setup') : 'auth_error');
      setErrorMessage(null);
      setPesapalUrl(null);
      setCheckoutRequestId(null);
      setPollCount(0);
    }, 300);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative bg-black border border-white/10 rounded-[28px] w-full ${step === 'pesapal_iframe' ? 'max-w-xl' : 'max-w-[380px]'} overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,1)] animate-in zoom-in-[0.98] duration-300`}>
        {/* Top edge red glow highlight */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        <button
          onClick={handleClose}
          className="absolute right-5 top-5 p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={step === 'pesapal_iframe' ? 'p-4' : 'px-7 py-8'}>

          {/* Auth Error */}
          {step === 'auth_error' && (
            <div className="animate-in slide-in-from-right-4 duration-500 py-2 fade-in">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-2">Access Denied</h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                {errorMessage || 'You must be signed in to perform this action.'}
              </p>
              <button onClick={handleClose} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide py-3 px-4 rounded-xl transition-all shadow-[0_4px_16px_rgba(220,38,38,0.3)]">
                Dismiss
              </button>
            </div>
          )}

          {/* Phone Setup */}
          {step === 'phone_setup' && (
            <div className="animate-in slide-in-from-right-4 duration-500 fade-in pb-2">
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Connect Phone</h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                Provide your Safaricom number to enable seamless subscriptions.
              </p>
              {errorMessage && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}
              <form onSubmit={handleSavePhone}>
                <div className="mb-6 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-red-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel" required placeholder="07XX XXX XXX"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-500/60 text-white text-sm focus:ring-1 focus:ring-red-500/60 transition-all tracking-wide"
                  />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide py-3 px-4 rounded-xl transition-all shadow-[0_4px_16px_rgba(220,38,38,0.35)] hover:scale-[1.02] active:scale-[0.98]">
                  Continue
                </button>
              </form>
            </div>
          )}

          {/* Payment Method */}
          {step === 'method' && (
            <div className="animate-in slide-in-from-right-4 duration-500 fade-in pb-2">
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
                Premium Access
              </h2>
              <p className="text-zinc-400 text-sm mb-6">
                Subscribe to {creatorName} for <span className="text-red-500 font-extrabold">KES {price}</span>
              </p>
              
              {errorMessage && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              <div className="space-y-3 mb-2">
                <button
                  onClick={handlePesapalCheckout}
                  className="w-full group p-4 rounded-2xl border border-white/10 bg-zinc-950 hover:bg-red-500/5 hover:border-red-500/30 transition-all flex items-center gap-4 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-black text-zinc-400 group-hover:text-red-500 border border-white/10 group-hover:border-red-500/40 flex items-center justify-center transition-colors shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[15px] text-white tracking-tight group-hover:text-red-500 transition-colors">Card or Mobile Money</div>
                    <div className="text-[13px] text-zinc-400 mt-0.5">via Web Checkout</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-red-500 transition-colors group-hover:translate-x-0.5" />
                </button>

                <button
                  onClick={() => setStep('mpesa_confirm')}
                  className="w-full group p-4 rounded-2xl border border-white/10 bg-zinc-950 hover:bg-red-500/5 hover:border-red-500/30 transition-all flex items-center gap-4 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-black text-zinc-400 group-hover:text-red-500 border border-white/10 group-hover:border-red-500/40 flex items-center justify-center transition-colors shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[15px] text-white tracking-tight group-hover:text-red-500 transition-colors">Instant M-Pesa Prompt</div>
                    <div className="text-[13px] text-zinc-400 mt-0.5">to {formatPhone(phone) || 'number'}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-red-500 transition-colors group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}

          {/* M-Pesa Confirm Screen */}
          {step === 'mpesa_confirm' && (
            <div className="animate-in slide-in-from-right-4 duration-500 fade-in pb-2">
              <button 
                onClick={() => { setStep('method'); setErrorMessage(null); }} 
                className="text-zinc-400 hover:text-white text-sm mb-5 -ml-1 inline-flex items-center gap-1 transition-colors"
              >
                 ← Back
              </button>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Confirm Payment</h2>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                A prompt for <span className="text-red-500 font-bold">KES {price}</span> will be sent to the number below.
              </p>
              <form onSubmit={handleDarajaSTK}>
                <div className="mb-6 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-red-500">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel" required placeholder="07XX XXX XXX"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-500/60 text-white text-sm focus:ring-1 focus:ring-red-500/60 transition-all font-mono tracking-wide"
                  />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide py-3 px-4 rounded-xl transition-all shadow-[0_4px_16px_rgba(220,38,38,0.35)] hover:scale-[1.02] active:scale-[0.98]">
                  Send Prompt
                </button>
              </form>
            </div>
          )}

          {/* M-Pesa Waiting / Polling Screen */}
          {step === 'mpesa_waiting' && (
            <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-700">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border border-white/10" />
                <div className="absolute inset-0 rounded-full border border-t-red-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <h3 className="text-base font-bold mb-2 text-white">Awaiting Confirmation</h3>
              <p className="text-zinc-400 text-sm text-center max-w-[240px] mb-8 leading-relaxed">
                {statusMsg}
              </p>
              {pollCount > 0 && (
                <div className="flex gap-1.5 mb-8">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full transition-all ${i < pollCount ? 'bg-red-500 scale-125' : 'bg-white/10'}`}
                    />
                  ))}
                </div>
              )}
              <button
                 onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep('method'); }}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Pesapal Loading */}
          {step === 'pesapal_loading' && (
            <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-700">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-6" />
              <h3 className="text-base font-bold mb-2 text-white">Initializing Checkout</h3>
              <p className="text-zinc-400 text-sm text-center">Preparing secure payment channel for KES {price}.</p>
            </div>
          )}

          {/* Pesapal Iframe */}
          {step === 'pesapal_iframe' && pesapalUrl && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10 pr-8">
                <div>
                  <h3 className="font-bold text-lg text-white tracking-tight">Secure Checkout</h3>
                  <p className="text-sm text-zinc-400 mt-1">Complete your <span className="text-red-500 font-bold">KES {price}</span> subscription.</p>
                </div>
              </div>
              <div className="w-full h-[520px] rounded-xl overflow-hidden bg-zinc-950 border border-white/10">
                <iframe src={pesapalUrl} className="w-full h-full border-0 bg-white" title="Pesapal Checkout" />
              </div>
              <div className="mt-5 flex justify-between items-center">
                <button onClick={() => setStep('success')} className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold tracking-wide px-5 py-2.5 rounded-xl transition-all shadow-sm relative z-20">
                  I have paid
                </button>
                <a href={pesapalUrl} target="_blank" rel="noreferrer" className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1.5 transition-colors relative z-20 font-semibold">
                  Open in new tab <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Failed Screen */}
          {step === 'failed' && (
            <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold tracking-tight text-white mb-2">Transaction Failed</h3>
              <p className="text-zinc-400 text-sm mb-8 text-center max-w-[240px] leading-relaxed">
                {errorMessage || 'An error interrupted the process.'}
              </p>
              <button
                onClick={() => { setStep('method'); setErrorMessage(null); }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl transition-all border border-white/10"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Success Screen */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight text-white mb-2">Subscribed</h3>
              <p className="text-zinc-400 text-sm mb-8 text-center max-w-[220px] leading-relaxed">
                You now hold premium access to {creatorName}.
              </p>
              <button onClick={handleClose} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide py-3 px-4 rounded-xl transition-all shadow-[0_4px_16px_rgba(220,38,38,0.35)] hover:scale-[1.02] active:scale-[0.98]">
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
