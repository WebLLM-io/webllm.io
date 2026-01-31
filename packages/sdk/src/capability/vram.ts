import type { GpuInfo } from './types.js';

/**
 * Estimate available GPU memory using WebGPU API.
 * Uses maxStorageBufferBindingSize as a conservative proxy for usable VRAM.
 */
export async function detectGpu(): Promise<GpuInfo | null> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return null;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;

    const info = adapter.info;
    const device = await adapter.requestDevice();
    const maxBuffer = device.limits.maxStorageBufferBindingSize;
    device.destroy();

    // maxStorageBufferBindingSize is reported in bytes
    const vramMB = Math.round(maxBuffer / (1024 * 1024));

    return {
      vendor: info.vendor || 'unknown',
      name: info.architecture || 'unknown',
      vram: vramMB,
    };
  } catch {
    return null;
  }
}
