import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill for Solana web3.js in browser environment if needed
    'process.env': {}
  },
  build: {
    outDir: 'dist',
  }
});