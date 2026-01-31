export interface CacheInfo {
  modelId: string;
  cached: boolean;
}

export interface ModelLoadState {
  modelId: string;
  status: 'idle' | 'downloading' | 'compiling' | 'ready' | 'error';
  progress: number;
  error?: Error;
}
