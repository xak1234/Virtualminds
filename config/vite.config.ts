import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development';

    return {
      server: {
        port: 3000,
        host: isDev ? '127.0.0.1' : '0.0.0.0', // Localhost only in development
        // Removed CORS headers to allow CDN resources to load properly
        // WebLLM will work without these in most modern browsers
        allowedHosts: ['virtualminds.uk', '.virtualminds.uk'],
        proxy: {
          '/v1': {
            target: env.VITE_LLAMA_BASE_URL || 'http://127.0.0.1:8080',
            changeOrigin: true,
            secure: true // Enable SSL verification
          },
          '/lm-studio': {
            target: env.VITE_LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234/v1',
            changeOrigin: true,
            secure: true, // Enable SSL verification
            rewrite: (path) => path.replace(/^\/lm-studio/, '')
          }
        },
        // Remove allowedHosts: true or restrict it in development
      },
      preview: {
        host: '0.0.0.0',
        port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
        allowedHosts: ['virtualminds.uk', '.virtualminds.uk'],
      },
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '..'),
          '@src': path.resolve(__dirname, '../src'),
          '@config': path.resolve(__dirname, '.'),
          '@assets': path.resolve(__dirname, '../assets'),
        }
      }
    };
});
