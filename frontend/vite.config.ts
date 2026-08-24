import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Mirrors the Caddy `/api/*` -> backend prefix-strip used in prod (see
      // infra/Caddyfile), so the frontend always calls relative `/api/...`
      // paths and auth cookies stay same-origin in both dev and prod.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
