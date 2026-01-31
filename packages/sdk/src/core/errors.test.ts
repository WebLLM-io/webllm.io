import { describe, it, expect } from 'vitest';
import { WebLLMError } from './errors.js';

describe('WebLLMError', () => {
  it('should create an error with code and message', () => {
    const err = new WebLLMError('ABORTED', 'something went wrong');
    expect(err.code).toBe('ABORTED');
    expect(err.message).toBe('something went wrong');
    expect(err.cause).toBeUndefined();
  });

  it('should have name set to WebLLMError', () => {
    const err = new WebLLMError('TIMEOUT', 'timed out');
    expect(err.name).toBe('WebLLMError');
  });

  it('should store the cause when provided', () => {
    const original = new TypeError('network failure');
    const err = new WebLLMError('CLOUD_REQUEST_FAILED', 'request failed', original);
    expect(err.cause).toBe(original);
  });

  it('should be an instance of Error', () => {
    const err = new WebLLMError('QUEUE_FULL', 'full');
    expect(err).toBeInstanceOf(Error);
  });

  it('should be an instance of WebLLMError', () => {
    const err = new WebLLMError('INFERENCE_FAILED', 'bad');
    expect(err).toBeInstanceOf(WebLLMError);
  });

  it('should support all error codes', () => {
    const codes = [
      'WEBGPU_NOT_AVAILABLE',
      'MODEL_LOAD_FAILED',
      'INFERENCE_FAILED',
      'CLOUD_REQUEST_FAILED',
      'NO_PROVIDER_AVAILABLE',
      'ABORTED',
      'TIMEOUT',
      'QUEUE_FULL',
    ] as const;

    for (const code of codes) {
      const err = new WebLLMError(code, `test ${code}`);
      expect(err.code).toBe(code);
    }
  });
});
