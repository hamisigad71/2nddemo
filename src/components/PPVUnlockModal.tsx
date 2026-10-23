import { useState, useEffect, useRef } from 'react';
import { X, Lock, CheckCircle2, Phone, Crown, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, processPayment } from '../lib/db';
import { toast } from '../context/ToastContext';

export interface PPVMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  duration?: string;
  photoCount?: number;
  title: string;
  price: number;
  isLocked: boolean;
  visibility?: 'public' | 'subscribers' | 'ppv';
}

interface PPVUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: PPVMediaItem | null;
  creatorName: string;
  creatorId: string;
  monthlyPrice: number;
  onUnlocked: (mediaId: string) => void;
  onSubscribeClick: () => void;
  onViewNow?: (mediaItem: PPVMediaItem) => void;
}

type Step = 'choose' | 'phone' | 'waiting' | 'success' | 'failed';

export default function PPVUnlockModal({
  isOpen,
  onClose,
  mediaItem,
  creatorName,
  creatorId,
  monthlyPrice,
  onUnlocked,
  onSubscribeClick,
  onViewNow,
}: PPVUnlockModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('choose');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Waiting for M-Pesa...');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user's phone on open & check suspension
  useEffect(() => {
    if (isOpen && user) {
      setStep('choose');
      setErrorMessage(null);

      if (mediaItem?.creatorId && !mediaItem.creatorId.startsWith('creator-')) {
        getUserProfile(mediaItem.creatorId).then(cp => {
          if (cp?.status === 'suspended' || cp?.status === 'banned' || cp?.role === 'suspended_creator') {
            setErrorMessage('Unlocks are disabled because this creator account is currently suspended.');
          }
        }).catch(() => {});
      }

      getUserProfile(user.id).then((profile) => {
        if (profile?.status === 'suspended' || profile?.status === 'banned') {
          setErrorMessage('Your account is currently suspended and cannot unlock Pay-Per-View items.');
        } else if (profile?.phone) {
          setPhone(profile.phone);
        }
      }).catch(() => {});
    }
  }, [isOpen, user, mediaItem]);

  // Poll PayHero for STK payment completion
  useEffect(() => {
    if (step !== 'waiting' || !checkoutRequestId || !mediaItem) return;

    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      setPollCount(count);
      setStatusMsg(`Verifying payment... (${count}/12)`);

      try {
        const { checkPaymentStatus } = await import('../lib/payments');
        const status = await checkPaymentStatus(checkoutRequestId);
        if (status.paid) {
          clearInterval(pollRef.current!);
          if (!user) {
            setErrorMessage('Sign in to unlock this content.');
            setStep('failed');
            return;
          }
          try {
            await processPayment('ppv', user.id, creatorId, mediaItem.price, checkoutRequestId, mediaItem.id);
          } catch (err) {
            console.error('Error saving PPV transaction:', err);
            setErrorMessage(err instanceof Error ? err.message : 'Payment was received but content access could not be saved. Please contact support.');
            setStep('failed');
            return;
          }
          onUnlocked(mediaItem.id);
          setStep('success');
          toast.success(`Unlocked "${mediaItem.title}"!`);
          return;
        }
      } catch (err) {
        console.warn('PPV status poll error:', err);
      }

      if (count >= 12) {
        clearInterval(pollRef.current!);
        setErrorMessage('Payment confirmation timed out. If you entered your PIN, please refresh.');
        setStep('failed');
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, checkoutRequestId, mediaItem, user, creatorId, onUnlocked]);

  if (!isOpen || !mediaItem) return null;

  const handleStartUnlock = () => {
    setStep('phone');
  };

  const handleSendSTK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 9) {
      setErrorMessage('Please enter a valid Safaricom phone number (e.g. 07XXXXXXXX)');
      return;
    }

    setStep('waiting');
    setStatusMsg('Sending M-Pesa STK push to phone...');
    setErrorMessage(null);
    setPollCount(0);

    try {
      const { initiateSTKPush } = await import('../lib/payments');
      const res = await initiateSTKPush({
        amount: mediaItem.price,
        phone_number: phone,
        customer_name: user?.user_metadata?.name || user?.email || 'Customer',
        external_reference: `PPV-${Date.now()}`,
      });

      if (res.success && (res.reference || res.CheckoutRequestID)) {
        setCheckoutRequestId(res.reference || res.CheckoutRequestID || 'ppv-ref');
        setStatusMsg('Enter your M-Pesa PIN on your phone...');
        return;
      }

      setErrorMessage(res.error || 'Failed to send M-Pesa prompt. Check your phone number.');
      setStep('failed');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error sending payment request.');
      setStep('failed');
    }
  };

  const handlePaystackUnlock = async () => {
    if (!user) {
      setErrorMessage('Sign in to unlock this content.');
      setStep('failed');
      return;
    }
    if (!mediaItem) return;

    try {
      const { initiatePaystackCardPayment, verifyPaystackTransaction } = await import('../lib/paystack');
      await initiatePaystackCardPayment({
        email: user.email || 'customer@thegentsdollhouse.com',
        amount: mediaItem.price,
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'Subscriber',
        currency: 'KES',
        metadata: {
          creator_id: creatorId,
          creator_name: creatorName,
          media_id: mediaItem.id,
          media_title: mediaItem.title,
          type: 'ppv',
        },
        onSuccess: async ({ reference }) => {
          onUnlocked(mediaItem.id);
          setStep('success');
          toast.success(`Unlocked "${mediaItem.title}"!`);
          try {
            await verifyPaystackTransaction(reference);
            await processPayment('ppv', user.id, creatorId, mediaItem.price, reference, mediaItem.id);
          } catch (err: any) {
            console.warn('PPV record notice:', err);
          }
        },
        onError: (err) => {
          setErrorMessage(err || 'Card payment could not be completed.');
          setStep('failed');
        },
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize Paystack');
      setStep('failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#0D0E12] border border-white/15 rounded-3xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Preview */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden relative shrink-0">
            {mediaItem.type === 'video' || mediaItem.url?.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i) ? (
              <video
                src={mediaItem.url}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover filter blur-[2px] opacity-70 pointer-events-none"
              />
            ) : (
              <img src={mediaItem.url} alt="thumbnail" className="w-full h-full object-cover filter blur-[2px] opacity-70" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Lock className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              {mediaItem.type === 'video' ? `Video · ${mediaItem.duration || 'Full'}` : `Photoset · ${mediaItem.photoCount || 1} photos`}
            </span>
            <h3 className="font-bold text-base text-white mt-1 leading-tight">{mediaItem.title}</h3>
            <p className="text-xs text-zinc-400">by {creatorName}</p>
          </div>
        </div>

        {/* Step: Choose Option */}
        {step === 'choose' && (
          <div className="space-y-4">
            <div className="text-center py-1">
              <p className="text-sm text-zinc-300">
                Choose how you would like to unlock this exclusive content:
              </p>
            </div>

            {/* Option 1: Unlock with M-Pesa */}
            <div
              onClick={handleStartUnlock}
              className="p-4 rounded-2xl bg-black border border-white/15 hover:border-red-500/60 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <span className="font-extrabold text-sm text-white group-hover:text-red-400 transition-colors">
                    Unlock with M-Pesa
                  </span>
                </div>
                <span className="font-black text-red-500 text-base">
                  KES {mediaItem.price.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pay instantly via M-Pesa STK Push prompt to your phone.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-red-400">
                <span>Instant M-Pesa STK</span> →
              </div>
            </div>

            {/* Option 2: Unlock with Card (Paystack) */}
            <div
              onClick={handlePaystackUnlock}
              className="p-4 rounded-2xl bg-black border border-white/15 hover:border-red-500/60 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="font-extrabold text-sm text-white group-hover:text-red-400 transition-colors">
                    Unlock with Card
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase">Paystack</span>
                </div>
                <span className="font-black text-red-500 text-base">
                  KES {mediaItem.price.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pay securely with Visa, Mastercard, or Verve card.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-red-400">
                <span>Instant Card Checkout</span> →
              </div>
            </div>

            {/* Option 2: Monthly VIP Subscription */}
            <div
              onClick={() => {
                onClose();
                onSubscribeClick();
              }}
              className="p-4 rounded-2xl bg-gradient-to-br from-red-950/40 via-black to-zinc-950 border border-red-500/30 hover:border-red-500/70 transition-all cursor-pointer group shadow-xl"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="font-extrabold text-sm text-white">
                    Unlock ALL Content (VIP Access)
                  </span>
                </div>
                <span className="font-black text-white text-base">
                  KES {monthlyPrice.toLocaleString()}<span className="text-xs text-zinc-400">/mo</span>
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Unlock all 200+ exclusive videos, photos, and direct messaging with {creatorName}.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                <span>Best Value · VIP Monthly Pass</span> →
              </div>
            </div>
          </div>
        )}

        {/* Step: Enter Phone */}
        {step === 'phone' && (
          <form onSubmit={handleSendSTK} className="space-y-4">
            <div className="text-center">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Unlock for KES {mediaItem.price.toLocaleString()}
              </p>
              <h4 className="font-black text-lg text-white">Enter M-Pesa Phone Number</h4>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium text-center">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                M-Pesa Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full pl-10 pr-4 py-3 bg-black border border-white/15 focus:border-red-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-zinc-600 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl transition-all shadow-[0_4px_20px_rgba(220,38,38,0.4)] active:scale-95 text-sm uppercase tracking-wider cursor-pointer"
            >
              Pay KES {mediaItem.price.toLocaleString()} via M-Pesa
            </button>

            <button
              type="button"
              onClick={() => setStep('choose')}
              className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              ← Back to options
            </button>
          </form>
        )}

        {/* Step: Waiting for PIN */}
        {step === 'waiting' && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                <Phone className="w-8 h-8 text-red-500" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black animate-ping" />
            </div>

            <div>
              <h4 className="text-lg font-black text-white mb-1">Check Your Phone</h4>
              <p className="text-sm text-zinc-300">{statusMsg}</p>
              <p className="text-xs text-zinc-500 mt-2">
                Sent prompt for <strong className="text-white">KES {mediaItem.price}</strong> to <strong className="text-white">{phone}</strong>
              </p>
            </div>

            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-red-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, (pollCount / 12) * 100)}%` }}
              />
            </div>

            <div className="flex flex-col items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  setStep('phone');
                }}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Change Number
              </button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-2 inline-block">
                Specific Card Unlocked
              </span>
              <h4 className="text-xl font-black text-white mb-1">Payment Successful!</h4>
              <p className="text-sm text-zinc-300 font-medium">
                "{mediaItem.title}" is now unlocked for your account.
              </p>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Only this specific card has been unlocked. All other exclusive media remains locked unless subscribed for KES {monthlyPrice.toLocaleString()}/mo.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onViewNow && mediaItem) {
                  onViewNow(mediaItem);
                }
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-600/30 cursor-pointer text-sm uppercase tracking-wider"
            >
              View Unlocked Card Now
            </button>
          </div>
        )}

        {/* Step: Failed */}
        {step === 'failed' && (
          <div className="py-4 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
              <X className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-1">Payment Failed</h4>
              <p className="text-xs text-zinc-400">{errorMessage || 'Unable to complete M-Pesa transaction.'}</p>
            </div>
            <button
              onClick={() => setStep('phone')}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
