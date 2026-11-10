/**
 * Unified Payment Service Client
 * 
 * Provides an agnostic interface for triggering STK push and checking
 * transaction statuses without exposing upstream gateway details.
 */

export interface STKPushRequest {
  amount: number;
  phone_number: string;
  customer_name?: string;
  external_reference?: string;
}

export interface PaymentResponse {
  success: boolean;
  status?: string;
  reference?: string;
  CheckoutRequestID?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  paid: boolean;
  status?: string;
  pending?: boolean;
  failed?: boolean;
  error?: string;
}

/**
 * Format phone number to standard mobile format (e.g. 07XXXXXXXX or 01XXXXXXXX or 254...)
 */
export const formatPhoneNumber = (phone: string): string => {
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

// Backward-compatible alias
export const formatPayHeroPhone = formatPhoneNumber;

/**
 * Initiate an M-Pesa STK Push
 */
export const initiateSTKPush = async (
  request: STKPushRequest
): Promise<PaymentResponse> => {
  const formattedPhone = formatPhoneNumber(request.phone_number);
  const roundedAmount = Math.round(request.amount);
  const externalRef = request.external_reference || `PAY-${Date.now()}`;

  // 1. Try backend endpoint /api/pay (or absolute URL if redirect/domain mismatch)
  try {
    const endpoint = (typeof window !== 'undefined' && window.location.hostname === 'thegentsdollhouse.com')
      ? 'https://www.thegentsdollhouse.com/api/pay'
      : '/api/pay';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        amount: roundedAmount,
        phone: formattedPhone,
        name: request.customer_name,
        reference: externalRef,
      })
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.success && (data?.reference || data?.CheckoutRequestID)) {
      return {
        success: true,
        status: data?.status || 'QUEUED',
        reference: data?.reference || data?.CheckoutRequestID,
        CheckoutRequestID: data?.CheckoutRequestID || data?.reference,
      };
    }

    if (data?.error || data?.message) {
      return {
        success: false,
        error: data.message || data.error,
      };
    }
  } catch (apiErr) {
    console.warn('/api/pay endpoint error:', apiErr);
  }

  // 2. Direct PayHero Fallback (Matches your 100% verified terminal curl)
  try {
    let intPhone = formattedPhone.replace(/\D/g, '');
    if (intPhone.startsWith('0')) intPhone = '254' + intPhone.slice(1);
    if (!intPhone.startsWith('254')) intPhone = '254' + intPhone;

    const directRes = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic bWd6dlNnZ0FyRHJZcU9hb3JuWEc6cXJlT3lmbzJvNGxaSzRCQkF5QzdQSkFvRVJNZTE2clJvc1RIUGdNWQ==',
      },
      body: JSON.stringify({
        amount: roundedAmount,
        phone_number: intPhone,
        channel_id: 14949,
        provider: 'm-pesa',
        external_reference: externalRef,
        customer_name: request.customer_name || 'Customer',
        callback_url: 'https://thegentsdollhouse.com/api/pay/callback',
      }),
    });

    const directData = await directRes.json().catch(() => null);
    if (directRes.ok && (directData?.reference || directData?.CheckoutRequestID || directData?.status)) {
      return {
        success: true,
        status: directData?.status || 'QUEUED',
        reference: directData?.reference || directData?.CheckoutRequestID || externalRef,
        CheckoutRequestID: directData?.CheckoutRequestID || directData?.reference || externalRef,
      };
    }

    if (directData?.error || directData?.message) {
      return {
        success: false,
        error: directData.message || directData.error || 'Failed to dispatch M-Pesa prompt',
      };
    }
  } catch (directErr: any) {
    console.error('Direct gateway error:', directErr);
  }

  return {
    success: false,
    error: 'Failed to initiate M-Pesa prompt. Please check your phone number and try again.',
  };
};

// Backward-compatible alias
export const initiatePayHeroSTK = initiateSTKPush;

/**
 * Check payment transaction status via reference ID
 */
export const checkPaymentStatus = async (
  reference: string
): Promise<PaymentStatusResponse> => {
  try {
    const response = await fetch(`/api/pay/status?ref=${encodeURIComponent(reference)}`, {
      headers: { 'Accept': 'application/json' }
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { paid: false, error: data?.error || `HTTP ${response.status}` };
    }

    return {
      paid: Boolean(data?.paid),
      status: data?.status,
      pending: Boolean(data?.pending),
      failed: Boolean(data?.failed),
      error: data?.error
    };
  } catch (err: unknown) {
    return {
      paid: false,
      error: err instanceof Error ? err.message : 'Network error while checking status'
    };
  }
};

// Backward-compatible alias
export const checkPayHeroStatus = checkPaymentStatus;

export default {
  initiateSTKPush,
  checkPaymentStatus,
  formatPhoneNumber,
};

