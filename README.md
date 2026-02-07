# WebLLM.io

Run LLMs in the browser with automatic local/cloud fallback.

## Quick Start

```bash
npm install @webllm-io/sdk
```

### Zero Config (Local AI)

```typescript
import { createClient } from '@webllm-io/sdk';

const ai = createClient();

const response = await ai.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);
```

### With Cloud Fallback

```typescript
const ai = createClient({
  cloud: '/api/chat/completions',
});

// Uses local AI when available, falls back to cloud
const stream = await ai.chat.completions.create({
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### Cloud Only

```typescript
const ai = createClient({
  local: false,
  cloud: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'sk-...',
    model: 'gpt-4o-mini',
  },
});
```

### Responsive AI (Device-Aware)

```typescript
const ai = createClient({
  local: {
    tiers: {
      high: 'Llama-3-8B-q4f32',   // S/A-grade devices
      medium: 'auto',              // B-grade, SDK picks
      low: null,                   // C-grade, skip local
    },
  },
  cloud: {
    baseURL: 'https://api.my-backend.com/v1',
    apiKey: token,
    model: 'gpt-4o-mini',
  },
  onProgress: (p) => console.log(`${p.stage}: ${Math.round(p.progress * 100)}%`),
});
```

### Abort Support

```typescript
const controller = new AbortController();

const stream = ai.chat.completions.create({
  messages: [...],
  stream: true,
  signal: controller.signal,
});

// Cancel anytime
controller.abort();
```

### Device Capability Check

```typescript
import { checkCapability } from '@webllm-io/sdk';

const report = await checkCapability();
console.log(report.webgpu);  // true/false
console.log(report.grade);   // 'S' | 'A' | 'B' | 'C'
console.log(report.gpu);     // { vendor, name, vram }
```

### Explicit Providers

```typescript
import { createClient } from '@webllm-io/sdk';
import { mlc } from '@webllm-io/sdk/providers/mlc';
import { fetchSSE } from '@webllm-io/sdk/providers/fetch';

const ai = createClient({
  local: mlc({ model: 'Qwen2.5-3B-Instruct-q4f16_1-MLC' }),
  cloud: fetchSSE({ baseURL: 'https://api.example.com/v1', apiKey: '...' }),
});
```

## How It Works

1. **Device Detection** — Checks WebGPU, estimates VRAM, scores device (S/A/B/C)
2. **Model Selection** — Picks appropriate model based on device grade
3. **WebWorker Inference** — Runs MLC inference in a Web Worker (UI stays responsive)
4. **Smart Routing** — Routes to local or cloud based on device capability, battery, and network
5. **Automatic Fallback** — Local failure → cloud; cloud failure → local (if ready)

## Development

```bash
pnpm install
pnpm build
pnpm test
```

### Apps

| App | Description | Dev Command | Port |
|---|---|---|---|
| `apps/web` | Landing page | `pnpm --filter @webllm-io/web dev` | 4321 |
| `apps/docs` | Documentation (Starlight) | `pnpm --filter @webllm-io/docs dev` | 4322 |
| `apps/playground` | Interactive playground | `pnpm --filter @webllm-io/playground dev` | 5173 |

## License

MIT
