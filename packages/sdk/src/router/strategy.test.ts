import { describe, it, expect, vi } from 'vitest';
import { decideRoute } from './strategy.js';
import type { RouteInput } from './strategy.js';
import type { InferenceBackend } from '../inference/backend.js';
import type { DeviceStats } from '../capability/types.js';

// Mock the isOffline function
vi.mock('./context.js', () => ({
  isOffline: vi.fn(() => false),
}));

function mockBackend(ready = false): InferenceBackend {
  return {
    isReady: vi.fn(() => ready),
    initialize: vi.fn(async () => {}),
    complete: vi.fn(async () => ({
      id: 'x',
      object: 'chat.completion' as const,
      created: 0,
      model: 'm',
      choices: [{ index: 0, message: { role: 'assistant' as const, content: '' }, finish_reason: 'stop' as const }],
    })),
    stream: vi.fn(async function* () {}),
    dispose: vi.fn(async () => {}),
  };
}

function makeStats(overrides: Partial<DeviceStats> = {}): DeviceStats {
  return {
    gpu: { vendor: 'NVIDIA', name: 'RTX 4090', vram: 16384 },
    grade: 'S',
    connection: { type: 'wifi', downlink: 10, saveData: false },
    battery: { level: 0.8, charging: true },
    memory: 16384,
    ...overrides,
  };
}

describe('decideRoute', () => {
  describe('force provider', () => {
    it('should use local when forced to local', () => {
      const local = mockBackend(true);
      const cloud = mockBackend();
      const result = decideRoute({
        localBackend: local,
        cloudBackend: cloud,
        deviceStats: makeStats(),
        forceProvider: 'local',
      });
      expect(result.decision).toBe('local');
      expect(result.backend).toBe(local);
    });

    it('should throw when forced to local but no local backend', () => {
      expect(() =>
        decideRoute({
          localBackend: null,
          cloudBackend: mockBackend(),
          deviceStats: makeStats(),
          forceProvider: 'local',
        }),
      ).toThrow();
    });

    it('should use cloud when forced to cloud', () => {
      const cloud = mockBackend();
      const result = decideRoute({
        localBackend: mockBackend(),
        cloudBackend: cloud,
        deviceStats: makeStats(),
        forceProvider: 'cloud',
      });
      expect(result.decision).toBe('cloud');
      expect(result.backend).toBe(cloud);
    });

    it('should throw when forced to cloud but no cloud backend', () => {
      expect(() =>
        decideRoute({
          localBackend: mockBackend(),
          cloudBackend: null,
          deviceStats: makeStats(),
          forceProvider: 'cloud',
        }),
      ).toThrow();
    });
  });

  describe('single provider', () => {
    it('should use local when only local is available', () => {
      const local = mockBackend();
      const result = decideRoute({
        localBackend: local,
        cloudBackend: null,
        deviceStats: makeStats(),
      });
      expect(result.decision).toBe('local');
      expect(result.backend).toBe(local);
    });

    it('should use cloud when only cloud is available', () => {
      const cloud = mockBackend();
      const result = decideRoute({
        localBackend: null,
        cloudBackend: cloud,
        deviceStats: makeStats(),
      });
      expect(result.decision).toBe('cloud');
      expect(result.backend).toBe(cloud);
    });
  });

  describe('neither provider', () => {
    it('should throw when neither provider is available', () => {
      expect(() =>
        decideRoute({
          localBackend: null,
          cloudBackend: null,
          deviceStats: makeStats(),
        }),
      ).toThrow();
    });
  });

  describe('both providers — routing logic', () => {
    it('should route to cloud when grade is C (weak device)', () => {
      const cloud = mockBackend();
      const result = decideRoute({
        localBackend: mockBackend(true),
        cloudBackend: cloud,
        deviceStats: makeStats({ grade: 'C' }),
      });
      expect(result.decision).toBe('cloud');
      expect(result.context.reason).toBe('weak-device');
    });

    it('should route to cloud when no GPU', () => {
      const cloud = mockBackend();
      const result = decideRoute({
        localBackend: mockBackend(true),
        cloudBackend: cloud,
        deviceStats: makeStats({ gpu: null }),
      });
      expect(result.decision).toBe('cloud');
      expect(result.context.reason).toBe('no-webgpu');
    });

    it('should route to cloud when battery is low and not charging', () => {
      const cloud = mockBackend();
      const result = decideRoute({
        localBackend: mockBackend(true),
        cloudBackend: cloud,
        deviceStats: makeStats({
          battery: { level: 0.10, charging: false },
        }),
      });
      expect(result.decision).toBe('cloud');
      expect(result.context.reason).toBe('low-battery');
    });

    it('should NOT route to cloud when battery is low but charging', () => {
      const local = mockBackend(true);
      const result = decideRoute({
        localBackend: local,
        cloudBackend: mockBackend(),
        deviceStats: makeStats({
          battery: { level: 0.10, charging: true },
        }),
      });
      expect(result.decision).toBe('local');
    });

    it('should use local when local is ready and conditions are good', () => {
      const local = mockBackend(true);
      const result = decideRoute({
        localBackend: local,
        cloudBackend: mockBackend(),
        deviceStats: makeStats(),
      });
      expect(result.decision).toBe('local');
      expect(result.backend).toBe(local);
    });

    it('should use cloud when local is not ready (loading)', () => {
      const local = mockBackend(false);
      const cloud = mockBackend();
      const result = decideRoute({
        localBackend: local,
        cloudBackend: cloud,
        deviceStats: makeStats(),
      });
      expect(result.decision).toBe('cloud');
      expect(result.context.reason).toBe('local-loading');
    });

    it('should route to cloud for grade A (good device, not weak)', () => {
      const local = mockBackend(true);
      const result = decideRoute({
        localBackend: local,
        cloudBackend: mockBackend(),
        deviceStats: makeStats({ grade: 'A' }),
      });
      // Grade A is not weak, so local should be used if ready
      expect(result.decision).toBe('local');
    });

    it('should route to cloud for grade B (not weak)', () => {
      const local = mockBackend(true);
      const result = decideRoute({
        localBackend: local,
        cloudBackend: mockBackend(),
        deviceStats: makeStats({ grade: 'B' }),
      });
      // Grade B is not weak either
      expect(result.decision).toBe('local');
    });
  });
});
