# @webllm-io/sdk

## 1.1.0

### Minor Changes

- b323592: Add `status()` API to WebLLMClient for runtime state inspection, `onRoute` and `onError` callbacks to CreateClientOptions for route observability and error handling, and `usage` field to ChatCompletionChunk for streaming token counts. Remove `ConnectionInfo` from capability API (breaking: type removed, but unlikely to be depended on externally).

## 1.0.0

### Major Changes

- 7bf5f19: BREAKING: `createClient()` no longer enables local inference by default.
  Both `local` and `cloud` now default to disabled. Pass `local: 'auto'`
  to restore previous behavior.
