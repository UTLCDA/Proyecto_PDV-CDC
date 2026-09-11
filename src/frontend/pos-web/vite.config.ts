import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // PDF y Excel se cargan bajo demanda; el bundle inicial permanece por debajo del límite estándar.
    chunkSizeWarningLimit: 1400
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/products': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html';
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});
