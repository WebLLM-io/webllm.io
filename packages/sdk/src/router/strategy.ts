import type { InferenceBackend } from '../inference/backend.js';
import type { DeviceStats } from '../capability/types.js';
import type { RouteContext, RouteDecision, RouteReason } from './types.js';
import { isOffline } from './context.js';

export interface RouteInput {
  localBackend: InferenceBackend | null;
  cloudBackend: InferenceBackend | null;
  deviceStats: DeviceStats;
  forceProvider?: 'local' | 'cloud';
}

export interface RouteResult {
  decision: RouteDecision;
  backend: InferenceBackend;
  context: RouteContext;
}

export function decideRoute(input: RouteInput): RouteResult {
  const { localBackend, cloudBackend, deviceStats, forceProvider } = input;

  // Force provider override
  if (forceProvider === 'local') {
    if (!localBackend) throw routeError('local-unavailable', deviceStats);
    return result('local', localBackend, 'local-unavailable', deviceStats);
  }
  if (forceProvider === 'cloud') {
    if (!cloudBackend) throw routeError('local-unavailable', deviceStats);
    return result('cloud', cloudBackend, 'local-unavailable', deviceStats);
  }

  const hasLocal = localBackend !== null;
  const hasCloud = cloudBackend !== null;

  // Only local available
  if (hasLocal && !hasCloud) {
    return result('local', localBackend!, 'local-unavailable', deviceStats);
  }

  // Only cloud available
  if (!hasLocal && hasCloud) {
    return result('cloud', cloudBackend!, 'local-unavailable', deviceStats);
  }

  // Neither available
  if (!hasLocal && !hasCloud) {
    throw routeError('local-unavailable', deviceStats);
  }

  // Both available — decide based on context
  const reason = getRouteReason(localBackend!, deviceStats);

  if (reason) {
    // Offline → prefer local even if not ready
    if (isOffline()) {
      return result('local', localBackend!, 'offline-fallback', deviceStats);
    }
    return result('cloud', cloudBackend!, reason, deviceStats);
  }

  // Local is ready and conditions are good
  if (localBackend!.isReady()) {
    return result('local', localBackend!, 'local-unavailable', deviceStats);
  }

  // Local not ready yet → use cloud while loading
  return result('cloud', cloudBackend!, 'local-loading', deviceStats);
}

function getRouteReason(
  _localBackend: InferenceBackend,
  stats: DeviceStats,
): RouteReason | null {
  // No WebGPU
  if (!stats.gpu) return 'no-webgpu';

  // Weak device (grade C)
  if (stats.grade === 'C') return 'weak-device';

  // Low battery
  if (stats.battery && !stats.battery.charging && stats.battery.level < 0.15) {
    return 'low-battery';
  }

  return null;
}

function result(
  decision: RouteDecision,
  backend: InferenceBackend,
  reason: RouteReason,
  deviceStats: DeviceStats,
): RouteResult {
  return {
    decision,
    backend,
    context: { reason, deviceStats, attempt: 1 },
  };
}

function routeError(reason: RouteReason, deviceStats: DeviceStats): Error {
  const err = new Error(`No provider available: ${reason}`);
  err.name = 'WebLLMError';
  (err as unknown as Record<string, unknown>).code = 'NO_PROVIDER_AVAILABLE';
  (err as unknown as Record<string, unknown>).context = { reason, deviceStats, attempt: 1 };
  return err;
}
