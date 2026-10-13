import type { VercelRequest, VercelResponse } from '@vercel/node';

const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY!;
const PAYHERO_CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // CORS – allow partner domains (update to restrict further)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { amount, phone, name, reference } = req.body;

  if (!amount || !phone) {
    return res.status(400).json({ success: false, error: 'amount and phone are required' });
  }

  // Format phone: ensure it starts with 254
  let formattedPhone = String(phone).replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
  if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

  const externalRef = reference || `PAY-${Date.now()}`;

  try {
    const response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: PAYHERO_API_KEY,
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone_number: formattedPhone,
        channel_id: Number(PAYHERO_CHANNEL_ID),
        provider: 'm-pesa',
        external_reference: externalRef,
        customer_name: name || 'Customer',
        callback_url: 'https://backend.payhero.co.ke/api/v2/webhook-callback/',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.message || 'Payment initiation failed',
      });
    }

    // Return only what the partner needs – no PayHero branding
    return res.status(200).json({
      success: true,
      reference: data.reference || externalRef,
      message: 'STK push sent. Customer should enter M-Pesa PIN.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
