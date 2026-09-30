import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    // 1. Daraja sends JSON payload in the request body
    const reqBody = await req.json()
    console.log("Received Daraja Webhook:", JSON.stringify(reqBody))

    const callbackData = reqBody.Body?.stkCallback
    if (!callbackData) {
      return new Response("Invalid Payload", { status: 400 })
    }

    const checkoutRequestId = callbackData.CheckoutRequestID
    const resultCode = callbackData.ResultCode

    // 2. Initialize Supabase Admin Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Process the Result Code
    if (resultCode === 0) {
      // Success!
      // Optional: Extract MpesaReceiptNumber if needed from callbackData.CallbackMetadata
      console.log(`Payment successful for request ${checkoutRequestId}`)
      
      const { error } = await supabaseClient
        .from('transactions')
        .update({ status: 'completed' })
        .eq('provider_reference', checkoutRequestId)

      if (error) throw error

    } else {
      // Failed, cancelled by user, or insufficient funds
      console.log(`Payment failed for request ${checkoutRequestId}. Reason: ${callbackData.ResultDesc}`)
      
      const { error } = await supabaseClient
        .from('transactions')
        .update({ status: 'failed' })
        .eq('provider_reference', checkoutRequestId)

      if (error) throw error
    }

    // Safaricom expects a simple success response to acknowledge receipt
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Webhook processing error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
