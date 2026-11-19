export const MINIMUM_CREATOR_PAYOUT_KES = 1000;

export const getCreatorPayoutAmountError = (
  amount: number,
  availableBalance?: number
): string | null => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Please enter a valid withdrawal amount.';
  }

  if (amount < MINIMUM_CREATOR_PAYOUT_KES) {
    return 'The minimum withdrawal amount is KES 1,000.';
  }

  if (availableBalance !== undefined && amount > availableBalance) {
    return `Amount cannot exceed your available balance of KES ${availableBalance.toLocaleString()}.`;
  }

  return null;
};

/**
 * Normalizes a Kenyan M-Pesa mobile number into canonical `+254XXXXXXXXX` format.
 * Accepts 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, 1XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX,
 * +2547XXXXXXXX, +2541XXXXXXXX, and accidental +25407XXXXXXXX / 25407XXXXXXXX.
 * Returns null if the input is not a valid 9-digit Kenyan mobile subscriber number.
 */
export const normalizeKenyanMpesaPhone = (rawPhone: string): string | null => {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return null;

  let normalizedDigits = digits;
  if (normalizedDigits.startsWith('2540') && normalizedDigits.length === 13) {
    normalizedDigits = '254' + normalizedDigits.slice(4);
  } else if (normalizedDigits.startsWith('0') && normalizedDigits.length === 10) {
    normalizedDigits = '254' + normalizedDigits.slice(1);
  } else if ((normalizedDigits.startsWith('7') || normalizedDigits.startsWith('1')) && normalizedDigits.length === 9) {
    normalizedDigits = '254' + normalizedDigits;
  }

  if (!/^254[17]\d{8}$/.test(normalizedDigits)) {
    return null;
  }

  return `+${normalizedDigits}`;
};

export const getCreatorPayoutPhoneError = (
  rawPhone: string,
  confirmRawPhone?: string
): string | null => {
  const normalized = normalizeKenyanMpesaPhone(rawPhone);
  if (!normalized) {
    return 'Please enter a valid Kenyan M-Pesa number (e.g. 0712 345 678, 0112 345 678, or +254712345678).';
  }

  if (confirmRawPhone !== undefined) {
    const normalizedConfirm = normalizeKenyanMpesaPhone(confirmRawPhone);
    if (!normalizedConfirm) {
      return 'Please re-enter your M-Pesa number to confirm it is correct.';
    }
    if (normalized !== normalizedConfirm) {
      return 'The two M-Pesa numbers do not match. Please double-check and re-enter.';
    }
  }

  return null;
};
