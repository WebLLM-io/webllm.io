import type { DeviceGrade } from './types.js';

/**
 * Score a device based on estimated VRAM (in MB).
 *
 * S: ≥8192 MB — High-end desktop GPU, can run 8B+ models
 * A: ≥4096 MB — Mid-range GPU, can run 8B quantized models
 * B: ≥2048 MB — Low-end GPU, can run small models (3B or less)
 * C: <2048 MB — Insufficient for local inference
 */
export function scoreDevice(vramMB: number): DeviceGrade {
  if (vramMB >= 8192) return 'S';
  if (vramMB >= 4096) return 'A';
  if (vramMB >= 2048) return 'B';
  return 'C';
}
