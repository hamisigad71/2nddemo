import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ success: false, error: 'Invalid PayHero callback payload' });
  }

  const event = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  const reference = event.reference || event.external_reference || event.externalReference;
  const status = typeof event.status === 'string' ? event.status.toUpperCase() : 'UNKNOWN';

  console.info('PayHero callback received', {
    reference: typeof reference === 'string' ? reference : undefined,
    status,
  });

  return res.status(200).json({ success: true, received: true });
}
