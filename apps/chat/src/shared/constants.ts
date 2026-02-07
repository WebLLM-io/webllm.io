export const GRADE_THRESHOLDS: Record<string, string> = {
  S: '\u2265 8192 MB',
  A: '\u2265 4096 MB',
  B: '\u2265 2048 MB',
  C: '< 2048 MB',
};

export const RECOMMENDED_MODELS: Record<string, string> = {
  S: 'Qwen3-8B-q4f16_1-MLC',
  A: 'Qwen3-8B-q4f16_1-MLC',
  B: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  C: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
};

export const IDB_STORE_KEY = 'webllm-chat-conversations';
export const SETTINGS_STORE_KEY = 'webllm-chat-settings';
