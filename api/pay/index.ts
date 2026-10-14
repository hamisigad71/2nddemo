import type { VercelRequest, VercelResponse } from '@vercel/node';

const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY || '';
const PAYHERO_CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID || '';
const PAYHERO_CALLBACK_URL = process.env.PAYHERO_CALLBACK_URL || '';
const VERCEL_URL = process.env.VERCEL_URL || '';

const normalizePayHeroAuth = (key: string): string => {
  const trimmed = key.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('Basic ') ? trimmed : `Basic ${trimmed}`;
};

const resolvePayHeroCallbackUrl = (): string => {
  const configured = PAYHERO_CALLBACK_URL || (VERCEL_URL ? `https://${VERCEL_URL}/api/pay/callback` : '');
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

  // Fallback to standard PayHero webhook endpoint when testing or if custom callback is unset
  return 'https://backend.payhero.co.ke/api/v2/webhook-callback/';
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
    return res.status(400).json({ success: false, error: 'amount and phone are required' });
  }

  if (!PAYHERO_API_KEY) {
    return res.status(500).json({ success: false, error: 'PayHero API key is missing. Set PAYHERO_API_KEY in your server environment.' });
  }

  const channelId = Number(PAYHERO_CHANNEL_ID);
  if (!Number.isSafeInteger(channelId) || channelId < 1) {
    return res.status(500).json({ success: false, error: 'PayHero channel is missing. Set PAYHERO_CHANNEL_ID in your server environment.' });
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
    const response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: normalizePayHeroAuth(PAYHERO_API_KEY),
      },
      body: JSON.stringify({
        amount: numericAmount,
        phone_number: formattedPhone,
        channel_id: channelId,
        provider: 'm-pesa',
        external_reference: externalRef,
        customer_name: name || 'Customer',
        callback_url: resolvePayHeroCallbackUrl(),
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
      const errorMessage = data?.message || data?.error || data?.detail || data?.errors?.[0]?.message || 'Payment initiation failed';
      return res.status(response.status).json({ success: false, error: errorMessage });
    }

    // Return only what the partner needs – no PayHero branding
    return res.status(200).json({
      success: true,
      reference: data?.reference || data?.external_reference || externalRef,
      CheckoutRequestID: data?.CheckoutRequestID,
      status: data?.status,
      message: 'STK push sent. Customer should enter M-Pesa PIN.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

