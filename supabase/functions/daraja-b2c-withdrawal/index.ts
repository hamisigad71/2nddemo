import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, creatorId, phoneNumber } = await req.json()

    // Environment variables
    const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY')
    const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET')
    const initiatorName = Deno.env.get('DARAJA_INITIATOR_NAME')
    const securityCredential = Deno.env.get('DARAJA_SECURITY_CREDENTIAL') // Base64 cert
    const shortcode = Deno.env.get('DARAJA_SHORTCODE')
    const resultUrl = Deno.env.get('DARAJA_B2C_RESULT_URL')
    const queueUrl = Deno.env.get('DARAJA_B2C_QUEUE_URL')
    
    // Defaulting to sandbox base URL
    const envStr = Deno.env.get('DARAJA_ENVIRONMENT') || 'sandbox'
    const baseUrl = envStr === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

    if (!consumerKey || !consumerSecret || !initiatorName || !securityCredential) {
      throw new Error("Missing Daraja Configuration Variables")
    }

    // 1. Verify Balance in Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calculate total net earnings vs withdrawals
    const { data: transactions, error: fetchError } = await supabaseClient
      .from('transactions')
      .select('net_amount, type, status')
      .eq('to_creator_id', creatorId)
      .in('status', ['completed', 'pending_withdrawal'])

    if (fetchError) throw fetchError;

    let balance = 0;
    transactions?.forEach(t => {
      if (t.type === 'withdrawal' || t.type === 'payout') {
        balance -= Number(t.net_amount)
      } else {
        balance += Number(t.net_amount)
      }
    });

    if (balance < amount) {
      throw new Error(`Insufficient funds. Your balance is KES ${balance}`)
    }

    // 2. Get OAuth Token
    const authBuffer = new TextEncoder().encode(`${consumerKey}:${consumerSecret}`)
    const authBase64 = btoa(String.fromCharCode(...authBuffer))
    
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authBase64}` }
    })
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) throw new Error("Failed to authenticate with Daraja")

    // 3. Format Phone Number
    let formattedPhone = phoneNumber.replace(/\s+/g, '')
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1)
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.substring(1)

    // 4. Send B2C Request
    const b2cPayload = {
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: Math.ceil(amount),
      PartyA: shortcode,
      PartyB: formattedPhone,
      Remarks: "Hideaway Creator Withdrawal",
      QueueTimeOutURL: queueUrl,
      ResultURL: resultUrl,
      Occasion: "Withdrawal"
    }

    const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(b2cPayload)
    })

    const b2cData = await b2cResponse.json()

    if (b2cData.ResponseCode !== "0") {
      throw new Error(b2cData.errorMessage || "B2C Request Failed")
    }

    // 5. Log Pending Withdrawal in Supabase
    // We log it as a negative amount net_amount to deduct from balance
    const { error: dbError } = await supabaseClient.from('transactions').insert({
      type: 'withdrawal', 
      to_creator_id: creatorId,
      gross_amount: amount,
      platform_fee: 0, 
      net_amount: amount, // Keeping it positive in DB, math logic handles deduction by 'type'
      status: 'pending_withdrawal',
      provider_reference: b2cData.ConversationID 
    })

    if (dbError) {
      console.error("Database insert error:", dbError)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Withdrawal initiated successfully",
      conversationId: b2cData.ConversationID 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
