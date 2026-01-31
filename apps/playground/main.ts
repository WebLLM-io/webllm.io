import { createClient, checkCapability } from '@webllm-io/sdk';
import type { WebLLMClient, ChatCompletionChunk, Message } from '@webllm-io/sdk';

// --- Playground config persistence ---
interface PlaygroundConfig {
  mode: string;
  // local
  localModel: string;
  localWebWorker: string;
  localCache: string;
  // cloud
  cloudBaseURL: string;
  cloudApiKey: string;
  cloudModel: string;
  cloudTimeout: string;
  cloudRetries: string;
}

const CONFIG_KEY = 'webllm-playground-config';

function loadConfig(): PlaygroundConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt data */ }
  return {
    mode: 'auto',
    localModel: '',
    localWebWorker: 'true',
    localCache: 'true',
    cloudBaseURL: '',
    cloudApiKey: '',
    cloudModel: '',
    cloudTimeout: '',
    cloudRetries: '',
  };
}

function saveConfig(config: PlaygroundConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function collectConfig(): PlaygroundConfig {
  return {
    mode: modeSelect.value,
    localModel: settingLocalModel.value.trim(),
    localWebWorker: settingLocalWorker.value,
    localCache: settingLocalCache.value,
    cloudBaseURL: settingBaseURL.value.trim(),
    cloudApiKey: settingApiKey.value.trim(),
    cloudModel: settingModel.value.trim(),
    cloudTimeout: settingTimeout.value.trim(),
    cloudRetries: settingRetries.value.trim(),
  };
}

function applyConfigToDOM(config: PlaygroundConfig) {
  modeSelect.value = config.mode;
  settingLocalModel.value = config.localModel ?? '';
  settingLocalWorker.value = config.localWebWorker ?? 'true';
  settingLocalCache.value = config.localCache ?? 'true';
  settingBaseURL.value = config.cloudBaseURL;
  settingApiKey.value = config.cloudApiKey;
  settingModel.value = config.cloudModel;
  settingTimeout.value = config.cloudTimeout;
  settingRetries.value = config.cloudRetries;
}

// --- DOM elements ---
const webgpuStatus = document.getElementById('webgpu-status')!;
const deviceGrade = document.getElementById('device-grade')!;
const vramInfo = document.getElementById('vram-info')!;
const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
const settingsToggle = document.getElementById('settings-toggle') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const settingsPanel = document.getElementById('settings-panel')!;
const settingLocalModel = document.getElementById('setting-local-model') as HTMLInputElement;
const settingLocalWorker = document.getElementById('setting-local-worker') as HTMLSelectElement;
const settingLocalCache = document.getElementById('setting-local-cache') as HTMLSelectElement;
const settingBaseURL = document.getElementById('setting-base-url') as HTMLInputElement;
const settingApiKey = document.getElementById('setting-api-key') as HTMLInputElement;
const settingModel = document.getElementById('setting-model') as HTMLInputElement;
const settingTimeout = document.getElementById('setting-timeout') as HTMLInputElement;
const settingRetries = document.getElementById('setting-retries') as HTMLInputElement;
const applySettingsBtn = document.getElementById('apply-settings-btn') as HTMLButtonElement;
const progressContainer = document.getElementById('progress-container')!;
const progressFill = document.getElementById('progress-fill')!;
const progressText = document.getElementById('progress-text')!;
const messagesDiv = document.getElementById('messages')!;
const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const abortBtn = document.getElementById('abort-btn') as HTMLButtonElement;

let client: WebLLMClient | null = null;
let abortController: AbortController | null = null;
const messages: Message[] = [];

// --- Capability detection ---
async function detectCapability() {
  try {
    const report = await checkCapability();
    webgpuStatus.textContent = report.webgpu ? 'WebGPU ✓' : 'No WebGPU';
    webgpuStatus.style.color = report.webgpu ? '#3fb950' : '#f85149';
    deviceGrade.textContent = `Grade: ${report.grade}`;
    vramInfo.textContent = report.gpu
      ? `VRAM: ~${report.gpu.vram}MB`
      : 'No GPU info';
  } catch {
    webgpuStatus.textContent = 'Detection failed';
  }
}

// --- Build cloud config from settings ---
function buildCloudConfig(): import('@webllm-io/sdk').CloudConfig | undefined {
  const baseURL = settingBaseURL.value.trim();
  const apiKey = settingApiKey.value.trim();
  const model = settingModel.value.trim();
  const timeout = settingTimeout.value.trim();
  const retries = settingRetries.value.trim();

  if (!baseURL) return undefined;

  // If only baseURL is provided, return as string
  if (!apiKey && !model && !timeout && !retries) {
    return baseURL;
  }

  // Build full object config
  return {
    baseURL,
    ...(apiKey && { apiKey }),
    ...(model && { model }),
    ...(timeout && { timeout: parseInt(timeout, 10) }),
    ...(retries && { retries: parseInt(retries, 10) }),
  };
}

// --- Build local config from settings ---
function buildLocalConfig(): import('@webllm-io/sdk').LocalConfig {
  const model = settingLocalModel.value.trim();
  const useWebWorker = settingLocalWorker.value !== 'false';
  const useCache = settingLocalCache.value !== 'false';

  // If all defaults, return 'auto'
  if (!model && useWebWorker && useCache) return 'auto';

  return {
    ...(model ? { model } : {}),
    useWebWorker,
    useCache,
  };
}

// --- Client initialization ---
function initClient() {
  if (client) {
    client.dispose();
    client = null;
  }

  const config = collectConfig();
  saveConfig(config);

  const mode = modeSelect.value;
  const cloud = buildCloudConfig();

  try {
    if (mode === 'local') {
      client = createClient({
        local: buildLocalConfig(),
        onProgress: handleProgress,
      });
    } else if (mode === 'cloud') {
      if (!cloud) {
        addSystemMessage('Please configure a Cloud Base URL in Settings for cloud-only mode.');
        return;
      }
      client = createClient({
        local: false,
        cloud,
      });
    } else {
      // auto mode
      client = createClient({
        local: buildLocalConfig(),
        cloud,
        onProgress: handleProgress,
      });
    }
    addSystemMessage(`Client initialized (${mode} mode)`);
  } catch (err) {
    addSystemMessage(`Failed to initialize: ${(err as Error).message}`);
  }
}

function handleProgress(p: { stage: string; progress: number; model: string }) {
  progressContainer.classList.remove('hidden');
  progressFill.style.width = `${Math.round(p.progress * 100)}%`;
  progressText.textContent = `${p.stage}: ${p.model} (${Math.round(p.progress * 100)}%)`;
  if (p.progress >= 1) {
    setTimeout(() => progressContainer.classList.add('hidden'), 1000);
  }
}

// --- Message display ---
function addMessage(role: 'user' | 'assistant' | 'system', content: string): HTMLDivElement {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = content;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return div;
}

function addSystemMessage(content: string) {
  const div = addMessage('assistant', `[System] ${content}`);
  div.style.color = '#888';
  div.style.fontStyle = 'italic';
}

// --- Clear chat ---
function clearChat() {
  messages.length = 0;
  messagesDiv.innerHTML = '';
  addSystemMessage('Chat cleared.');
}

// --- Send message ---
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || !client) return;

  userInput.value = '';
  addMessage('user', text);
  messages.push({ role: 'user', content: text });

  sendBtn.disabled = true;
  abortBtn.classList.remove('hidden');
  abortController = new AbortController();

  const assistantDiv = addMessage('assistant', '');
  let fullContent = '';
  let responseModel = '';

  try {
    const stream = client.chat.completions.create({
      messages: [...messages],
      stream: true,
      signal: abortController.signal,
    });

    for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
      if (!responseModel && chunk.model) {
        responseModel = chunk.model;
      }
      const delta = chunk.choices[0]?.delta?.content ?? '';
      fullContent += delta;
      assistantDiv.textContent = fullContent;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Wrap content in span and append model tag
    const contentSpan = document.createElement('span');
    contentSpan.textContent = fullContent;
    assistantDiv.innerHTML = '';
    assistantDiv.appendChild(contentSpan);
    if (responseModel) {
      const tag = document.createElement('span');
      tag.className = 'model-tag';
      tag.textContent = responseModel;
      assistantDiv.appendChild(tag);
    }

    messages.push({ role: 'assistant', content: fullContent });
  } catch (err) {
    const error = err as Error;
    if (error.message?.includes('abort') || error.message?.includes('Abort')) {
      assistantDiv.textContent = fullContent + '\n[Aborted]';
    } else {
      assistantDiv.textContent = `[Error] ${error.message}`;
      assistantDiv.style.color = '#f85149';
    }
  } finally {
    sendBtn.disabled = false;
    abortBtn.classList.add('hidden');
    abortController = null;
  }
}

// --- Settings toggle ---
function toggleSettings() {
  const isHidden = settingsPanel.classList.contains('hidden');
  settingsPanel.classList.toggle('hidden');
  settingsToggle.classList.toggle('active', isHidden);
}

// --- Event listeners ---
modeSelect.addEventListener('change', initClient);

settingsToggle.addEventListener('click', toggleSettings);

clearBtn.addEventListener('click', clearChat);

applySettingsBtn.addEventListener('click', initClient);

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

abortBtn.addEventListener('click', () => {
  abortController?.abort();
});

// --- Init ---
applyConfigToDOM(loadConfig());
detectCapability();
initClient();
