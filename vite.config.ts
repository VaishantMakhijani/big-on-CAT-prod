// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // <-- ADD THIS IMPORT

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- ADD THIS PLUGIN
  ],
  server: {
    proxy: {
      '/puzzle.json': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});