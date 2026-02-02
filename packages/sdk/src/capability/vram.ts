import type { GpuInfo } from './types.js';

/** WebGPU spec default for maxStorageBufferBindingSize (128 MB). */
const WEBGPU_DEFAULT_MAX_BUFFER = 128;

/**
 * Read `navigator.deviceMemory` (GB) if available, otherwise 0.
 * Note: most browsers cap this value at 8 GB for privacy reasons.
 */
export function getDeviceMemory(): number {
  if (typeof navigator === 'undefined') return 0;
  const nav = navigator as unknown as { deviceMemory?: number };
  return nav.deviceMemory ?? 0;
}

/**
 * Estimate available GPU memory using WebGPU API.
 *
 * Reads `adapter.limits.maxStorageBufferBindingSize` directly instead of
 * creating a device (which would return default limits, not hardware limits).
 *
 * For Apple Silicon unified-memory devices where the adapter still reports
 * the WebGPU default (≤128 MB), a conservative heuristic based on
 * `navigator.deviceMemory` is used as a fallback.
 */
export async function detectGpu(): Promise<GpuInfo | null> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return null;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;

    const info = adapter.info;

    // Read hardware limits directly from the adapter (not from a default device)
    const maxBuffer = adapter.limits.maxStorageBufferBindingSize;
    let vramMB = Math.round(maxBuffer / (1024 * 1024));

    // If the adapter reports ≤128 MB (the WebGPU spec default), the browser
    // may not be exposing real hardware capabilities. Fall back to a
    // deviceMemory-based heuristic.
    if (vramMB <= WEBGPU_DEFAULT_MAX_BUFFER) {
      const vendor = (info.vendor || 'unknown').toLowerCase();
      const deviceMemGB = getDeviceMemory();

      if (vendor === 'apple' && deviceMemGB > 0) {
        // Apple Silicon unified memory: conservatively use 50% of system RAM
        vramMB = Math.round(deviceMemGB * 1024 * 0.5);
      } else if (deviceMemGB > 0) {
        // Non-Apple: use 25% of deviceMemory as a conservative floor
        vramMB = Math.max(vramMB, Math.round(deviceMemGB * 1024 * 0.25));
      }
    }

    return {
      vendor: info.vendor || 'unknown',
      name: info.architecture || 'unknown',
      vram: vramMB,
    };
  } catch {
    return null;
  }
}
