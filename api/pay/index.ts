import type { VercelRequest, VercelResponse } from '@vercel/node';

const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || process.env.PAYHERO_API_KEY || '';
const PAYMENT_CHANNEL_ID = process.env.PAYMENT_CHANNEL_ID || process.env.PAYHERO_CHANNEL_ID || '';
const PAYMENT_GATEWAY_URL = (process.env.PAYMENT_GATEWAY_URL || 'https://backend.payhero.co.ke/api/v2').replace(/\/+$/, '');
const PAYMENT_CALLBACK_URL = process.env.PAYMENT_CALLBACK_URL || process.env.PAYHERO_CALLBACK_URL || '';
const VERCEL_URL = process.env.VERCEL_URL || '';

const normalizeAuth = (key: string): string => {
  const trimmed = key.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('Basic ') ? trimmed : `Basic ${trimmed}`;
};

const resolveCallbackUrl = (): string => {
  const configured = PAYMENT_CALLBACK_URL || (VERCEL_URL ? `https://${VERCEL_URL}/api/pay/callback` : '');
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        return url.toString();
      }
    } catch {
      // Ignore invalid URL formatting and fall back
    }
  }

  return `${PAYMENT_GATEWAY_URL}/webhook-callback/`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { amount, phone, name, reference } = req.body ?? {};

  const numericAmount = Number(amount);
  if (!Number.isSafeInteger(numericAmount) || numericAmount < 1 || !phone) {
    return res.status(400).json({ success: false, error: 'Valid amount and phone number are required' });
  }

  if (!PAYMENT_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'Payment service configuration missing. Set PAYMENT_API_KEY in your server environment.' 
    });
  }

  const channelId = Number(PAYMENT_CHANNEL_ID);
  if (!Number.isSafeInteger(channelId) || channelId < 1) {
    return res.status(500).json({ 
      success: false, 
      error: 'Payment service channel missing. Set PAYMENT_CHANNEL_ID in your server environment.' 
    });
  }

  // Format phone: ensure it starts with 254
  let formattedPhone = String(phone).replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
  if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;
  if (!/^254[17]\d{8}$/.test(formattedPhone)) {
    return res.status(400).json({ success: false, error: 'Enter a valid Kenyan mobile number.' });
  }

  const externalRef = reference || `PAY-${Date.now()}`;

  try {
    const response = await fetch(`${PAYMENT_GATEWAY_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: normalizeAuth(PAYMENT_API_KEY),
      },
      body: JSON.stringify({
        amount: numericAmount,
        phone_number: formattedPhone,
        channel_id: channelId,
        provider: 'm-pesa',
        external_reference: externalRef,
        customer_name: name || 'Customer',
        callback_url: resolveCallbackUrl(),
      }),
    });

    const rawText = await response.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || data?.detail || 'Failed to dispatch payment prompt';
      return res.status(response.status).json({
        success: false,
        error: errorMessage,
        reference: externalRef,
      });
    }

    const assignedRef = data?.reference || data?.external_reference || externalRef;
    const checkoutRequestId = data?.CheckoutRequestID || data?.checkout_request_id || assignedRef;
    const status = (data?.status || 'QUEUED').toUpperCase();

    return res.status(200).json({
      success: true,
      reference: assignedRef,
      CheckoutRequestID: checkoutRequestId,
      status,
      message: data?.message || 'Payment prompt sent successfully',
    });
  } catch (err: any) {
    console.error('Payment gateway error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to communicate with payment gateway',
      reference: externalRef,
    });
  }
}
