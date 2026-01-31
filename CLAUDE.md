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

## Development

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm dev            # Start dev mode
pnpm test           # Run tests
pnpm typecheck      # TypeScript type checking
```

## Conventions

- Build tool: tsup (ESM/CJS dual output + DTS)
- Testing: Vitest with happy-dom environment
- Version management: Changesets
- All code, comments, docs, git messages in English
