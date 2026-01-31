import type { DeviceStats } from '../capability/types.js';
import { collectDeviceStats } from '../capability/detector.js';

let cachedStats: DeviceStats | null = null;

export async function getDeviceContext(): Promise<DeviceStats> {
  if (cachedStats) return cachedStats;
  cachedStats = await collectDeviceStats();
  return cachedStats;
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}
