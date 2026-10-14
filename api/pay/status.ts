import type { VercelRequest, VercelResponse } from '@vercel/node';

const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY || '';

const normalizePayHeroAuth = (key: string): string => {
  const trimmed = key.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('Basic ') ? trimmed : `Basic ${trimmed}`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const queryRef = req.query.ref;
  const ref = Array.isArray(queryRef) ? queryRef[0] : queryRef;

  if (!ref) {
    return res.status(400).json({ success: false, error: 'ref query parameter is required' });
  }

  if (!PAYHERO_API_KEY) {
    return res.status(500).json({ success: false, error: 'PayHero API key is missing. Set PAYHERO_API_KEY in your server environment.' });
  }

  try {
    const response = await fetch(
      `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${encodeURIComponent(ref)}`,
      {
        headers: {
          Authorization: normalizePayHeroAuth(PAYHERO_API_KEY),
        },
      }
    );

    const rawText = await response.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || data?.detail || 'Status check failed';
      return res.status(response.status).json({
        success: false,
        error: errorMessage,
      });
    }

    const status = String(data?.status || '').toUpperCase();
    const paid = ['SUCCESS', 'COMPLETED', 'PAID'].includes(status);
    const failed = ['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED', 'ERROR'].includes(status);

    return res.status(200).json({
      success: true,
      reference: ref,
      paid,
      pending: !paid && !failed,
      failed,
      status, // SUCCESS | QUEUED | PENDING | FAILED | CANCELLED
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
