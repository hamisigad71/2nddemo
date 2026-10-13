import type { VercelRequest, VercelResponse } from '@vercel/node';

const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { ref } = req.query;

  if (!ref) {
    return res.status(400).json({ success: false, error: 'ref query parameter is required' });
  }

  try {
    const response = await fetch(
      `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${ref}`,
      {
        headers: {
          Authorization: PAYHERO_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.message || 'Status check failed',
      });
    }

    const status = (data.status || '').toUpperCase();

    return res.status(200).json({
      success: true,
      reference: ref,
      paid: status === 'SUCCESS',
      pending: status === 'QUEUED' || status === 'PENDING',
      failed: status === 'FAILED' || status === 'CANCELLED',
      status, // SUCCESS | QUEUED | PENDING | FAILED | CANCELLED
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
