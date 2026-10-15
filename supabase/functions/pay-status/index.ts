import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let ref = '';
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      ref = body.reference || body.ref;
    } catch {
      // ignore JSON parse error
    }
  } else {
    const url = new URL(req.url);
    ref = url.searchParams.get('ref') || url.searchParams.get('reference') || '';
  }

  if (!ref) {
    return new Response(
      JSON.stringify({ success: false, error: 'Transaction reference is required.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const gatewayUrl = (Deno.env.get('PAYMENT_GATEWAY_URL') || Deno.env.get('PAYHERO_GATEWAY_URL') || 'https://backend.payhero.co.ke/api/v2').replace(/\/+$/, '');
  const apiKey = Deno.env.get('PAYMENT_API_KEY') || Deno.env.get('PAYHERO_API_KEY');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Payment gateway configuration is missing on server.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = apiKey.trim().startsWith('Basic ') ? apiKey.trim() : `Basic ${apiKey.trim()}`;

  try {
    const upstreamResponse = await fetch(
      `${gatewayUrl}/transaction-status?reference=${encodeURIComponent(ref)}`,
      {
        headers: { Authorization: authHeader },
      }
    );

    const data = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data?.message || data?.error || 'Failed to check status',
        }),
        { status: upstreamResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const status = String(data?.status || '').toUpperCase();
    const paid = ['SUCCESS', 'COMPLETED', 'PAID'].includes(status);
    const failed = ['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED', 'ERROR'].includes(status);

    return new Response(
      JSON.stringify({
        success: true,
        reference: ref,
        paid,
        pending: !paid && !failed,
        failed,
        status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error verifying payment status';
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

