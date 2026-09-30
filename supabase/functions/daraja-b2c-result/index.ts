import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const reqBody = await req.json()
    console.log("Received B2C Result Webhook:", JSON.stringify(reqBody))

    const result = reqBody.Result
    if (!result) {
      return new Response("Invalid Payload", { status: 400 })
    }

    const conversationId = result.ConversationID
    const resultCode = result.ResultCode

    // Initialize Supabase Admin Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (resultCode === 0) {
      // Success!
      // Update transaction status to completed
      const { error } = await supabaseClient
        .from('transactions')
        .update({ status: 'completed' })
        .eq('provider_reference', conversationId)

      if (error) throw error
    } else {
      // Failed (e.g. invalid phone number)
      console.log(`Withdrawal failed. Reason: ${result.ResultDesc}`)
      
      const { error } = await supabaseClient
        .from('transactions')
        .update({ status: 'failed' })
        .eq('provider_reference', conversationId)

      if (error) throw error
    }

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
