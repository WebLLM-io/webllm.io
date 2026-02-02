import type { ChatCompletion, ChatCompletionChunk, Message } from '../chat/types.js';
import type { ResolvedCloudBackend, ResolvedLocalBackend } from '../providers/types.js';
import type { DeviceStats } from '../capability/types.js';
import type { RouteContext } from '../router/types.js';

// --- Load progress ---

export interface LoadProgress {
  stage: 'download' | 'compile' | 'warmup';
  progress: number;
  model: string;
  bytesLoaded?: number;
  bytesTotal?: number;
}

export type ProgressCallback = (progress: LoadProgress) => void;

// --- Tiers config ---

export interface TiersConfig {
  high?: string | 'auto' | null;
  medium?: string | 'auto' | null;
  low?: string | 'auto' | null;
}

// --- Local config ---

export interface LocalObjectConfig {
  tiers?: TiersConfig;
  model?: string;
  useCache?: boolean;
  useWebWorker?: boolean;
}

export type LocalConfig =
  | 'auto'
  | false
  | null
  | string
  | LocalObjectConfig
  | ((stats: DeviceStats) => string | null)
  | ResolvedLocalBackend;

// --- Cloud config ---

export interface CloudObjectConfig {
  baseURL: string;
  apiKey?: string;
  model?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export type CloudFn = (
  messages: Message[],
  context: RouteContext,
) => Promise<ChatCompletion> | AsyncIterable<ChatCompletionChunk>;

export type CloudConfig =
  | string
  | CloudObjectConfig
  | CloudFn
  | ResolvedCloudBackend;

// --- Route callback ---

export type RouteCallback = (info: { decision: 'local' | 'cloud'; reason: string }) => void;

// --- CreateClient options ---

export interface CreateClientOptions {
  local?: LocalConfig;
  cloud?: CloudConfig;
  onProgress?: ProgressCallback;
  onRoute?: RouteCallback;
  onError?: (error: Error) => void;
}
