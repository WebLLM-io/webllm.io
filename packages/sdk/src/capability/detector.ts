import type { BatteryInfo, CapabilityReport, ConnectionInfo, DeviceStats } from './types.js';
import { checkWebGPU } from './webgpu.js';
import { detectGpu } from './vram.js';
import { scoreDevice } from './scoring.js';

async function getConnectionInfo(): Promise<ConnectionInfo> {
  const nav = navigator as unknown as {
    connection?: { type?: string; downlink?: number; saveData?: boolean };
  };
  const conn = nav.connection;
  return {
    type: conn?.type ?? 'unknown',
    downlink: conn?.downlink ?? 0,
    saveData: conn?.saveData ?? false,
  };
}

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

function getDeviceMemory(): number {
  const nav = navigator as unknown as { deviceMemory?: number };
  return nav.deviceMemory ?? 0;
}

export async function collectDeviceStats(): Promise<DeviceStats> {
  const [gpu, connection, battery] = await Promise.all([
    detectGpu(),
    getConnectionInfo(),
    getBatteryInfo(),
  ]);

  const grade = scoreDevice(gpu?.vram ?? 0);
  const memory = getDeviceMemory();

  return { gpu, grade, connection, battery, memory };
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
    connection: stats.connection,
    battery: stats.battery,
    memory: stats.memory,
  };
}
