import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': process.env.BACKEND_URL || 'http://localhost:3000',
      '/uploads': process.env.BACKEND_URL || 'http://localhost:3000',
    }
  }
});
