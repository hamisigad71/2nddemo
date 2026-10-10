import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
      }
    }
  }
})
