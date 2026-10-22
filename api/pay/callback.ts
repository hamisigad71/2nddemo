import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

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
    return res.status(400).json({ success: false, error: 'Invalid callback payload' });
  }

  const event = (payload.response && typeof payload.response === 'object')
    ? payload.response
    : (payload.data && typeof payload.data === 'object' ? payload.data : payload);

  const reference = event.reference || event.external_reference || event.ExternalReference || event.externalReference;
  const rawStatus = event.status || event.Status || 'UNKNOWN';
  const status = typeof rawStatus === 'string' ? rawStatus.toUpperCase() : 'UNKNOWN';
  const amount = Number(event.amount || event.Amount || 0);
  const phone = event.phone || event.phone_number || event.Phone || '';

  console.info('Payment callback received', {
    reference: typeof reference === 'string' ? reference : undefined,
    status,
    amount,
    phone
  });

  const isSuccess = ['SUCCESS', 'COMPLETED', 'PAID'].includes(status);

  if (isSuccess && supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const gross = amount > 0 ? amount : 200;
      const platformFee = Math.round(gross * 0.30);
      const netAmount = gross - platformFee;

      // Record transaction in Supabase
      const { data: tx, error: txErr } = await supabase.from('transactions').insert({
        type: 'subscription',
        gross_amount: gross,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: 'completed',
      }).select().maybeSingle();

      if (txErr) {
        console.warn('Webhook transaction insert warning:', txErr.message);
      }

      // Dispatch notification to Platform Admin
      await supabase.from('notifications').insert({
        user_id: 'admin',
        title: 'M-Pesa Payment Confirmed! 💰',
        message: `M-Pesa payment of KES ${gross.toLocaleString()} received via PayHero (${phone || reference || 'Subscriber'}). Platform Fee: KES ${platformFee.toLocaleString()}, Creator Net: KES ${netAmount.toLocaleString()}.`,
        type: 'subscription',
        is_read: false
      });

    } catch (err: any) {
      console.error('Error fulfilling payment in webhook:', err);
    }
  }

  return res.status(200).json({ success: true, received: true, processed: isSuccess });
}
