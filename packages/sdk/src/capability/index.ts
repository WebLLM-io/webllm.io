export { checkCapability, collectDeviceStats } from './detector.js';
export { checkWebGPU } from './webgpu.js';
export { detectGpu } from './vram.js';
export { scoreDevice } from './scoring.js';
export type {
  CapabilityReport,
  DeviceStats,
  DeviceGrade,
  GpuInfo,
  BatteryInfo,
} from './types.js';
