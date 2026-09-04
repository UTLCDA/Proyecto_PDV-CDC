import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // PDF y Excel se cargan bajo demanda; el bundle inicial permanece por debajo del límite estándar.
    chunkSizeWarningLimit: 1400
  },
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
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
