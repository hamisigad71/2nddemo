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
    const response = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(request.amount),
        phone: formatPayHeroPhone(request.phone_number),
        name: request.customer_name,
        reference: request.external_reference,
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { success: false, error: data?.error || `HTTP ${response.status}: Failed to initiate STK` };
    }

    if (data?.success && (data?.reference || data?.CheckoutRequestID)) {
      return {
        success: true,
        status: data?.status,
        reference: data?.reference,
        CheckoutRequestID: data?.CheckoutRequestID
      };
    }

    return {
      success: false,
      error: data?.message || 'Unexpected response from PayHero'
    };
  } catch (err: unknown) {
    console.error('PayHero STK Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error while contacting payment service'
    };
  }
};

/**
 * Check payment status via PayHero reference
 */
export const checkPayHeroStatus = async (reference: string): Promise<{ paid: boolean; status?: string; error?: string }> => {
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
      error: data?.error
    };
  } catch (err: unknown) {
    return {
      paid: false,
      error: err instanceof Error ? err.message : 'Network error while checking payment status'
    };
  }
};
