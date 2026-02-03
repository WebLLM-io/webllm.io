---
"@webllm-io/sdk": minor
---

Add `status()` API to WebLLMClient for runtime state inspection, `onRoute` and `onError` callbacks to CreateClientOptions for route observability and error handling, and `usage` field to ChatCompletionChunk for streaming token counts. Remove `ConnectionInfo` from capability API (breaking: type removed, but unlikely to be depended on externally).
