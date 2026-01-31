import type { ModelLoadState } from './types.js';
import { EventEmitter } from '../utils/event-emitter.js';

type LoaderEvents = {
  stateChange: ModelLoadState;
};

export class LoadManager extends EventEmitter<LoaderEvents> {
  private states = new Map<string, ModelLoadState>();

  getState(modelId: string): ModelLoadState {
    return (
      this.states.get(modelId) ?? {
        modelId,
        status: 'idle',
        progress: 0,
      }
    );
  }

  updateState(modelId: string, update: Partial<ModelLoadState>): void {
    const current = this.getState(modelId);
    const next = { ...current, ...update };
    this.states.set(modelId, next);
    this.emit('stateChange', next);
  }

  isLoaded(modelId: string): boolean {
    return this.getState(modelId).status === 'ready';
  }

  clear(): void {
    this.states.clear();
  }
}
