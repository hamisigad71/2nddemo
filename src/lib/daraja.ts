// Daraja M-Pesa STK Push Integration (Sandbox)
// Safaricom Developer Portal: developer.safaricom.co.ke

const DARAJA_CONSUMER_KEY = import.meta.env.VITE_DARAJA_CONSUMER_KEY || 'cAuxScUGKBIUuUdaEMEJIM6PzOWvyooXPQaRLA0m3oi4PU1c';
const DARAJA_CONSUMER_SECRET = import.meta.env.VITE_DARAJA_CONSUMER_SECRET || 'pa3gzEfCu5yGSNftc8odrv9i0qVRjqtHXqZO4A6YXzUlLJ5zelzyEOuLf0uCYyA';

// Sandbox shortcode and passkey (from Safaricom portal)
const SHORTCODE = '174379';
const PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

// Vite proxy route (avoids CORS in browser)
const DARAJA_BASE = '/daraja';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Format phone number to international format (254XXXXXXXXX)
 * Accepts: 07XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, ''); // remove non-digits
  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned;
  return cleaned;
};

/**
 * Generate Daraja password: base64(shortcode + passkey + timestamp)
 */
const generatePassword = (timestamp: string): string => {
  const raw = `${SHORTCODE}${PASSKEY}${timestamp}`;
  return btoa(raw);
};

/**
 * Get current timestamp in format YYYYMMDDHHmmss
 */
const getTimestamp = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
};

// ─────────────────────────────────────────────
// Step 1: Get OAuth Token
// ─────────────────────────────────────────────

export const getDarajaToken = async (): Promise<string | null> => {
  try {
    const credentials = btoa(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`);

    const response = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Daraja token error:', errText);
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (err) {
    console.error('getDarajaToken failed:', err);
    return null;
  }
};

// ─────────────────────────────────────────────
// Step 2: Initiate STK Push
// ─────────────────────────────────────────────

export interface StkPushResult {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
}

export const initiateStkPush = async (
  phone: string,
  amount: number,
  description: string,
  callbackUrl?: string
): Promise<StkPushResult> => {
  try {
    const token = await getDarajaToken();
    if (!token) {
      return { success: false, error: 'Could not authenticate with Daraja. Check your API credentials.' };
    }

    const timestamp = getTimestamp();
    const password = generatePassword(timestamp);
    const formattedPhone = formatPhone(phone);

    // Use window.location.origin as callback if not provided
    // In sandbox, Daraja doesn't actually call this URL — it's just required
    const callback = callbackUrl || `${window.location.origin}/payment/callback`;

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount), // must be integer
      PartyA: formattedPhone,    // customer phone
      PartyB: SHORTCODE,         // your shortcode
      PhoneNumber: formattedPhone,
      CallBackURL: callback,
      AccountReference: 'The Gents Dollhouse',
      TransactionDesc: description.slice(0, 50), // max 50 chars
    };

    const response = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.ResponseCode === '0') {
      // Success — STK prompt was sent
      return {
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
      };
    }

    return {
      success: false,
      error: data.errorMessage || data.ResponseDescription || 'STK Push failed. Please try again.',
    };
  } catch (err: any) {
    console.error('initiateStkPush failed:', err);
    return { success: false, error: err.message || 'Network error. Check your connection.' };
  }
};

// ─────────────────────────────────────────────
// Step 3: Check STK Push Status
// ─────────────────────────────────────────────

export interface StkStatusResult {
  paid: boolean;
  pending: boolean;
  cancelled: boolean;
  error?: string;
  resultCode?: string;
  resultDesc?: string;
}

export const checkStkStatus = async (checkoutRequestId: string): Promise<StkStatusResult> => {
  try {
    const token = await getDarajaToken();
    if (!token) {
      return { paid: false, pending: false, cancelled: false, error: 'Auth failed' };
    }

    const timestamp = getTimestamp();
    const password = generatePassword(timestamp);

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await fetch(`${DARAJA_BASE}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // ResultCode 0 = success, 1032 = cancelled by user, 1037 = timeout
    const resultCode = String(data.ResultCode ?? data.errorCode ?? '');

    if (resultCode === '0') {
      return { paid: true, pending: false, cancelled: false, resultCode, resultDesc: data.ResultDesc };
    }
    if (resultCode === '1032') {
      return { paid: false, pending: false, cancelled: true, resultCode, resultDesc: 'Payment was cancelled.' };
    }
    if (resultCode === '1037') {
      return { paid: false, pending: false, cancelled: true, resultCode, resultDesc: 'Payment request timed out.' };
    }
    if (data.errorCode === '500.001.1001') {
      // "The transaction is being processed" — still pending
      return { paid: false, pending: true, cancelled: false, resultDesc: 'Still processing...' };
    }

    return {
      paid: false,
      pending: false,
      cancelled: false,
      resultCode,
      resultDesc: data.ResultDesc || data.errorMessage || 'Unknown status',
      error: data.ResultDesc || data.errorMessage,
    };
  } catch (err: any) {
    console.error('checkStkStatus error:', err);
    return { paid: false, pending: false, cancelled: false, error: err.message };
  }
};
