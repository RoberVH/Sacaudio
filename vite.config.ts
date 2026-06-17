import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      // Required for FFmpeg WASM to work properly
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production for smaller build
    rollupOptions: {
      // Manual chunks for better code splitting
      manualChunks: {
        // Group FFmpeg related dependencies
        ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
        // Group React and related dependencies
        vendor: ['react', 'react-dom', 'react-i18next'],
        // Group i18n dependencies
        i18n: ['i18next', 'i18next-browser-languagedetector'],
        // Group UI dependencies
        ui: ['lucide-react'],
      },
      // Optimize chunk sizes
      output: {
        manualChunks: undefined, // Let Rollup handle it
        // Minify more aggressively
        minifyInternalExports: true,
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable brotli compression
    reportCompressedSize: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util',
      'react',
      'react-dom',
      'react-i18next',
      'i18next',
      'i18next-browser-languagedetector',
      'lucide-react',
      'zustand',
    ],
    exclude: [],
  },
});
