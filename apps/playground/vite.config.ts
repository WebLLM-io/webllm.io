import { defineConfig } from 'vite';

export default defineConfig({
  base: '/playground/',
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
  worker: {
    format: 'es',
  },
});
