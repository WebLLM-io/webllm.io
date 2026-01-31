export interface CloudBackendConfig {
  baseURL: string;
  apiKey?: string;
  model?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}
