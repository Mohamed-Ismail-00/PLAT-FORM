import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The repository keeps a legacy root UI and the production frontend UI.
  // Partner routes are shared between them, so force one runtime copy of
  // React and its peer-dependent packages during local/root builds.
  resolve: {
    dedupe: ['react', 'react-dom', 'lucide-react', 'axios'],
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
});
