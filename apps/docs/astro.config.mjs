import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://webllm.io',
  base: '/docs',
  integrations: [
    starlight({
      title: 'WebLLM.io',
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
      },
      social: {
        github: 'https://github.com/WebLLM-io/webllm.io',
        'x.com': 'https://x.com/webllm_io',
      },
      editLink: {
        baseUrl: 'https://github.com/WebLLM-io/webllm.io/edit/main/apps/docs/',
      },
      customCss: [],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
            { label: 'Playground', slug: 'getting-started/playground' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Local Inference', slug: 'guides/local-inference' },
            { label: 'Cloud Fallback', slug: 'guides/cloud-fallback' },
            { label: 'Hybrid Routing', slug: 'guides/hybrid-routing' },
            { label: 'Streaming', slug: 'guides/streaming' },
            { label: 'Structured Output', slug: 'guides/structured-output' },
            { label: 'Model Loading', slug: 'guides/model-loading' },
            { label: 'Device Capability', slug: 'guides/device-capability' },
            { label: 'Web Worker', slug: 'guides/web-worker' },
            { label: 'Abort Requests', slug: 'guides/abort-requests' },
            { label: 'Custom Providers', slug: 'guides/custom-providers' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Architecture', slug: 'concepts/architecture' },
            { label: 'Three-Level API', slug: 'concepts/three-level-api' },
            { label: 'Device Scoring', slug: 'concepts/device-scoring' },
            { label: 'Request Queue', slug: 'concepts/request-queue' },
            { label: 'Provider Composition', slug: 'concepts/provider-composition' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'createClient()', slug: 'api/create-client' },
            { label: 'WebLLMClient', slug: 'api/webllm-client' },
            { label: 'Chat Completions', slug: 'api/chat-completions' },
            { label: 'checkCapability()', slug: 'api/check-capability' },
            { label: 'mlc()', slug: 'api/providers-mlc' },
            { label: 'fetchSSE()', slug: 'api/providers-fetch' },
            { label: 'withJsonOutput()', slug: 'api/structured-output' },
            { label: 'Cache Management', slug: 'api/cache-management' },
            { label: 'Config Types', slug: 'api/config-types' },
            { label: 'Errors', slug: 'api/errors' },
          ],
        },
        {
          label: 'Examples',
          items: [
            { label: 'Basic Chat', slug: 'examples/basic-chat' },
            { label: 'Streaming Chat', slug: 'examples/streaming-chat' },
            { label: 'Local Only', slug: 'examples/local-only' },
            { label: 'Cloud Only', slug: 'examples/cloud-only' },
            { label: 'Hybrid Mode', slug: 'examples/hybrid-mode' },
            { label: 'Device Detection', slug: 'examples/device-detection' },
            { label: 'JSON Output', slug: 'examples/json-output' },
          ],
        },
        { label: 'FAQ', slug: 'faq' },
      ],
    }),
  ],
});
