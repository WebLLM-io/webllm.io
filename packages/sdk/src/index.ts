// Public API
export { createClient } from './core/client.js';
export type { WebLLMClient, ClientStatus } from './core/client.js';
export type { CreateClientOptions, LoadProgress, ProgressCallback, RouteCallback } from './core/config.js';
export type {
  LocalConfig,
  LocalObjectConfig,
  CloudConfig,
  CloudObjectConfig,
  CloudFn,
  TiersConfig,
} from './core/config.js';
export { WebLLMError } from './core/errors.js';
export type { WebLLMErrorCode } from './core/errors.js';

// Capability
export { checkCapability } from './capability/index.js';
export type { CapabilityReport, DeviceStats, DeviceGrade, GpuInfo } from './capability/index.js';

// Providers
export { mlc } from './providers/mlc.js';
export { fetchSSE } from './providers/fetch.js';
export type { ResolvedLocalBackend, ResolvedCloudBackend } from './providers/types.js';

// Chat types
export type {
  Message,
  TextContentPart,
  ContentPart,
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionRequest,
  Completions,
} from './chat/types.js';

// Chat utilities
export { flattenContent } from './chat/content.js';

// Loader
export { hasModelInCache, deleteModelFromCache } from './loader/index.js';

// Router types
export type { RouteContext, RouteReason } from './router/types.js';

// Structured output helper
export { withJsonOutput } from './chat/structured-output.js';
