# WebLLM.io

## Project Structure

pnpm + Turborepo monorepo with the following packages:

- `packages/sdk` — `@webllm-io/sdk` core library
- `packages/ui` — `@webllm-io/ui` (planned)
- `packages/rag` — `@webllm-io/rag` (planned)
- `apps/web` — `@webllm-io/web` Astro landing page (dark-themed brand portal)
- `apps/docs` — `@webllm-io/docs` Astro Starlight documentation site
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
- **Device scoring** — S/A/B/C grades based on maxStorageBufferBindingSize (VRAM proxy); all grades support local inference (C uses Qwen2.5-1.5B-Instruct lightweight model)
- **Explicit opt-in** — Both local and cloud default to disabled; users must explicitly configure at least one engine

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

### Landing Page (apps/web)

```bash
pnpm --filter @webllm-io/web dev      # Start on localhost:4321
```

Astro static site with dark theme. Sections: Header → Hero → Solution → DXJourney → GetStarted → Footer. Global styles in `src/styles/global.css` using CSS custom properties (no Tailwind).

### Documentation (apps/docs)

```bash
pnpm --filter @webllm-io/docs dev     # Start on localhost:4322
```

Astro Starlight site. Content in `src/content/docs/` as MDX files. Sidebar structure: Getting Started (3), Guides (10), Concepts (5), API Reference (10), Examples (7), FAQ. Edit links point to GitHub `WebLLM-io/webllm.io` repo.

### Port Allocation

| App | Port |
|---|---|
| `apps/web` | 4321 |
| `apps/docs` | 4322 |
| `apps/playground` | 5173 |

#### Settings Panel

The playground includes a collapsible Settings panel with **Local** and **Cloud** sections:

**Local settings:**
- **Model** — Fixed model name (empty = auto device-based selection)
- **WebWorker** — Run inference in WebWorker (default: Enabled)
- **Cache (OPFS)** — Enable OPFS model caching (default: Enabled)

**Cloud settings:**
- **Base URL** — Cloud API endpoint (e.g., `https://api.openai.com/v1`)
- **API Key** — Authentication key (stored in localStorage, password-masked)
- **Model** — Model identifier (e.g., `gpt-4o-mini`)
- **Timeout / Retries** — Request timeout in ms and retry count

Settings are persisted in localStorage under the key `webllm-playground-config` and restored on page load. Click "Apply & Reinitialize" to apply changes.

#### Model List Link

Below the Local Model ID input, a "Browse available models →" link points to the MLC web-llm model config on GitHub (`https://github.com/mlc-ai/web-llm/blob/main/src/config.ts`). Opens in a new tab.

#### Integration Code Snippet

The sidebar footer contains a collapsible "Integration Code" panel (`<details>`) that shows a live `createClient()` code snippet matching current settings. The snippet updates reactively when mode tabs or input fields change. A "Copy" button copies the code to clipboard.

#### Model Tag

Assistant reply messages display the responding model name (e.g., `Llama-3.1-8B-Instruct-q4f16_1-MLC` or `gpt-4o-mini`) as an italic tag below the message content, extracted from the first streaming chunk's `model` field.

## Conventions

- Build tool: tsup (ESM/CJS dual output + DTS)
- Testing: Vitest with happy-dom environment
- Version management: Changesets
- All code, comments, docs, git messages in English
- @webgpu/types for WebGPU TypeScript definitions
- @mlc-ai/web-llm as optional peerDependency (dynamic import)
- Astro apps (web, docs) inherit `astro/tsconfigs/strict`, not monorepo tsconfig
- Cross-app navigation: all sub-app logos/titles link back to main site `/` (not their own base path)

## Content Accuracy Conventions

- Device scoring thresholds MUST match `packages/sdk/src/capability/scoring.ts`
- Default model tiers MUST match `DEFAULT_TIERS` in `packages/sdk/src/core/resolve.ts`
- Tier mapping (grade→tier) MUST match `resolveModelForGrade()` in `packages/sdk/src/inference/local/mlc-backend.ts`
- CapabilityReport examples MUST match `packages/sdk/src/capability/types.ts`
- Cloud provider examples must only list OpenAI-compatible APIs

## Deployment

- **Hosting**: Cloudflare Pages, single domain `webllm.io`
- **Project name**: `webllm-io`

### URL Mapping

| App | URL | Base Path Config |
|---|---|---|
| Landing Page (`apps/web`) | `webllm.io/` | — (root) |
| Documentation (`apps/docs`) | `webllm.io/docs/` | `base: '/docs'` in astro.config.mjs |
| Playground (`apps/playground`) | `webllm.io/playground/` | `base: '/playground/'` in vite.config.ts |

### Build

`pnpm build:site` runs `turbo build` then `scripts/build-site.sh` which merges all three app dist outputs into `dist/site/`.

### CI/CD Workflows

- **`.github/workflows/deploy.yml`** — Deploys `dist/site/` to Cloudflare Pages on push to main
- **`.github/workflows/release.yml`** — Changesets-based npm publishing on push to main (uses npm Trusted Publishing via OIDC, no token needed). Requires Node 24+ (npm >= 11.5.1 for OIDC support). `changesets/action` only creates version PRs; publishing is a separate step to avoid `.npmrc` conflicts with OIDC auth.

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages deploy (wrangler) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

### npm Trusted Publishing

The release workflow uses OIDC-based Trusted Publishing instead of an NPM_TOKEN. Key requirements:

- **Node 24+** — npm >= 11.5.1 is required for OIDC token exchange
- **No `registry-url`** in `actions/setup-node` — avoids `.npmrc` token placeholders that block OIDC fallback
- **Separate publish step** — `changesets/action` only manages version PRs; `pnpm changeset publish` runs independently with `NPM_CONFIG_PROVENANCE` and `NPM_CONFIG_REGISTRY` env vars
- **`publishConfig.access: "public"`** in `packages/sdk/package.json` — required for scoped packages
- **`repository.url`** in `packages/sdk/package.json` — required for provenance verification

Configure on npmjs.com:

1. Go to `@webllm-io/sdk` package settings → Publishing access → Trusted Publishing
2. Add: Repository `WebLLM-io/webllm.io`, Workflow `release.yml`, Environment: (leave empty)

## Key Dependencies

- `@mlc-ai/web-llm` — Optional peer dep for local MLC inference
- `tsup` — Build tool for SDK
- `vitest` — Test runner with happy-dom environment
- `vite` — Playground dev server
- `turbo` — Monorepo task runner
- `@changesets/cli` — Version management
- `astro` — Static site framework for web and docs apps
- `@astrojs/starlight` — Documentation theme for docs app
