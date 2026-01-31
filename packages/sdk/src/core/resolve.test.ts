import { describe, it, expect, vi } from 'vitest';
import { resolveLocal, resolveCloud } from './resolve.js';

// Mock the provider modules
vi.mock('../providers/mlc.js', () => ({
  mlc: vi.fn((opts: unknown) => ({
    __kind: 'resolved-local' as const,
    providerName: 'mlc',
    _opts: opts,
    createBackend: vi.fn(),
  })),
}));

vi.mock('../providers/fetch.js', () => ({
  fetchSSE: vi.fn((opts: unknown) => ({
    __kind: 'resolved-cloud' as const,
    providerName: 'fetchSSE',
    _opts: opts,
    createBackend: vi.fn(),
  })),
}));

vi.mock('../providers/custom.js', () => ({
  customLocal: vi.fn((fn: unknown) => ({
    __kind: 'resolved-local' as const,
    providerName: 'custom-local',
    _fn: fn,
    createBackend: vi.fn(),
  })),
  customCloud: vi.fn((fn: unknown) => ({
    __kind: 'resolved-cloud' as const,
    providerName: 'custom-cloud',
    _fn: fn,
    createBackend: vi.fn(),
  })),
}));

describe('resolveLocal', () => {
  it('should return mlc provider when config is "auto"', () => {
    const result = resolveLocal('auto');
    expect(result).not.toBeNull();
    expect(result!.__kind).toBe('resolved-local');
    expect(result!.providerName).toBe('mlc');
  });

  it('should return mlc provider when config is undefined (default)', () => {
    const result = resolveLocal();
    expect(result).not.toBeNull();
    expect(result!.__kind).toBe('resolved-local');
  });

  it('should return null when config is false', () => {
    expect(resolveLocal(false)).toBeNull();
  });

  it('should return null when config is null', () => {
    expect(resolveLocal(null as unknown as false)).toBeNull();
  });

  it('should return mlc with model when config is a string', () => {
    const result = resolveLocal('my-model');
    expect(result).not.toBeNull();
    expect(result!.__kind).toBe('resolved-local');
    expect((result as unknown as Record<string, unknown>)._opts).toEqual({ model: 'my-model' });
  });

  it('should return mlc with options when config is an object', () => {
    const opts = { model: 'custom', useCache: true };
    const result = resolveLocal(opts);
    expect(result).not.toBeNull();
    expect(result!.__kind).toBe('resolved-local');
    expect((result as unknown as Record<string, unknown>)._opts).toEqual(opts);
  });

  it('should return custom provider when config is a function', () => {
    const fn = vi.fn();
    const result = resolveLocal(fn as never);
    expect(result).not.toBeNull();
    expect(result!.__kind).toBe('resolved-local');
    expect(result!.providerName).toBe('custom-local');
  });

  it('should pass through an already-resolved local backend', () => {
    const resolved = {
      __kind: 'resolved-local' as const,
      providerName: 'pre-resolved',
      createBackend: vi.fn(),
    };
    const result = resolveLocal(resolved as never);
    expect(result).toBe(resolved);
  });
});

describe('resolveCloud', () => {
  it('should return null when config is undefined', () => {
    expect(resolveCloud()).toBeNull();
  });

  it('should return null when config is null', () => {
    expect(resolveCloud(null as never)).toBeNull();
  });

  it('should return fetchSSE when config is a string (baseURL)', () => {
    const result = resolveCloud('https://api.example.com');
    expect(result).not.toBeNull();
    expect(result!.__kind).toBe('resolved-cloud');
    expect((result as unknown as Record<string, unknown>)._opts).toEqual({
      baseURL: 'https://api.example.com',
    });
  });

  it('should return fetchSSE when config is an object', () => {
    const opts = { baseURL: 'https://api.example.com', apiKey: 'key' };
    const result = resolveCloud(opts);
    expect(result).not.toBeNull();
    expect(result!.__kind).toBe('resolved-cloud');
    expect((result as unknown as Record<string, unknown>)._opts).toEqual(opts);
  });

  it('should return custom provider when config is a function', () => {
    const fn = vi.fn();
    const result = resolveCloud(fn as never);
    expect(result).not.toBeNull();
    expect(result!.__kind).toBe('resolved-cloud');
    expect(result!.providerName).toBe('custom-cloud');
  });

  it('should pass through an already-resolved cloud backend', () => {
    const resolved = {
      __kind: 'resolved-cloud' as const,
      providerName: 'pre-resolved',
      createBackend: vi.fn(),
    };
    const result = resolveCloud(resolved as never);
    expect(result).toBe(resolved);
  });
});
