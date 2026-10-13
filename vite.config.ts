import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function payHeroDevPlugin(): Plugin {
  return {
    name: 'payhero-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const url = new URL(rawUrl, 'http://localhost');

        const env = loadEnv(server.config.mode, process.cwd(), '');
        const apiKey = (env.PAYHERO_API_KEY || '').trim();
        const authHeader = apiKey ? (apiKey.startsWith('Basic ') ? apiKey : `Basic ${apiKey}`) : '';
        const channelId = Number(env.PAYHERO_CHANNEL_ID || env.VITE_PAYHERO_CHANNEL_ID);

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
                return res.end(JSON.stringify({ success: false, error: 'PayHero API key missing in .env (PAYHERO_API_KEY)' }));
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
              const callbackUrl = env.PAYHERO_CALLBACK_URL || 'https://backend.payhero.co.ke/api/v2/webhook-callback/';

              const payResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
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
                    error: data?.message || data?.error || data?.detail || 'Payment initiation failed',
                  })
                );
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: true,
                  reference: data?.reference || data?.external_reference || externalRef,
                  CheckoutRequestID: data?.CheckoutRequestID,
                  status: data?.status,
                  message: 'STK push sent. Customer should enter M-Pesa PIN.',
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

        // 2. GET /api/pay/status
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
            return res.end(JSON.stringify({ success: false, error: 'PayHero API key missing in .env (PAYHERO_API_KEY)' }));
          }

          try {
            const statusResponse = await fetch(
              `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${encodeURIComponent(ref)}`,
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

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), payHeroDevPlugin()],
  server: {
    proxy: {
      '/pesapal-api': {
        target: 'https://pay.pesapal.com/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pesapal-api/, ''),
      },
      '/pesapal-sandbox': {
        target: 'https://cyb3rpay.pesapal.com/pesapalv3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pesapal-sandbox/, ''),
      },
      '/daraja': {
        target: 'https://sandbox.safaricom.co.ke',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/daraja/, ''),
        secure: true,
      },
      '/payhero': {
        target: 'https://backend.payhero.co.ke',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/payhero/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Ensure host header is correct for PayHero
            proxyReq.setHeader('host', 'backend.payhero.co.ke');
          });
        },
      },
    },
  },
})
