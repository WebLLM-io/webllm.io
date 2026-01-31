import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'providers/mlc': 'src/providers/mlc.ts',
      'providers/fetch': 'src/providers/fetch.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['@mlc-ai/web-llm'],
  },
  {
    entry: {
      'worker-entry': 'src/inference/local/worker-entry.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    external: ['@mlc-ai/web-llm'],
  },
]);
