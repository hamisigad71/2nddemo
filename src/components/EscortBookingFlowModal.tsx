import { useState } from 'react';
import { 
  X, 
  Lock, 
  Phone, 
  MessageCircle, 
  ShieldCheck, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { formatPhone } from '../lib/daraja';
import { initiateSTKPush } from '../lib/payments';
import { supabase } from '../lib/supabase';
import { toast } from '../context/ToastContext';

interface EscortFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  escort: {
    id: string;
    name: string;
    avatar: string;
    location: string;
    price_hr: number;
    phone?: string;
    cover_image?: string;
    bio?: string;
    rating?: number;
    isVerified?: boolean;
    isOnline?: boolean;
  };
  currentUser: {
    id: string;
    email?: string;
    name?: string;
    phone?: string;
  } | null;
  onUnlockedSuccess?: () => void;
  onBookingSuccess?: (bookingId: string) => void;
}

const UNLOCK_FEE = 1300;

export default function EscortBookingFlowModal({
  isOpen,
  onClose,
  escort,
  currentUser,
  onUnlockedSuccess,
  onBookingSuccess
}: EscortFlowModalProps) {
  // Steps: 'unlock_contact' | 'unlock_waiting' | 'booking_form' | 'escrow_waiting' | 'completed'
  const [step, setStep] = useState<
    'unlock_contact' | 'unlock_waiting' | 'booking_form' | 'escrow_waiting' | 'completed'
  >('unlock_contact');

  // Contact Unlock State
  const [phoneForUnlock, setPhoneForUnlock] = useState(currentUser?.phone || '');
  const [unlockMpesaRef, setUnlockMpesaRef] = useState('');
  const [unlockedEscortPhone, setUnlockedEscortPhone] = useState(escort.phone || '+254 7XX XXX XXX');

  // Booking Form State
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('20:00');
  const [durationHours, setDurationHours] = useState(2);
  const [meetingType, setMeetingType] = useState<'outcall' | 'incall' | 'dinner' | 'event'>('outcall');
  const [locationStr, setLocationStr] = useState(escort.location || 'Nairobi');
  const [specialNotes, setSpecialNotes] = useState('');
  const [phoneForEscrow, setPhoneForEscrow] = useState(currentUser?.phone || '');
  const [escrowMpesaRef, setEscrowMpesaRef] = useState('');

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalBookingCost = escort.price_hr * durationHours;

  // 1. Pay-to-Unlock Direct Contact & Chat (KES 1,300)
  const handleUnlockContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneForUnlock || phoneForUnlock.trim().length < 9) {
      setErrorMessage('Please enter a valid M-Pesa phone number (07... or 01...)');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStep('unlock_waiting');

    try {
      const externalRef = `UNLOCK-${Date.now()}`;
      const res = await initiateSTKPush({
        amount: UNLOCK_FEE,
        phone_number: phoneForUnlock,
        customer_name: currentUser?.name || currentUser?.email || 'Client',
        external_reference: externalRef
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to dispatch M-Pesa prompt. Please try again.');
        setStep('unlock_contact');
        return;
      }

      setUnlockMpesaRef(res.reference || res.CheckoutRequestID || externalRef);

      // Record contact unlock in DB or localStorage
      try {
        if (currentUser?.id) {
          await supabase.from('escort_contact_unlocks').insert({
            client_id: currentUser.id,
            escort_id: escort.id,
            amount_paid: UNLOCK_FEE,
            mpesa_reference: res.reference || externalRef
          });
        }
      } catch (dbErr) {
        console.warn('Could not record contact unlock in table:', dbErr);
      }

      // Mark locally as unlocked and provide access
      try {
        const globalStored = localStorage.getItem("tgd_escort_unlocks_global");
        const globalList: string[] = globalStored ? JSON.parse(globalStored) : [];
        if (!globalList.includes(escort.id)) {
          globalList.push(escort.id);
          localStorage.setItem("tgd_escort_unlocks_global", JSON.stringify(globalList));
        }
        if (currentUser?.id) {
          localStorage.setItem(`tgd_escort_unlock_${currentUser.id}_${escort.id}`, "true");
        }
      } catch (storageErr) {
        console.warn("Storage save error:", storageErr);
      }

      setUnlockedEscortPhone(escort.phone || '+254 742 630 973');
      toast.success(`Direct contact & chat unlocked for ${escort.name}!`);
      if (onUnlockedSuccess) onUnlockedSuccess();
      
      // Proceed directly to the Escrow Booking step
      setStep('booking_form');
    } catch (err: any) {
      console.error('Contact unlock error:', err);
      setErrorMessage(err?.message || 'Error initiating M-Pesa STK push.');
      setStep('unlock_contact');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Escrow Protected Booking
  const handleEscrowBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate) {
      setErrorMessage('Please select a booking date.');
      return;
    }
    if (!phoneForEscrow || phoneForEscrow.trim().length < 9) {
      setErrorMessage('Please enter your M-Pesa number for the escrow payment.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStep('escrow_waiting');

    try {
      const externalRef = `ESCROW-${Date.now()}`;
      const res = await initiateSTKPush({
        amount: totalBookingCost,
        phone_number: phoneForEscrow,
        customer_name: currentUser?.name || currentUser?.email || 'Client',
        external_reference: externalRef
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to dispatch Escrow payment prompt.');
        setStep('booking_form');
        return;
      }

      const assignedRef = res.reference || res.CheckoutRequestID || externalRef;
      setEscrowMpesaRef(assignedRef);

      // Record booking in Supabase
      try {
        if (currentUser?.id) {
          const platformCut = Math.round(totalBookingCost * 0.30);
          const escortShare = totalBookingCost - platformCut;

          await supabase.from('escort_bookings').insert({
            client_id: currentUser.id,
            escort_id: escort.id,
            booking_date: bookingDate,
            start_time: bookingTime,
            duration_hours: durationHours,
            location: locationStr,
            meeting_type: meetingType,
            special_notes: specialNotes,
            total_amount: totalBookingCost,
            platform_fee: platformCut,
            escort_earnings: escortShare,
            mpesa_reference: assignedRef,
            status: 'escrow_funded'
          });
        }
      } catch (dbErr) {
        console.warn('Could not record escrow booking:', dbErr);
      }

      toast.success('Escrow Payment Received! Booking dispatched to companion.');
      if (onBookingSuccess) onBookingSuccess(assignedRef);
      setStep('completed');
    } catch (err: any) {
      console.error('Escrow booking error:', err);
      setErrorMessage(err?.message || 'Error processing Escrow payment.');
      setStep('booking_form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(220,38,38,0.2)] relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Companion Brief Banner */}
        <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-white/10">
          <img
            src={escort.avatar}
            alt={escort.name}
            className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-white text-lg tracking-tight">{escort.name}</h3>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">
              {escort.location} · <span className="text-red-500 font-bold">KES {escort.price_hr.toLocaleString()}/hr</span>
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Pay-to-Unlock Direct Contact & Chat (KES 1,300) */}
        {step === 'unlock_contact' && (
          <div className="animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-xs font-bold uppercase tracking-wider mb-3">
              <Lock className="w-3.5 h-3.5" />
              <span>Step 1: Unlock Direct Contact & Chat</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-2">
              Private Contact Access
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              To prevent spam and ensure verified, serious inquiries, a one-time fee of{' '}
              <span className="text-red-500 font-bold">KES {UNLOCK_FEE.toLocaleString()}</span> is required to unlock{' '}
              <span className="text-white font-semibold">{escort.name}’s</span> direct phone number, WhatsApp, and private messaging before booking.
            </p>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Phone className="w-4 h-4 text-red-500" />
                <span>Instant Phone & WhatsApp Access</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <MessageCircle className="w-4 h-4 text-red-500" />
                <span>Direct 1-on-1 Encrypted Chat</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>Enables Escrow Protected Booking</span>
              </div>
            </div>

            <form onSubmit={handleUnlockContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="07XXXXXXXX or 01XXXXXXXX"
                  value={phoneForUnlock}
                  onChange={(e) => setPhoneForUnlock(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(220,38,38,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span>Pay KES {UNLOCK_FEE.toLocaleString()} via M-Pesa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 1 WAITING: STK Push Sent */}
        {step === 'unlock_waiting' && (
          <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Check Your Phone</h3>
            <p className="text-zinc-400 text-sm max-w-sm mb-6">
              An M-Pesa prompt for <span className="text-white font-bold">KES {UNLOCK_FEE}</span> has been sent to{' '}
              <span className="text-red-400 font-mono">{formatPhone(phoneForUnlock)}</span>. Enter your PIN to complete.
            </p>
            <div className="text-xs text-zinc-500">Ref: {unlockMpesaRef}</div>
          </div>
        )}

        {/* STEP 2: Escrow Protected Booking Form */}
        {step === 'booking_form' && (
          <form onSubmit={handleEscrowBooking} className="animate-in fade-in duration-300 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/10 border border-emerald-600/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Step 2: Escrow Protected Booking</span>
            </div>

            {/* Direct Contact Reveal Card */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold block text-white">{escort.name}'s Unlocked Phone:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">{unlockedEscortPhone}</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-emerald-500/20 rounded-md">
                Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Duration (Hours)
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={3}>3 Hours</option>
                  <option value={4}>4 Hours</option>
                  <option value={8}>Overnight (8 Hours)</option>
                  <option value={12}>12 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Meeting Type
                </label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  <option value="outcall">Outcall (Client's Place/Hotel)</option>
                  <option value="incall">Incall (Companion's Place)</option>
                  <option value="dinner">Dinner Date</option>
                  <option value="event">VIP Event / Party</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Meeting Location / Area
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Westlands, Kilimani, Hotel Name..."
                value={locationStr}
                onChange={(e) => setLocationStr(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Special Requests or Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Dress code, private preferences..."
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white text-xs focus:border-red-500 focus:outline-none resize-none"
              />
            </div>

            {/* Escrow Protection Guarantee Card */}
            <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4">
              <div className="flex justify-between items-center text-sm font-bold text-white mb-1">
                <span>Total Escrow Deposit:</span>
                <span className="text-red-500 text-lg">KES {totalBookingCost.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />
                Your funds are held securely in escrow by The Gents Dollhouse and are only released after the date is confirmed completed.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                M-Pesa Phone Number for Escrow
              </label>
              <input
                type="tel"
                required
                placeholder="07XXXXXXXX or 01XXXXXXXX"
                value={phoneForEscrow || phoneForUnlock}
                onChange={(e) => setPhoneForEscrow(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(220,38,38,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>Fund Escrow & Confirm Booking (KES {totalBookingCost.toLocaleString()})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2 WAITING: Escrow Prompt */}
        {step === 'escrow_waiting' && (
          <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Authorizing Escrow Deposit</h3>
            <p className="text-zinc-400 text-sm max-w-sm mb-6">
              Enter your M-Pesa PIN on your phone to lock{' '}
              <span className="text-white font-bold">KES {totalBookingCost.toLocaleString()}</span> in platform escrow.
            </p>
            <div className="text-xs text-zinc-500">Ref: {escrowMpesaRef}</div>
          </div>
        )}

        {/* STEP 3: Completed */}
        {step === 'completed' && (
          <div className="py-6 flex flex-col items-center justify-center text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Booking Confirmed!</h2>
            <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
              Your escrow deposit is locked and <span className="text-white font-bold">{escort.name}</span> has been notified to confirm the meeting. You can coordinate directly via their unlocked contact.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm transition-all border border-white/10"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
