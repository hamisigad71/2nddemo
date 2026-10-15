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
  try {
    const response = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(request.amount),
        phone: formatPhoneNumber(request.phone_number),
        name: request.customer_name,
        reference: request.external_reference,
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { 
        success: false, 
        error: data?.error || `HTTP ${response.status}: Failed to initiate payment request` 
      };
    }

    if (data?.success && (data?.reference || data?.CheckoutRequestID)) {
      return {
        success: true,
        status: data?.status,
        reference: data?.reference,
        CheckoutRequestID: data?.CheckoutRequestID || data?.reference,
      };
    }

    return {
      success: false,
      error: data?.error || data?.message || 'Unexpected response from payment service'
    };
  } catch (err: unknown) {
    console.error('Payment STK Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error while contacting payment service'
    };
  }
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

