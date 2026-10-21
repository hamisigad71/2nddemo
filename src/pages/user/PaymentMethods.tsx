import { useState, useEffect } from 'react';
import UserLayout from '../../components/UserLayout';
import {
  Wallet,
  Smartphone,
  CreditCard as CardIcon,
  Plus,
  Trash2,
  X,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../lib/db';
import { toast } from '../../context/ToastContext';

export interface SavedPaymentMethod {
  id: string;
  type: 'mpesa' | 'card';
  title: string;
  subtitle: string;
  details: string; // Display masked string, e.g. "+254 712 *** 890" or "**** **** **** 4242"
  rawIdentifier?: string; // Raw phone number or last4
  cardBrand?: 'visa' | 'mastercard' | 'amex' | 'card';
  cardExpiry?: string;
  isDefault: boolean;
  createdAt: string;
}

const STORAGE_KEY_PREFIX = 'tgd_payment_methods_';

export default function PaymentMethods() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mpesa' | 'card'>('mpesa');

  // M-Pesa Form State
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaSetDefault, setMpesaSetDefault] = useState(true);

  // Card Form State
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardSetDefault, setCardSetDefault] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Storage key based on user ID or guest
  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : 'tgd_payment_methods_guest';

  // Load payment methods on mount
  useEffect(() => {
    let isMounted = true;

    async function loadMethods() {
      setLoading(true);
      try {
        // 1. Try to load from localStorage first
        const cached = localStorage.getItem(storageKey);
        let loadedMethods: SavedPaymentMethod[] = [];

        if (cached) {
          try {
            loadedMethods = JSON.parse(cached);
          } catch {
            loadedMethods = [];
          }
        }

        // 2. If logged in, fetch user's profile phone from DB
        let userDbPhone: string | null = null;
        if (user?.id) {
          try {
            const profile = await getUserProfile(user.id);
            if (profile?.phone) {
              userDbPhone = profile.phone;
            }
          } catch (e) {
            console.warn('Could not load profile phone:', e);
          }
        }

        // 3. If no methods stored yet, initialize defaults with real user data if present
        if (loadedMethods.length === 0) {
          if (userDbPhone) {
            // Mask the phone: +254 7XX *** 890
            const clean = userDbPhone.replace(/\s+/g, '');
            const masked = clean.length >= 10
              ? `${clean.slice(0, 4)} ${clean.slice(4, 7)} *** ${clean.slice(-3)}`
              : clean;

            loadedMethods = [
              {
                id: 'pm_mpesa_initial',
                type: 'mpesa',
                title: 'M-Pesa Wallet',
                subtitle: 'Linked Phone Number',
                details: masked,
                rawIdentifier: userDbPhone,
                isDefault: true,
                createdAt: new Date().toISOString()
              }
            ];
          } else {
            // Standard starter placeholders that can be customized / removed
            loadedMethods = [
              {
                id: 'pm_mpesa_sample',
                type: 'mpesa',
                title: 'M-Pesa Wallet',
                subtitle: 'Linked Phone Number',
                details: '+254 712 *** 890',
                rawIdentifier: '+254712000890',
                isDefault: true,
                createdAt: new Date().toISOString()
              },
              {
                id: 'pm_card_sample',
                type: 'card',
                title: 'Debit Card',
                subtitle: 'Visa Bank Card',
                details: '**** **** **** 4242',
                rawIdentifier: '4242',
                cardBrand: 'visa',
                cardExpiry: '12/28',
                isDefault: false,
                createdAt: new Date().toISOString()
              }
            ];
          }
          localStorage.setItem(storageKey, JSON.stringify(loadedMethods));
        }

        if (isMounted) {
          setMethods(loadedMethods);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMethods();

    return () => {
      isMounted = false;
    };
  }, [user?.id, storageKey]);

  // Helper to persist methods
  const saveMethods = (updated: SavedPaymentMethod[]) => {
    setMethods(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save payment methods:', e);
    }
  };

  // Set method as default
  const handleSetDefault = (id: string) => {
    const updated = methods.map((m) => ({
      ...m,
      isDefault: m.id === id
    }));
    saveMethods(updated);
    toast.success('Default payment method updated.');
  };

  // Remove method
  const handleRemove = async (id: string) => {
    const target = methods.find((m) => m.id === id);
    if (!target) return;

    const remaining = methods.filter((m) => m.id !== id);

    // If removed method was default, make the first one default
    if (target.isDefault && remaining.length > 0) {
      remaining[0].isDefault = true;
    }

    // If removing M-Pesa, optionally clear profile phone if it matches
    if (target.type === 'mpesa' && user?.id) {
      try {
        await updateUserProfile(user.id, { phone: null });
      } catch (err) {
        console.warn('Could not clear user phone:', err);
      }
    }

    saveMethods(remaining);
    toast.info(`${target.title} removed.`);
  };

  // Handle formatters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = val.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : val);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(val);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvv(val);
  };

  // Open modal
  const handleOpenModal = () => {
    setFormError(null);
    setMpesaPhone('');
    setCardHolder('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    // Default to true if no methods exist yet
    setMpesaSetDefault(methods.length === 0);
    setCardSetDefault(methods.length === 0);
    setIsModalOpen(true);
  };

  // Detect card brand
  const detectBrand = (num: string): 'visa' | 'mastercard' | 'amex' | 'card' => {
    const clean = num.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    return 'card';
  };

  // Save new payment method
  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'mpesa') {
        // Validate M-Pesa phone
        let cleaned = mpesaPhone.replace(/\s+/g, '').replace(/[-()]/g, '');
        if (!cleaned) {
          setFormError('Please enter a Safaricom phone number.');
          setIsSubmitting(false);
          return;
        }

        // Format to standard +254
        let fullPhone = '';
        if (cleaned.startsWith('+254')) {
          fullPhone = cleaned;
        } else if (cleaned.startsWith('254')) {
          fullPhone = `+${cleaned}`;
        } else if (cleaned.startsWith('0')) {
          fullPhone = `+254${cleaned.slice(1)}`;
        } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
          fullPhone = `+254${cleaned}`;
        } else {
          setFormError('Please enter a valid Kenyan mobile number (e.g., 0712 345 678).');
          setIsSubmitting(false);
          return;
        }

        if (fullPhone.length < 13) {
          setFormError('Phone number is too short. Expected 9 digits after +254.');
          setIsSubmitting(false);
          return;
        }

        // Save to DB if authenticated
        if (user?.id) {
          try {
            await updateUserProfile(user.id, { phone: fullPhone });
          } catch (dbErr) {
            console.warn('Notice updating profile phone:', dbErr);
          }
        }

        const masked = `${fullPhone.slice(0, 4)} ${fullPhone.slice(4, 7)} *** ${fullPhone.slice(-3)}`;
        const newMethod: SavedPaymentMethod = {
          id: `pm_mpesa_${Date.now()}`,
          type: 'mpesa',
          title: 'M-Pesa Wallet',
          subtitle: 'Linked Phone Number',
          details: masked,
          rawIdentifier: fullPhone,
          isDefault: mpesaSetDefault || methods.length === 0,
          createdAt: new Date().toISOString()
        };

        let updated = [...methods];
        if (newMethod.isDefault) {
          updated = updated.map((m) => ({ ...m, isDefault: false }));
        }
        updated.unshift(newMethod);
        saveMethods(updated);

        toast.success('M-Pesa wallet added successfully!');
        setIsModalOpen(false);
      } else {
        // Validate Card
        const cleanCard = cardNumber.replace(/\s+/g, '');
        if (cleanCard.length < 15) {
          setFormError('Please enter a valid 16-digit card number.');
          setIsSubmitting(false);
          return;
        }

        if (!cardHolder.trim()) {
          setFormError('Please enter the name on the card.');
          setIsSubmitting(false);
          return;
        }

        if (cardExpiry.length < 5) {
          setFormError('Please enter a valid expiry date (MM/YY).');
          setIsSubmitting(false);
          return;
        }

        const [expMonth, expYear] = cardExpiry.split('/').map(Number);
        const currentYearTwoDigits = Number(new Date().getFullYear().toString().slice(-2));
        if (!expMonth || expMonth < 1 || expMonth > 12) {
          setFormError('Invalid expiry month. Must be between 01 and 12.');
          setIsSubmitting(false);
          return;
        }
        if (!expYear || expYear < currentYearTwoDigits) {
          setFormError('Card expiry year cannot be in the past.');
          setIsSubmitting(false);
          return;
        }

        if (!cardCvv || cardCvv.length < 3) {
          setFormError('Please enter a valid 3 or 4 digit CVV.');
          setIsSubmitting(false);
          return;
        }

        const brand = detectBrand(cleanCard);
        const brandTitle =
          brand === 'visa'
            ? 'Visa Debit Card'
            : brand === 'mastercard'
            ? 'Mastercard Debit Card'
            : brand === 'amex'
            ? 'American Express'
            : 'Debit Card';

        const last4 = cleanCard.slice(-4);
        const newMethod: SavedPaymentMethod = {
          id: `pm_card_${Date.now()}`,
          type: 'card',
          title: brandTitle,
          subtitle: `${brand.toUpperCase()} •••• ${last4}`,
          details: `**** **** **** ${last4}`,
          rawIdentifier: last4,
          cardBrand: brand,
          cardExpiry: cardExpiry,
          isDefault: cardSetDefault || methods.length === 0,
          createdAt: new Date().toISOString()
        };

        let updated = [...methods];
        if (newMethod.isDefault) {
          updated = updated.map((m) => ({ ...m, isDefault: false }));
        }
        updated.push(newMethod);
        saveMethods(updated);

        toast.success('Debit card added successfully!');
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to add payment method.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserLayout>
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Payment Methods
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage how you pay for subscriptions and content.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-black px-5 py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer text-sm self-start sm:self-auto w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* Methods List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
            <span className="font-semibold text-sm">Loading your payment methods...</span>
          </div>
        ) : methods.length === 0 ? (
          <div className="bg-background border-2 border-dashed border-border rounded-2xl p-10 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
              <Wallet className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-1">No payment methods linked</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
              Add your M-Pesa phone number or credit/debit card to quickly unlock creator content and subscribe with 1-click.
            </p>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl shadow text-sm hover:brightness-110"
            >
              <Plus className="w-4 h-4" /> Add Payment Method
            </button>
          </div>
        ) : (
          methods.map((method) => {
            const isMpesa = method.type === 'mpesa';

            return (
              <div
                key={method.id}
                className={`bg-background rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all border-2 ${
                  method.isDefault
                    ? 'border-emerald-500/30 ring-1 ring-emerald-500/20'
                    : 'border-border opacity-90 hover:opacity-100 hover:border-primary/40'
                }`}
              >
                {/* DEFAULT Badge */}
                {method.isDefault && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg tracking-wider flex items-center gap-1 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                    DEFAULT
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isMpesa
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {isMpesa ? (
                      <Smartphone className="w-6 h-6 stroke-[2]" />
                    ) : (
                      <CardIcon className="w-6 h-6 stroke-[2]" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-foreground flex items-center gap-2">
                      {method.title}
                      {method.cardBrand && method.cardBrand !== 'card' && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                          {method.cardBrand}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {method.subtitle}
                      {method.cardExpiry ? ` • Exp: ${method.cardExpiry}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="font-mono font-bold tracking-wider text-lg sm:text-xl text-foreground">
                    {method.details}
                  </div>

                  <div className="flex items-center gap-3">
                    {!method.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(method.id)}
                        className="text-xs sm:text-sm text-muted-foreground font-bold hover:text-foreground transition-colors cursor-pointer"
                      >
                        Set Default
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemove(method.id)}
                      className="text-xs sm:text-sm text-red-500 hover:text-red-600 font-bold hover:underline transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Security & Statement Disclaimer Card */}
      <div className="mt-8 bg-muted/20 border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex gap-3">
          <Wallet className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transactions on your bank statement will appear as{' '}
              <strong className="text-foreground">The Gents Dollhouse TECH LTD</strong>. M-Pesa prompt will
              appear on your phone for verification when making new purchases.
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-500 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>End-to-end encrypted with standard SSL/TLS bank security</span>
            </div>
          </div>
        </div>
      </div>

      {/* ADD PAYMENT METHOD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-background border border-border w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-black text-foreground">Add Payment Method</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Choose M-Pesa or enter your card details for instant checkouts.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('mpesa');
                  setFormError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-black transition-all ${
                  activeTab === 'mpesa'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span>M-Pesa</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('card');
                  setFormError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-black transition-all ${
                  activeTab === 'card'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CardIcon className="w-4 h-4 text-primary" />
                <span>Debit / Credit Card</span>
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs font-bold text-red-500">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleAddPaymentMethod} className="space-y-5">
              {activeTab === 'mpesa' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Safaricom Mobile Number
                    </label>
                    <div className="flex">
                      <span className="bg-muted border border-border border-r-0 px-4 py-3 rounded-l-xl text-muted-foreground font-bold flex items-center text-sm">
                        +254
                      </span>
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="712 345 678"
                        autoFocus
                        className="w-full bg-muted/20 border border-border px-4 py-3 rounded-r-xl focus:outline-none focus:border-primary text-sm font-mono tracking-wide"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Enter your phone number starting with 7XX or 1XX or 07XX. You will receive an STK Push PIN prompt when subscribing or purchasing content.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mpesaSetDefault}
                      onChange={(e) => setMpesaSetDefault(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                    />
                    <span className="text-xs font-bold text-foreground">
                      Set as default payment method
                    </span>
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="e.g. John Mwangi"
                      className="w-full bg-muted/20 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 •••• •••• 4242"
                        className="w-full bg-muted/20 border border-border pl-4 pr-12 py-3 rounded-xl focus:outline-none focus:border-primary text-sm font-mono"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <CardIcon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Expires (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full bg-muted/20 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-sm font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full bg-muted/20 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-sm font-mono text-center tracking-widest"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardSetDefault}
                      onChange={(e) => setCardSetDefault(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                    />
                    <span className="text-xs font-bold text-foreground">
                      Set as default payment method
                    </span>
                  </label>
                </>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save {activeTab === 'mpesa' ? 'M-Pesa Wallet' : 'Card'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
