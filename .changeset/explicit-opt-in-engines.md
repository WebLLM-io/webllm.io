---
"@webllm-io/sdk": major
---

BREAKING: `createClient()` no longer enables local inference by default.
Both `local` and `cloud` now default to disabled. Pass `local: 'auto'`
to restore previous behavior.
