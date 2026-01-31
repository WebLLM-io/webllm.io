import type { DeviceStats } from '../capability/types.js';

export type RouteReason =
  | 'local-unavailable'
  | 'local-loading'
  | 'local-error'
  | 'low-battery'
  | 'weak-device'
  | 'no-webgpu'
  | 'offline-fallback';

export interface RouteContext {
  reason: RouteReason;
  deviceStats: DeviceStats;
  attempt: number;
}

export type RouteDecision = 'local' | 'cloud';
