import { useEffect, useCallback } from 'react';
import { createClient, checkCapability } from '@webllm-io/sdk';
import { useStore } from '../../../store';

export function useSDKInit() {
  const {
    setClient, setCapability, setPipelineStatus, setLoadProgress, setErrorMessage,
    mode, localModel, localWebWorker, localCache,
    cloudBaseURL, cloudApiKey, cloudModel, cloudTimeout, cloudRetries,
    setLastRouteDecision,
  } = useStore();

  const initClient = useCallback(() => {
    // Dispose existing client
    const currentClient = useStore.getState().client;
    if (currentClient) currentClient.dispose();

    const state = useStore.getState();

    const localConfig = state.localModel
      ? { model: state.localModel, useWebWorker: state.localWebWorker, useCache: state.localCache }
      : ('auto' as const);

    const cloudConfig = state.cloudBaseURL
      ? {
          baseURL: state.cloudBaseURL,
          ...(state.cloudApiKey && { apiKey: state.cloudApiKey }),
          ...(state.cloudModel && { model: state.cloudModel }),
          ...(state.cloudTimeout && { timeout: parseInt(state.cloudTimeout, 10) }),
          ...(state.cloudRetries && { retries: parseInt(state.cloudRetries, 10) }),
        }
      : undefined;

    const opts: Parameters<typeof createClient>[0] = {
      onRoute: (info) => {
        setLastRouteDecision(info.decision);
      },
    };

    if (state.mode === 'cloud') {
      opts.local = false;
      if (cloudConfig) opts.cloud = cloudConfig;
    } else if (state.mode === 'local') {
      opts.local = localConfig;
      opts.onProgress = handleProgress;
      opts.onError = handleInitError;
    } else {
      // auto
      if (localConfig) {
        opts.local = localConfig;
        opts.onProgress = handleProgress;
        opts.onError = handleInitError;
      }
      if (cloudConfig) opts.cloud = cloudConfig;
    }

    if (!opts.local && !opts.cloud) return;

    try {
      const client = createClient(opts);
      setClient(client);
      setPipelineStatus(opts.local ? 'initializing' : 'idle');
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage((err as Error).message);
      setPipelineStatus('error');
    }
  }, [
    setClient, setPipelineStatus, setLoadProgress, setErrorMessage, setLastRouteDecision,
    mode, localModel, localWebWorker, localCache,
    cloudBaseURL, cloudApiKey, cloudModel, cloudTimeout, cloudRetries,
  ]);

  function handleProgress(p: { stage: string; progress: number; model: string }) {
    const stage = /shader|compile/i.test(p.stage) ? 'compile' : p.progress >= 1 ? 'ready' : 'download';
    setLoadProgress({ stage: stage as 'download' | 'compile' | 'ready', progress: p.progress, model: p.model });
    setPipelineStatus('loading');

    if (p.progress >= 1) {
      setPipelineStatus('ready');
      setTimeout(() => setLoadProgress(null), 800);
    }
  }

  function handleInitError(err: Error) {
    setErrorMessage(err.message);
    setPipelineStatus('error');
  }

  // Detect capabilities on mount
  useEffect(() => {
    checkCapability().then(setCapability).catch(() => {});
  }, [setCapability]);

  return { initClient };
}
