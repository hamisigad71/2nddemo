import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, phoneNumber, userId, type, toCreatorId } = await req.json()

    // Environment variables
    const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY')
    const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET')
    const passkey = Deno.env.get('DARAJA_PASSKEY')
    const shortcode = Deno.env.get('DARAJA_SHORTCODE') || '174379' 
    const callbackUrl = Deno.env.get('DARAJA_CALLBACK_URL')
    const envStr = Deno.env.get('DARAJA_ENVIRONMENT') || 'sandbox'
    const baseUrl = envStr === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

    if (!consumerKey || !consumerSecret || !passkey || !callbackUrl) {
      throw new Error("Missing Daraja Configuration Variables")
    }

    // 1. Get OAuth Token
    const authBuffer = new TextEncoder().encode(`${consumerKey}:${consumerSecret}`)
    const authBase64 = btoa(String.fromCharCode(...authBuffer))
    
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${authBase64}`
      }
    })
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) throw new Error("Failed to authenticate with Daraja")

    // 2. Prepare STK Push Password & Timestamp
    const date = new Date()
    const timestamp = date.getFullYear().toString() + 
      (date.getMonth() + 1).toString().padStart(2, '0') + 
      date.getDate().toString().padStart(2, '0') + 
      date.getHours().toString().padStart(2, '0') + 
      date.getMinutes().toString().padStart(2, '0') + 
      date.getSeconds().toString().padStart(2, '0')

    const passwordBuffer = new TextEncoder().encode(`${shortcode}${passkey}${timestamp}`)
    const password = btoa(String.fromCharCode(...passwordBuffer))

    // 3. Format Phone Number (convert 07... to 2547...)
    let formattedPhone = phoneNumber.replace(/\s+/g, '')
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1)
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.substring(1)

    // 4. Send STK Push Request
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount), // Must be integer
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: "Hideaway",
      TransactionDesc: `Hideaway ${type}`
    }

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPayload)
    })

    const stkData = await stkResponse.json()

    if (stkData.ResponseCode !== "0") {
      throw new Error(stkData.errorMessage || stkData.CustomerMessage || "STK Push Failed")
    }

    // 5. Log Pending Transaction in Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Need service role to insert securely
    )

    // Optional: You should add 'provider_reference' column to the transactions table for this!
    const { error: dbError } = await supabaseClient.from('transactions').insert({
      type, 
      from_user_id: userId,
      to_creator_id: toCreatorId,
      gross_amount: amount,
      platform_fee: amount * 0.1, // 10% fee example
      net_amount: amount * 0.9,
      status: 'pending',
      provider_reference: stkData.CheckoutRequestID // Save the request ID to match with webhook
    })

    if (dbError) {
      console.error("Database insert error:", dbError)
    }

    // 6. Return response to React App
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Please enter your M-Pesa PIN",
      checkoutRequestId: stkData.CheckoutRequestID 
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
