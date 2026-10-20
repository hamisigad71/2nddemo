import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const reference = (req.query.reference || req.query.ref) as string;
  if (!reference) {
    return res.status(400).json({ success: false, error: 'Reference query parameter is required' });
  }

  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || 'sk_test_ef2079f1c89c45fbb1708ca379830a4c507e897d').trim();

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await verifyRes.json();
    if (!verifyRes.ok) {
      return res.status(verifyRes.status).json({
        success: false,
        error: data?.message || 'Paystack verification failed',
      });
    }

    const isSuccess = data?.status === true && data?.data?.status === 'success';

    return res.status(200).json({
      success: true,
      paid: isSuccess,
      reference,
      amount: (data?.data?.amount || 0) / 100,
      currency: data?.data?.currency,
      channel: data?.data?.channel,
      gateway_response: data?.data?.gateway_response,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal verification server error',
    });
  }
}

