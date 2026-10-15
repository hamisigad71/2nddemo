import fs from 'fs';

// 1. Read environment variables from .env / .env.local
function loadEnv() {
  const env = {};
  ['.env', '.env.local'].forEach(file => {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          env[key.trim()] = vals.join('=').trim();
        }
      }
    }
  });
  return env;
}

const env = loadEnv();
const phoneArg = process.argv[2] || process.env.PHONE || '0700000000';
const amountArg = Number(process.argv[3] || '1');

// Format phone to 254...
let formattedPhone = phoneArg.replace(/\D/g, '');
if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

const apiKey = env.PAYMENT_API_KEY || env.PAYHERO_API_KEY;
const channelId = Number(env.PAYMENT_CHANNEL_ID || env.PAYHERO_CHANNEL_ID || 13942);
const gatewayUrl = (env.PAYMENT_GATEWAY_URL || env.PAYHERO_GATEWAY_URL || 'https://backend.payhero.co.ke/api/v2').replace(/\/+$/, '');
const callbackUrl = env.PAYMENT_CALLBACK_URL || `${gatewayUrl}/webhook-callback/`;

if (!apiKey) {
  console.error('❌ Error: PAYMENT_API_KEY or PAYHERO_API_KEY not found in .env');
  process.exit(1);
}

const authHeader = apiKey.startsWith('Basic ') ? apiKey : `Basic ${apiKey}`;

async function runTest() {
  console.log('🚀 Triggering M-Pesa STK Push...');
  console.log(`📱 Phone: ${formattedPhone}`);
  console.log(`💰 Amount: KES ${amountArg}`);
  console.log(`🔗 Gateway: ${gatewayUrl}/payments\n`);

  const externalRef = `TEST-${Date.now()}`;

  try {
    const res = await fetch(`${gatewayUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountArg,
        phone_number: formattedPhone,
        channel_id: channelId,
        provider: 'm-pesa',
        external_reference: externalRef,
        customer_name: 'Test Customer',
        callback_url: callbackUrl,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error(`❌ STK Push failed with HTTP ${res.status}:`, data);
      return;
    }

    console.log('✅ STK Push Dispatched Successfully!');
    console.log('📋 Response:', JSON.stringify(data, null, 2));

    const ref = data?.reference || externalRef;
    console.log(`\n⏳ Polling transaction status for reference: ${ref}`);
    console.log('   (Enter your M-Pesa PIN on your phone if prompt appeared)...\n');

    for (let i = 1; i <= 6; i++) {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const pollRes = await fetch(`${gatewayUrl}/transaction-status?reference=${encodeURIComponent(ref)}`, {
          headers: { Authorization: authHeader },
        });
        const pollData = await pollRes.json();
        const status = String(pollData?.status || '').toUpperCase();
        console.log(`   [Check ${i}/6] Status: ${status || 'PENDING'}`);

        if (['SUCCESS', 'COMPLETED', 'PAID'].includes(status)) {
          console.log('\n🎉 Payment Confirmed successfully!');
          return;
        }
        if (['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(status)) {
          console.log('\n⚠️ Payment was cancelled or rejected.');
          return;
        }
      } catch (err) {
        console.log(`   [Check ${i}/6] Checking...`);
      }
    }

    console.log('\n⏱️ Finished polling.');
  } catch (err) {
    console.error('❌ Request error:', err.message);
  }
}

runTest();

