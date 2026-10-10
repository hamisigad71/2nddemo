import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Phone, Coins, CreditCard, ExternalLink, Loader2, AlertCircle, ShieldAlert, XCircle } from 'lucide-react';
import { submitPesapalOrder } from '../lib/pesapal';
import { initiateStkPush, checkStkStatus, formatPhone } from '../lib/daraja';
import { processPayment, getUserProfile } from '../lib/db';
import { useAuth } from '../context/AuthContext';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  creatorId?: string;
}

type Step =
  | 'auth_error'
  | 'amount'
  | 'phone_setup'
  | 'method'
  | 'pesapal_iframe'
  | 'mpesa_confirm'
  | 'mpesa_waiting'
  | 'pesapal_loading'
  | 'success'
  | 'failed';

export default function TipModal({ isOpen, onClose, creatorName, creatorId = 'creator-default' }: TipModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pesapalUrl, setPesapalUrl] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Waiting for payment...');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user phone on open
  useEffect(() => {
    if (isOpen && user) {
      if (user.id === creatorId) {
        setErrorMessage('You cannot send a tip to your own creator account.');
        setStep('auth_error');
        return;
      }
      getUserProfile(user.id).then(profile => {
        if (profile?.phone) setPhone(profile.phone);
      }).catch(err => console.error('Error fetching user profile phone:', err));
    }
  }, [isOpen, user, creatorId]);

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
        if (amount && user) {
          try {
            await processPayment('tip', user.id, creatorId, amount, checkoutRequestId);
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
  }, [step, checkoutRequestId]);

  if (!isOpen) return null;

  const handleAmountSelect = (val: number) => {
    if (!user) {
      setErrorMessage('Please sign in to send a tip to ' + creatorName);
      setStep('auth_error');
      return;
    }
    setAmount(val);
    if (!phone || phone.trim().length < 9) {
      setStep('phone_setup');
    } else {
      setStep('method');
    }
  };

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
    if (!amount || !user) return;
    setStep('mpesa_waiting');
    setStatusMsg('Sending STK prompt to phone...');
    setErrorMessage(null);
    setPollCount(0);

    const result = await initiateStkPush(
      phone,
      amount,
      `Tip for ${creatorName}`
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
    if (!amount || !user) return;
    setStep('pesapal_loading');
    setErrorMessage(null);

    const referenceId = `TIP-${Date.now()}`;
    try {
      await processPayment('tip', user.id, creatorId, amount, referenceId);
      const order = await submitPesapalOrder({
        id: referenceId,
        currency: 'KES',
        amount,
        description: `Tip for ${creatorName}`,
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
      setStep('amount');
      setAmount(null);
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
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative bg-background border border-border/40 rounded-3xl w-full ${step === 'pesapal_iframe' ? 'max-w-xl' : 'max-w-sm'} overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200`}>
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary/50" />

        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={step === 'pesapal_iframe' ? 'p-4' : 'p-6 md:p-8'}>

          {/* Auth Error */}
          {step === 'auth_error' && (
            <div className="animate-in slide-in-from-right-4 duration-300 text-center py-4">
              <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold mb-2">Authorization Notice</h2>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {errorMessage || 'You must be signed in to perform this action.'}
              </p>
              <button onClick={handleClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl transition-all">
                Understand & Close
              </button>
            </div>
          )}

          {/* Amount Selection */}
          {step === 'amount' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                <Coins className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black mb-1">Send a Tip</h2>
              <p className="text-muted-foreground text-sm font-medium mb-6">
                Show your support for <span className="text-primary font-bold">{creatorName}</span>
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[100, 200, 500, 1000].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAmountSelect(val)}
                    className="p-4 rounded-2xl border border-border/50 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 transition-all group relative overflow-hidden active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 font-bold text-lg group-hover:text-primary transition-colors">KES {val}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phone Setup */}
          {step === 'phone_setup' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold mb-1">M-Pesa Number Required</h2>
              <p className="text-muted-foreground text-sm font-medium mb-6 leading-relaxed">
                Enter your Safaricom number for the <span className="text-primary font-bold">KES {amount}</span> tip.
              </p>
              {errorMessage && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{errorMessage}
                </div>
              )}
              <form onSubmit={handleSavePhone}>
                <div className="mb-6 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel" required placeholder="07XX XXX XXX"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-muted/40 border border-border/50 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold tracking-wide"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]">
                  Continue to Payment
                </button>
              </form>
            </div>
          )}

          {/* Payment Method */}
          {step === 'method' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold mb-1">Select Payment Method</h2>
              <p className="text-muted-foreground text-sm font-medium mb-4">
                Paying <span className="text-foreground font-bold">KES {amount}</span> to {creatorName}
              </p>
              {errorMessage && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{errorMessage}
                </div>
              )}
              <div className="space-y-4 mb-6">
                <button
                  onClick={handlePesapalCheckout}
                  className="w-full relative overflow-hidden p-4 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 hover:from-primary/10 transition-all flex items-center justify-between text-left group active:scale-[0.98] shadow-sm hover:shadow-primary/10"
                >
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-primary/30 flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-105 transition-transform duration-300 overflow-hidden p-1.5">
                      <img src="https://www.pesapal.com/media/118158/pesapal-logo.png?v=3" alt="Pesapal" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-foreground flex items-center gap-2 tracking-tight">
                        Pesapal Express 
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 tracking-wide">M-Pesa, Airtel & Cards</div>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition-all relative z-10 group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => setStep('mpesa_confirm')}
                  className="w-full relative overflow-hidden p-4 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/40 hover:from-emerald-500/10 transition-all flex items-center justify-between text-left group active:scale-[0.98] shadow-sm hover:shadow-emerald-500/10"
                >
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-emerald-500/30 shadow-inner group-hover:scale-105 transition-transform duration-300 overflow-hidden p-1.5">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-foreground flex items-center gap-2 tracking-tight">
                        Prompt my phone
                        <Phone className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 tracking-wide font-medium">To {formatPhone(phone)}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* M-Pesa Confirm Screen */}
          {step === 'mpesa_confirm' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="text-emerald-500 font-black text-2xl tracking-tight mb-2">M-PESA</div>
              <h2 className="text-xl font-bold mb-1">Pay KES {amount}</h2>
              <p className="text-muted-foreground text-sm font-medium mb-6">
                STK prompt will be sent to <span className="font-bold text-foreground">{phone}</span>.
              </p>
              <form onSubmit={handleDarajaSTK}>
                <div className="mb-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel" required placeholder="07XX XXX XXX"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-muted/40 border border-border/50 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold tracking-wide"
                  />
                </div>
                <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400">
                  📱 A payment prompt will appear on your phone. Enter your <strong>M-Pesa PIN</strong> to complete.
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]">
                  Send STK Prompt Now →
                </button>
              </form>
            </div>
          )}

          {/* M-Pesa Waiting / Polling Screen */}
          {step === 'mpesa_waiting' && (
            <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-300">
              {/* Animated ring */}
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Phone className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2 text-emerald-500">Waiting for M-Pesa...</h3>
              <p className="text-muted-foreground text-sm text-center max-w-[240px] mb-2">
                {statusMsg}
              </p>
              <p className="text-muted-foreground text-xs text-center">
                Check <span className="font-bold text-foreground">{phone}</span> and enter your PIN.
              </p>
              {pollCount > 0 && (
                <div className="mt-4 flex gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${i < pollCount ? 'bg-emerald-500' : 'bg-muted'}`}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep('method'); }}
                className="mt-8 text-xs text-muted-foreground underline hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Pesapal Loading */}
          {step === 'pesapal_loading' && (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-300">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h3 className="text-lg font-bold mb-1 text-foreground">Loading Pesapal Payment...</h3>
              <p className="text-muted-foreground text-xs text-center">Preparing secure payment screen for KES {amount}.</p>
            </div>
          )}

          {/* Pesapal Iframe */}
          {step === 'pesapal_iframe' && pesapalUrl && (
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-3 pr-8">
                <div>
                  <h3 className="font-bold text-base text-foreground">Pesapal Secure Payment</h3>
                  <p className="text-xs text-muted-foreground">Complete payment below for KES {amount}</p>
                </div>
              </div>
              <div className="w-full h-[520px] rounded-2xl overflow-hidden bg-white shadow-inner">
                <iframe src={pesapalUrl} className="w-full h-full border-0" title="Pesapal Checkout" />
              </div>
              <div className="mt-3 flex justify-between items-center text-xs">
                <button onClick={() => setStep('success')} className="bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl hover:bg-emerald-600 transition-all">
                  Done Payment
                </button>
                <a href={pesapalUrl} target="_blank" rel="noreferrer" className="text-primary underline flex items-center gap-1 font-medium">
                  Open full page <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Failed Screen */}
          {step === 'failed' && (
            <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-50 duration-500">
              <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black mb-2">Payment Failed</h3>
              <p className="text-muted-foreground text-sm font-medium mb-6 text-center max-w-[240px]">
                {errorMessage || 'Something went wrong. Please try again.'}
              </p>
              <button
                onClick={() => { setStep('method'); setErrorMessage(null); }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Success Screen */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-50 duration-500">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black mb-2">Tip Sent! 🎉</h3>
              <p className="text-muted-foreground text-sm font-medium mb-6 text-center max-w-[220px]">
                Thank you for supporting {creatorName}!
              </p>
              <button onClick={handleClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98]">
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
