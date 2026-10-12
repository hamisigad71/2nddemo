// PayHero M-Pesa STK Push Integration
// Docs: https://backend.payhero.co.ke/api/v2/payments

const PAYHERO_API_KEY = import.meta.env.VITE_PAYHERO_API_KEY || '';
const PAYHERO_CHANNEL_ID = import.meta.env.VITE_PAYHERO_CHANNEL_ID || '';

// Proxy endpoint for local dev (avoids CORS) or direct URL
const PAYHERO_BASE = import.meta.env.DEV ? '/payhero' : 'https://backend.payhero.co.ke';

/**
 * Format phone number to standard local/Safaricom format (e.g. 07XXXXXXXX or 01XXXXXXXX)
 * PayHero accepts e.g. "0787677676" or "2547..."
 */
export const formatPayHeroPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('254')) {
    return '0' + cleaned.slice(3);
  }
  if (cleaned.startsWith('0')) {
    return cleaned;
  }
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    return '0' + cleaned;
  }
  return cleaned;
};

export interface PayHeroPaymentRequest {
  amount: number;
  phone_number: string;
  customer_name?: string;
  external_reference?: string;
  callback_url?: string;
}

export interface PayHeroResponse {
  success: boolean;
  status?: string;
  reference?: string;
  CheckoutRequestID?: string;
  error?: string;
}

/**
 * Initiate an M-Pesa STK push via PayHero
 */
export const initiatePayHeroSTK = async (
  request: PayHeroPaymentRequest
): Promise<PayHeroResponse> => {
  try {
    const formattedPhone = formatPayHeroPhone(request.phone_number);
    const channelId = Number(PAYHERO_CHANNEL_ID) || 133;

    const payload = {
      amount: Math.round(request.amount),
      phone_number: formattedPhone,
      channel_id: channelId,
      provider: 'm-pesa',
      external_reference: request.external_reference || `REF-${Date.now()}`,
      customer_name: request.customer_name || 'Customer',
      callback_url: request.callback_url || `${window.location.origin}/payment/callback`
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (PAYHERO_API_KEY) {
      // Basic Auth token as specified in PayHero docs
      headers['Authorization'] = PAYHERO_API_KEY.startsWith('Basic ')
        ? PAYHERO_API_KEY
        : `Basic ${PAYHERO_API_KEY}`;
    }

    const response = await fetch(`${PAYHERO_BASE}/api/v2/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status}: Failed to initiate STK`;
      return {
        success: false,
        error: errorMsg
      };
    }

    if (data?.success || data?.status === 'QUEUED' || data?.CheckoutRequestID) {
      return {
        success: true,
        status: data.status,
        reference: data.reference,
        CheckoutRequestID: data.CheckoutRequestID
      };
    }

    return {
      success: false,
      error: data?.message || 'Unexpected response from PayHero'
    };
  } catch (err: any) {
    console.error('PayHero STK Error:', err);
    return {
      success: false,
      error: err.message || 'Network error while contacting PayHero API'
    };
  }
};

/**
 * Check payment status via PayHero reference
 */
export const checkPayHeroStatus = async (reference: string): Promise<{ paid: boolean; status?: string; error?: string }> => {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (PAYHERO_API_KEY) {
      headers['Authorization'] = PAYHERO_API_KEY.startsWith('Basic ')
        ? PAYHERO_API_KEY
        : `Basic ${PAYHERO_API_KEY}`;
    }

    const response = await fetch(`${PAYHERO_BASE}/api/v2/payments/${reference}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      return { paid: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const status = (data?.status || '').toUpperCase();

    if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'PAID') {
      return { paid: true, status };
    }

    return { paid: false, status };
  } catch (err: any) {
    return { paid: false, error: err.message };
  }
};
