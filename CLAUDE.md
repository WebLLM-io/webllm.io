# WebLLM.io

## Project Structure

pnpm + Turborepo monorepo with the following packages:

- `packages/sdk` — `@webllm-io/sdk` core library
- `packages/ui` — `@webllm-io/ui` (planned)
- `packages/rag` — `@webllm-io/rag` (planned)
- `apps/web` — `@webllm-io/web` Astro landing page (dark-themed brand portal)
- `apps/docs` — `@webllm-io/docs` Astro Starlight documentation site
- `apps/playground` — Vite + vanilla TS demo app
- `apps/chat` — `@webllm-io/chat` React chat application (Vite + React 19 + Zustand + Tailwind CSS v4)
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
- **VRAM detection via adapter.limits** — Reads `adapter.limits.maxStorageBufferBindingSize` directly (not from a default device, which only returns spec defaults like 128 MB). When the adapter still reports ≤128 MB, a `navigator.deviceMemory`-based heuristic kicks in: Apple Silicon uses 50% of system RAM; other vendors use 25% as a conservative floor. `deviceMemory` is capped at 8 GB by browsers, which naturally prevents over-aggressive model selection.
- **Explicit opt-in** — Both local and cloud default to disabled; users must explicitly configure at least one engine
- **Runtime status** — `client.status()` returns `ClientStatus` with `localModel`, `localReady`, `localEnabled`, `cloudEnabled`
- **Route observability** — `onRoute` callback in `CreateClientOptions` fires on each route decision with `{ decision, reason }`
- **Error observability** — `onError` callback in `CreateClientOptions` fires when local backend initialization fails
- **Streaming usage** — Cloud streaming requests include `stream_options: { include_usage: true }` so the final chunk carries token usage; `ChatCompletionChunk.usage` is optional (populated by OpenAI-compatible APIs)
- **Playground mode switching** — Mode tab switches only change UI state and per-request `provider` field; client is NOT rebuilt on tab switch. Only "Apply & Reinitialize" triggers `initClient()`. The client is always created with all available backends (local + cloud).
- **Progress stage parsing** — `initProgressCallback` parses `progress.text` from web-llm: `/shader|compile/i` → `'compile'` stage, `progress >= 1` → `'warmup'`, otherwise → `'download'`
- **Thinking model support** — Two formats: `<think>` tags in `delta.content` (DeepSeek R1, QwQ, local MLC) and `delta.reasoning_content` field (OpenAI o1/o3). `reasoning_content` takes priority. Only the answer portion is stored in chat history.
- **Theme system (chat)** — CSS custom properties with `@theme inline` in Tailwind v4. Semantic color tokens (e.g. `bg-bg-surface`, `text-text-muted`) defined via `--th-*` CSS variables. Light mode is default; dark mode via `.dark` class on `<html>`. Theme persisted in localStorage (`webllm-chat-theme`). FOUC prevented by synchronous `<script>` in `<head>`. Components use semantic tokens, not raw color classes (`bg-zinc-800`). ModelCombobox badges are the only exception using `dark:` variants for accent colors.
- **Message actions (chat)** — Three per-message actions: **Copy** (all messages, copies raw text to clipboard with 2s checkmark feedback), **Edit** (user messages only, replaces bubble with auto-resize textarea, submits by truncating conversation from that point and re-sending), **Regenerate** (last assistant message only, deletes last assistant reply and re-triggers inference with `skipUserMessage`). Actions bar uses `group/message` hover reveal on desktop, always visible on mobile. `deleteMessagesFrom(conversationId, messageIndex)` in ConversationsSlice handles history truncation.

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

### Chat App (apps/chat)

```bash
pnpm --filter @webllm-io/chat dev     # Start on localhost:5174
```

React 19 chat application with multi-conversation support. Tech stack: Vite 6, React Router v7, Zustand 5, Tailwind CSS v4, IndexedDB (idb-keyval). Feature-based module organization under `src/features/` (conversations, chat, settings, sdk). Shared markdown/thinking utilities ported from playground.

### Port Allocation

| App | Port |
|---|---|
| `apps/web` | 4321 |
| `apps/docs` | 4322 |
| `apps/playground` | 5173 |
| `apps/chat` | 5174 |

#### Settings Panel

The playground includes a collapsible Settings panel with **Local** and **Cloud** sections:

**Local settings:**
- **Model** — Combobox for selecting model (empty = auto device-based selection). Supports dropdown selection from 153+ prebuilt models, free-text input for custom models, real-time search/filter, and keyboard navigation (Arrow Up/Down, Enter, Escape).
- **WebWorker** — Run inference in WebWorker (default: Enabled)
- **Cache (OPFS)** — Enable OPFS model caching (default: Enabled)

**Cloud settings:**
- **Base URL** — Cloud API endpoint (e.g., `https://api.openai.com/v1`)
- **API Key** — Authentication key (stored in localStorage, password-masked)
- **Model** — Model identifier (e.g., `gpt-4o-mini`)
- **Timeout / Retries** — Request timeout in ms and retry count

Settings are persisted in localStorage under the key `webllm-playground-config` and restored on page load. Click "Apply & Reinitialize" to apply changes.

#### Local Model Combobox

The Local Model ID field is a combobox component with the following features:
- **Dropdown selection** — Click input or toggle button to show model list from `@mlc-ai/web-llm` `prebuiltAppConfig`
- **Free-text input** — Type any custom model name directly
- **Real-time filtering** — Input filters the model list with highlighted matches
- **Keyboard navigation** — Arrow Up/Down to navigate, Enter to select, Escape to close, Tab to close and move focus
- **Model count** — Shows total available models (e.g., "153 models available")
- **GitHub link** — "Browse on GitHub →" link to view full model config source
- **Model badges** — Visual indicators for model status:
  - **Downloaded** (green badge) — Model is cached in OPFS, detected via `hasModelInCache()`
  - **Recommended** (blue badge) — Model matches device grade (S/A: Qwen3-8B, B: Qwen2.5-3B, C: Qwen2.5-1.5B)
- **Smart sorting** — Models sorted by: cached first → recommended → Qwen models → alphabetical

#### Integration Code Snippet

The sidebar footer contains a collapsible "Integration Code" panel (`<details>`) that shows a live `createClient()` code snippet matching current settings. The snippet updates reactively when mode tabs or input fields change. A "Copy" button copies the code to clipboard.

#### Model Tag & Route Badge

Assistant reply messages display the responding model name (e.g., `Qwen3-8B-q4f16_1-MLC` or `gpt-4o-mini`) as a tag below the message content, extracted from the first streaming chunk's `model` field. A route badge (local/cloud icon) appears next to the model tag, showing which backend served the response. Data comes from the SDK `onRoute` callback.

#### Runtime Status Card

The sidebar status card shows 8 fields:

| Field | Source |
|---|---|
| WebGPU | `checkCapability()` |
| VRAM | `checkCapability().gpu.vram` |
| Grade | `checkCapability().grade` with threshold hint (e.g., "A (>= 4096 MB)") |
| Model | `client.status().localModel` — resolved model ID |
| Status | Internal pipeline state: Idle / Initializing / Loading / Ready / Error |
| Battery | `checkCapability().battery` — percentage and charging state |
| Local Tokens | Cumulative token count from local backend (real usage or chars/4 estimate) |
| Cloud Tokens | Cumulative token count from cloud backend (real usage or chars/4 estimate) |

#### Pipeline Progress (inline)

Model loading progress is displayed inline within the sidebar status card (not as a floating overlay). Shows a progress bar with model name and percentage, plus a three-stage pipeline indicator (Download -> Compile -> Ready). Each stage transitions from pending -> active -> complete.

On error, the progress section is replaced with an inline error message, a "Retry" button (re-initializes client), and a "Dismiss" button. Both sections are hidden when idle.

#### Typing Indicator

When sending a message, a three-dot bounce animation appears in the assistant bubble until the first streaming chunk arrives.

#### Chat Error & Retry

Chat errors render as inline error cards with a "Retry" button that re-sends the last user message.

#### Thinking/Reasoning Model Support

The playground supports thinking/reasoning models that expose their chain-of-thought:

- **`<think>` tags** (DeepSeek R1, QwQ, local MLC) — Parsed from `delta.content`; content between `<think>` and `</think>` is extracted as thinking
- **`reasoning_content` field** (OpenAI o1/o3) — Read from `delta.reasoning_content`; takes priority over `<think>` tags
- **Collapsible display** — Thinking content renders in a `<details class="thinking-section">` element with blue-tinted background
- **Streaming indicator** — While thinking, summary shows "Thinking..." with animated dots; after completion, shows "Thought for N.Ns"
- **Answer-only history** — Only the answer portion is stored in `chatHistory` to avoid sending thinking tokens back to the model
- **Graceful abort** — Interrupting during thinking finalizes the timing display and appends "[Interrupted]"
- **No-op for regular models** — Models without thinking content render identically to before (no `<details>` element created)

#### Markdown Rendering

Assistant messages are rendered as Markdown with syntax highlighting:

- **Parser** — `marked` (GFM enabled) with `marked-highlight` extension for code highlighting
- **XSS protection** — `DOMPurify` sanitizes all HTML output; links get `target="_blank" rel="noopener noreferrer"`
- **Code highlighting** — `highlight.js` with 15 registered languages (JS, TS, Python, Bash, JSON, CSS, HTML/XML, Java, C/C++, Rust, Go, SQL, YAML)
- **Code blocks** — Wrapped in `.code-block-wrapper` with language label and Copy button; event-delegated click handler on `#messages`
- **Stream rendering** — `createStreamRenderer()` uses `requestAnimationFrame` throttling; `update()` queues re-renders, `finalize()` does immediate final render
- **User messages** — Also rendered as Markdown with adapted styles for blue background (semi-transparent inline code, table borders, links)
- **Thinking content** — Kept as plain text; only the answer portion gets Markdown rendering

## Conventions

- Build tool: tsup (ESM/CJS dual output + DTS)
- Testing: Vitest with happy-dom environment
- Version management: Changesets
- All code, comments, docs, git messages in English
- @webgpu/types for WebGPU TypeScript definitions
- @mlc-ai/web-llm as optional peerDependency (dynamic import)
- Astro apps (web, docs) inherit `astro/tsconfigs/strict`, not monorepo tsconfig
- Cross-app navigation: all sub-app logos/titles link back to main site `/` (not their own base path)
- Copyright notice: all app footers display `© 2026 WebLLM.io · MIT License`
- License: MIT

## Content Accuracy Conventions

- Device scoring thresholds MUST match `packages/sdk/src/capability/scoring.ts`
- Default model tiers MUST match `DEFAULT_TIERS` in `packages/sdk/src/core/resolve.ts`
- Tier mapping (grade→tier) MUST match `resolveModelForGrade()` in `packages/sdk/src/inference/local/mlc-backend.ts`
- CapabilityReport examples MUST match `packages/sdk/src/capability/types.ts`
- Cloud provider examples must only list OpenAI-compatible APIs

## Deployment

- **Hosting**: Cloudflare Pages
- **Main site project name**: `webllm-io` (domain: `webllm.io`)
- **Chat app project name**: `webllm-chat` (domain: `chat.webllm.io`)

### URL Mapping

| App | URL | Base Path Config |
|---|---|---|
| Landing Page (`apps/web`) | `webllm.io/` | — (root) |
| Documentation (`apps/docs`) | `webllm.io/docs/` | `base: '/docs'` in astro.config.mjs |
| Playground (`apps/playground`) | `webllm.io/playground/` | `base: '/playground/'` in vite.config.ts |
| Chat (`apps/chat`) | `chat.webllm.io/` | — (separate Cloudflare Pages project) |

### Build

`pnpm build:site` runs `turbo build` then `scripts/build-site.sh` which merges all three app dist outputs into `dist/site/`.

### CI/CD Workflows

- **`.github/workflows/deploy.yml`** — Deploys `dist/site/` to Cloudflare Pages on push to main
- **`.github/workflows/deploy-chat.yml`** — Deploys `apps/chat/dist` to Cloudflare Pages project `webllm-chat` on push to main when `apps/chat/**` or `packages/sdk/**` changes
- **`.github/workflows/release.yml`** — Changesets-based npm publishing on push to main (uses npm Trusted Publishing via OIDC, no token needed). Requires Node 24+ (npm >= 11.5.1 for OIDC support). `changesets/action` only creates version PRs; publishing is a separate step to avoid `.npmrc` conflicts with OIDC auth. After publishing, `pnpm changeset tag` creates git tags (e.g., `@webllm-io/sdk@1.0.0`) and pushes them to origin.
- **Changesets ignore list** — Only `@webllm-io/sdk` is published; private app packages (`web`, `docs`, `playground`, `chat`) are listed in `.changeset/config.json` `ignore` to skip version management. Note: `tsconfig` cannot be ignored because `sdk` depends on it.

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
