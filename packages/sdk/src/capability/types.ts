export type DeviceGrade = 'S' | 'A' | 'B' | 'C';

export interface GpuInfo {
  vendor: string;
  name: string;
  vram: number;
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
}

export interface DeviceStats {
  gpu: GpuInfo | null;
  grade: DeviceGrade;
  battery: BatteryInfo | null;
  memory: number;
}

export interface CapabilityReport {
  webgpu: boolean;
  gpu: GpuInfo | null;
  grade: DeviceGrade;
  battery: BatteryInfo | null;
  memory: number;
}
