import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Во время разработки фронт на :5173, бэкенд на :3001 — нужен прокси.
// На проде фронт собирается в статику и раздаётся самим бэкендом.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Разделяем тяжёлые библиотеки в отдельные чанки для faster загрузки
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
