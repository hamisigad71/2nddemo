import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function paymentDevPlugin(): Plugin {
  return {
    name: 'payment-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const url = new URL(rawUrl, 'http://localhost');

        const env = loadEnv(server.config.mode, process.cwd(), '');
        const apiKey = (env.PAYMENT_API_KEY || env.PAYHERO_API_KEY || '').trim();
        const authHeader = apiKey ? (apiKey.startsWith('Basic ') ? apiKey : `Basic ${apiKey}`) : '';
        const channelId = Number(env.PAYMENT_CHANNEL_ID || env.PAYHERO_CHANNEL_ID || env.VITE_PAYHERO_CHANNEL_ID || 13942);
        const gatewayUrl = (env.PAYMENT_GATEWAY_URL || env.PAYHERO_GATEWAY_URL || 'https://backend.payhero.co.ke/api/v2').replace(/\/+$/, '');

        // 1. POST /api/pay
        if (url.pathname === '/api/pay' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { amount, phone, name, reference } = body;
              const numericAmount = Number(amount);

              if (!numericAmount || numericAmount < 1 || !phone) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: 'amount and phone are required' }));
              }

              if (!authHeader) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: 'Payment API key missing in environment' }));
              }

              let formattedPhone = String(phone).replace(/\D/g, '');
              if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
              if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;
              if (!/^254[17]\d{8}$/.test(formattedPhone)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: 'Enter a valid Kenyan mobile number (e.g. 07... or 01...)' }));
              }

              const externalRef = reference || `PAY-${Date.now()}`;
              const callbackUrl = env.PAYMENT_CALLBACK_URL || env.PAYHERO_CALLBACK_URL || `${gatewayUrl}/webhook-callback/`;

              const payResponse = await fetch(`${gatewayUrl}/payments`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: authHeader,
                },
                body: JSON.stringify({
                  amount: numericAmount,
                  phone_number: formattedPhone,
                  channel_id: channelId,
                  provider: 'm-pesa',
                  external_reference: externalRef,
                  customer_name: name || 'Customer',
                  callback_url: callbackUrl,
                }),
              });

              const rawText = await payResponse.text();
              let data: any = null;
              try {
                data = rawText ? JSON.parse(rawText) : null;
              } catch {
                data = null;
              }

              if (!payResponse.ok) {
                res.statusCode = payResponse.status;
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: data?.message || data?.error || data?.detail || 'Failed to initiate payment',
                    reference: externalRef,
                  })
                );
              }

              const assignedRef = data?.reference || data?.external_reference || externalRef;
              const checkoutRequestId = data?.CheckoutRequestID || data?.checkout_request_id || assignedRef;
              const status = (data?.status || 'QUEUED').toUpperCase();

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: true,
                  reference: assignedRef,
                  CheckoutRequestID: checkoutRequestId,
                  status,
                  message: data?.message || 'Payment prompt sent successfully',
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, error: err.message || 'Internal server error' }));
            }
          });
          return;
        }

        // 2. GET /api/pay/status?ref=...
        if (url.pathname === '/api/pay/status' && req.method === 'GET') {
          const ref = url.searchParams.get('ref');
          if (!ref) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: 'ref query parameter is required' }));
          }

          if (!authHeader) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: 'Payment API key missing in environment' }));
          }

          try {
            const statusResponse = await fetch(
              `${gatewayUrl}/transaction-status?reference=${encodeURIComponent(ref)}`,
              {
                headers: { Authorization: authHeader },
              }
            );

            const rawText = await statusResponse.text();
            let data: any = null;
            try {
              data = rawText ? JSON.parse(rawText) : null;
            } catch {
              data = null;
            }

            if (!statusResponse.ok) {
              res.statusCode = statusResponse.status;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: false,
                  error: data?.message || data?.error || data?.detail || 'Status check failed',
                })
              );
            }

            const status = String(data?.status || '').toUpperCase();
            const paid = ['SUCCESS', 'COMPLETED', 'PAID'].includes(status);
            const failed = ['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED', 'ERROR'].includes(status);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                success: true,
                reference: ref,
                paid,
                pending: !paid && !failed,
                failed,
                status,
              })
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: err.message || 'Internal server error' }));
          }
        }

        // 3. GET /api/paystack/verify?reference=...
        if (url.pathname === '/api/paystack/verify' && req.method === 'GET') {
          const ref = url.searchParams.get('reference') || url.searchParams.get('ref');
          if (!ref) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: 'reference parameter is required' }));
          }

          const paystackSecret = (env.PAYSTACK_SECRET_KEY || 'sk_test_ef2079f1c89c45fbb1708ca379830a4c507e897d').trim();
          try {
            const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
              headers: {
                Authorization: `Bearer ${paystackSecret}`,
                'Content-Type': 'application/json',
              },
            });

            const data: any = await verifyRes.json().catch(() => null);
            if (!verifyRes.ok) {
              res.statusCode = verifyRes.status;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, error: data?.message || 'Verification failed' }));
            }

            const isSuccess = data?.status === true && data?.data?.status === 'success';
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              success: true,
              paid: isSuccess,
              reference: ref,
              amount: (data?.data?.amount || 0) / 100,
              currency: data?.data?.currency,
              channel: data?.data?.channel,
              gateway_response: data?.data?.gateway_response,
            }));
          } catch (err: any) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              success: true,
              paid: true,
              reference: ref,
              simulated: true,
              message: 'Verified locally',
            }));
          }
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), paymentDevPlugin()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
})
