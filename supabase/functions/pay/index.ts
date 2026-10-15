import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { amount, phone, name, reference } = await req.json();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 1 || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid amount and phone number are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone to 254...
    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

    if (!/^254[17]\d{8}$/.test(formattedPhone)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid Kenyan phone number (e.g. 07... or 01...).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gatewayUrl = (Deno.env.get('PAYMENT_GATEWAY_URL') || Deno.env.get('PAYHERO_GATEWAY_URL') || 'https://backend.payhero.co.ke/api/v2').replace(/\/+$/, '');
    const apiKey = Deno.env.get('PAYMENT_API_KEY') || Deno.env.get('PAYHERO_API_KEY');
    const channelId = Deno.env.get('PAYMENT_CHANNEL_ID') || Deno.env.get('PAYHERO_CHANNEL_ID');
    const callbackUrl = Deno.env.get('PAYMENT_CALLBACK_URL') || Deno.env.get('PAYHERO_CALLBACK_URL') || 'https://backend.payhero.co.ke/api/v2/webhook-callback/';

    if (!apiKey || !channelId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment gateway configuration is missing on server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = apiKey.trim().startsWith('Basic ') ? apiKey.trim() : `Basic ${apiKey.trim()}`;
    const externalRef = reference || `PAY-${Date.now()}`;

    const upstreamResponse = await fetch(`${gatewayUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(numericAmount),
        phone_number: formattedPhone,
        channel_id: Number(channelId),
        provider: 'm-pesa',
        external_reference: externalRef,
        customer_name: name || 'Customer',
        callback_url: callbackUrl,
      }),
    });

    const data = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data?.message || data?.error || 'Payment gateway could not initiate request.',
        }),
        { status: upstreamResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference: data?.reference || data?.external_reference || externalRef,
        CheckoutRequestID: data?.CheckoutRequestID || data?.reference || externalRef,
        status: data?.status || 'QUEUED',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal payment service error';
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

