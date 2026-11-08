import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || process.env.PAYHERO_API_KEY || '';
const PAYMENT_GATEWAY_URL = (process.env.PAYMENT_GATEWAY_URL || 'https://backend.payhero.co.ke/api/v2').replace(/\/+$/, '');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const normalizeAuth = (key: string): string => {
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

  if (!PAYMENT_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'Payment service configuration missing. Set PAYMENT_API_KEY in your server environment.' 
    });
  }

  try {
    const response = await fetch(
      `${PAYMENT_GATEWAY_URL}/transaction-status?reference=${encodeURIComponent(ref)}`,
      {
        headers: {
          Authorization: normalizeAuth(PAYMENT_API_KEY),
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

    // If paid and Supabase configured, ensure transaction is recorded in DB
    if (paid && supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const amount = Number(data?.amount || data?.Amount || 1000);
        const gross = amount > 0 ? amount : 1000;
        const platformFee = Math.round(gross * 0.30);
        const netAmount = gross - platformFee;

        // Check if transaction already exists for this reference
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('reference_id', ref)
          .maybeSingle();

        if (!existingTx) {
          await supabase.from('transactions').insert({
            type: 'subscription',
            gross_amount: gross,
            platform_fee: platformFee,
            net_amount: netAmount,
            status: 'completed',
            reference_id: ref,
          });

          await supabase.from('notifications').insert({
            user_id: 'admin',
            title: 'M-Pesa Payment Confirmed! 💰',
            message: `M-Pesa payment of KES ${gross.toLocaleString()} confirmed (Ref: ${ref}). Platform Fee: KES ${platformFee.toLocaleString()}, Net: KES ${netAmount.toLocaleString()}.`,
            type: 'subscription',
            is_read: false,
          });
        }
      } catch (dbErr) {
        console.warn('DB recording on payment status check notice:', dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      reference: ref,
      paid,
      pending: !paid && !failed,
      failed,
      status,
      raw: data,
    });
  } catch (err: any) {
    console.error('Payment status check error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error checking payment status',
    });
  }
}
