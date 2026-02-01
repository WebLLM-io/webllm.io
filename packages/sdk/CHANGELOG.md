# @webllm-io/sdk

## 1.0.0

### Major Changes

- 7bf5f19: BREAKING: `createClient()` no longer enables local inference by default.
  Both `local` and `cloud` now default to disabled. Pass `local: 'auto'`
  to restore previous behavior.
