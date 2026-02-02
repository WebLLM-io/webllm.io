import type { BatteryInfo, CapabilityReport, DeviceStats } from './types.js';
import { checkWebGPU } from './webgpu.js';
import { detectGpu, getDeviceMemory } from './vram.js';
import { scoreDevice } from './scoring.js';

async function getBatteryInfo(): Promise<BatteryInfo | null> {
  try {
    const nav = navigator as unknown as {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (!nav.getBattery) return null;
    const battery = await nav.getBattery();
    return { level: battery.level, charging: battery.charging };
  } catch {
    return null;
  }
}

export async function collectDeviceStats(): Promise<DeviceStats> {
  const [gpu, battery] = await Promise.all([
    detectGpu(),
    getBatteryInfo(),
  ]);

  const grade = scoreDevice(gpu?.vram ?? 0);
  const memory = getDeviceMemory();

  return { gpu, grade, battery, memory };
}

export async function checkCapability(): Promise<CapabilityReport> {
  const [webgpu, stats] = await Promise.all([
    checkWebGPU(),
    collectDeviceStats(),
  ]);

  return {
    webgpu,
    gpu: stats.gpu,
    grade: stats.grade,
    battery: stats.battery,
    memory: stats.memory,
  };
}
