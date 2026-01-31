# WebLLM.io

## Project Structure

pnpm + Turborepo monorepo with the following packages:

- `packages/sdk` — `@webllm-io/sdk` core library
- `packages/ui` — `@webllm-io/ui` (planned)
- `packages/rag` — `@webllm-io/rag` (planned)
- `apps/playground` — Vite + vanilla TS demo app
- `tooling/tsconfig` — Shared TypeScript configurations

## Architecture Decisions

- **createClient() factory function** — Returns `WebLLMClient` with `chat.completions` API
- **local/cloud dual engine** — Three-level progressive API (zero config → responsive → full control)
- **Provider composition** — Plain config auto-wraps to default provider; explicit provider for advanced use
- **WebWorker default** — Inference runs in WebWorker by default to avoid UI freezing
- **Full abort support** — Local via `interruptGenerate()`, Cloud via fetch signal
- **OpenAI compatible** — Cloud engine uses OpenAI Chat Completions API format
- **Optional MLC peer dep** — `@mlc-ai/web-llm` is optional; pure cloud mode has zero local deps
- **Zero-dep cloud** — SSE parsing is self-implemented (~30 lines), no openai SDK dependency
- **Serial request queue** — MLCEngine is single-threaded; RequestQueue serializes local inference
- **Device scoring** — S/A/B/C grades based on maxStorageBufferBindingSize (VRAM proxy)

## SDK Module Layout

```
packages/sdk/src/
├── index.ts              # Public API exports
├── core/                 # createClient, config types, resolution, errors
├── capability/           # WebGPU detection, VRAM estimation, device scoring
├── providers/            # mlc(), fetchSSE(), custom provider wrappers
├── inference/            # InferenceBackend interface, queue, local/cloud backends
├── router/               # Route decision engine (local vs cloud)
├── chat/                 # Completions API with fallback logic
├── loader/               # Progressive loading, OPFS cache, load state manager
└── utils/                # EventEmitter, SSE parser, logger
```

## SDK Subpath Exports

- `@webllm-io/sdk` — Main entry: createClient, checkCapability, types
- `@webllm-io/sdk/providers/mlc` — mlc() provider function
- `@webllm-io/sdk/providers/fetch` — fetchSSE() provider function
- `@webllm-io/sdk/worker` — Web Worker entry for MLC inference

## Development

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm dev            # Start dev mode
pnpm test           # Run tests
pnpm typecheck      # TypeScript type checking
```

### Playground

```bash
pnpm --filter @webllm-io/playground dev   # Start playground dev server
```

Requires COOP/COEP headers (configured in vite.config.ts) for SharedArrayBuffer.

## Conventions

- Build tool: tsup (ESM/CJS dual output + DTS)
- Testing: Vitest with happy-dom environment
- Version management: Changesets
- All code, comments, docs, git messages in English
- @webgpu/types for WebGPU TypeScript definitions
- @mlc-ai/web-llm as optional peerDependency (dynamic import)

## Key Dependencies

- `@mlc-ai/web-llm` — Optional peer dep for local MLC inference
- `tsup` — Build tool for SDK
- `vitest` — Test runner with happy-dom environment
- `vite` — Playground dev server
- `turbo` — Monorepo task runner
- `@changesets/cli` — Version management
