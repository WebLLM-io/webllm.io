export type WebLLMErrorCode =
  | 'WEBGPU_NOT_AVAILABLE'
  | 'MODEL_LOAD_FAILED'
  | 'INFERENCE_FAILED'
  | 'CLOUD_REQUEST_FAILED'
  | 'NO_PROVIDER_AVAILABLE'
  | 'ABORTED'
  | 'TIMEOUT'
  | 'QUEUE_FULL';

export class WebLLMError extends Error {
  constructor(
    public code: WebLLMErrorCode,
    message: string,
    public override cause?: unknown,
  ) {
    super(message);
    this.name = 'WebLLMError';
  }
}
