/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const GA_ID = process.env.VITE_GA_MEASUREMENT_ID || ''
const gaScript = GA_ID
  ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    </script>`
  : ''

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-ga',
      transformIndexHtml(html) {
        return html.replace('</head>', `${gaScript}</head>`)
      },
    },
  ],
  server: {
    host: '0.0.0.0', // Allow access from network
    port: 5173,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
  },
})
