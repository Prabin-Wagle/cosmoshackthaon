import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_ENCRYPTION_KEY': JSON.stringify("0e8a86f83fe1380093e8a27fc6324e993b99704b7879b0529e25e8adf64b8444b"),
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
  },
});
