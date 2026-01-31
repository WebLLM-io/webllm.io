import { createClient, checkCapability } from '@webllm-io/sdk';
import type { WebLLMClient, ChatCompletionChunk, Message } from '@webllm-io/sdk';

// --- Types ---
interface PlaygroundConfig {
  mode: string;
  localModel: string;
  localWebWorker: boolean;
  localCache: boolean;
  cloudBaseURL: string;
  cloudApiKey: string;
  cloudModel: string;
  cloudTimeout: string;
  cloudRetries: string;
}

const CONFIG_KEY = 'webllm-playground-config-v2';

// --- DOM Elements ---
const sidebar = document.getElementById('sidebar')!;
const sidebarOverlay = document.getElementById('sidebar-overlay')!;
const closeSidebarBtn = document.getElementById('close-sidebar')!;
const mobileMenuBtn = document.getElementById('mobile-menu-btn')!;

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.add('hidden');
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.remove('hidden');
}

const modeTabs = document.querySelectorAll('.mode-tab');
const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
const settingsGroups = document.querySelectorAll('.settings-group');

const webgpuStatus = document.getElementById('webgpu-status')!;
const deviceGrade = document.getElementById('device-grade')!;
const vramInfo = document.getElementById('vram-info')!;

const settingLocalModel = document.getElementById('setting-local-model') as HTMLInputElement;
const settingLocalWorker = document.getElementById('setting-local-worker') as HTMLInputElement;
const settingLocalCache = document.getElementById('setting-local-cache') as HTMLInputElement;
const settingBaseURL = document.getElementById('setting-base-url') as HTMLInputElement;
const settingApiKey = document.getElementById('setting-api-key') as HTMLInputElement;
const settingModel = document.getElementById('setting-model') as HTMLInputElement;
const settingTimeout = document.getElementById('setting-timeout') as HTMLInputElement;
const settingRetries = document.getElementById('setting-retries') as HTMLInputElement;

const applySettingsBtn = document.getElementById('apply-settings-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;

const progressContainer = document.getElementById('progress-container')!;
const progressFill = document.getElementById('progress-fill')!;
const progressText = document.getElementById('progress-text')!;

const messagesDiv = document.getElementById('messages')!;
const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const abortBtn = document.getElementById('abort-btn') as HTMLButtonElement;

// --- State ---
let client: WebLLMClient | null = null;
let abortController: AbortController | null = null;
const chatHistory: Message[] = [];

// --- Config Logic ---
function loadConfig(): PlaygroundConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    mode: 'auto',
    localModel: '',
    localWebWorker: true,
    localCache: true,
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

function syncUIWithConfig(config: PlaygroundConfig) {
  // Mode Tabs
  modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-mode') === config.mode);
  });
  modeSelect.value = config.mode;
  updateSettingsVisibility(config.mode);

  // Inputs
  settingLocalModel.value = config.localModel;
  settingLocalWorker.checked = config.localWebWorker;
  settingLocalCache.checked = config.localCache;
  settingBaseURL.value = config.cloudBaseURL;
  settingApiKey.value = config.cloudApiKey;
  settingModel.value = config.cloudModel;
  settingTimeout.value = config.cloudTimeout;
  settingRetries.value = config.cloudRetries;
}

function collectConfig(): PlaygroundConfig {
  const activeTab = document.querySelector('.mode-tab.active');
  return {
    mode: activeTab?.getAttribute('data-mode') || 'auto',
    localModel: settingLocalModel.value.trim(),
    localWebWorker: settingLocalWorker.checked,
    localCache: settingLocalCache.checked,
    cloudBaseURL: settingBaseURL.value.trim(),
    cloudApiKey: settingApiKey.value.trim(),
    cloudModel: settingModel.value.trim(),
    cloudTimeout: settingTimeout.value.trim(),
    cloudRetries: settingRetries.value.trim(),
  };
}

function updateSettingsVisibility(mode: string) {
  settingsGroups.forEach(group => {
    const isCloud = group.id === 'settings-cloud';
    const isLocal = group.id === 'settings-local';
    if (mode === 'auto') group.classList.add('active');
    else if (mode === 'local') {
      isLocal ? group.classList.add('active') : group.classList.remove('active');
    } else if (mode === 'cloud') {
      isCloud ? group.classList.add('active') : group.classList.remove('active');
    }
  });
}

// --- SDK Integration ---
async function detectCapability() {
  try {
    const report = await checkCapability();
    webgpuStatus.textContent = report.webgpu ? 'Available' : 'Unavailable';
    webgpuStatus.className = `status-value ${report.webgpu ? 'success' : 'error'}`;
    deviceGrade.textContent = report.grade;
    vramInfo.textContent = report.gpu ? `${report.gpu.vram}MB` : 'Unknown';
  } catch {
    webgpuStatus.textContent = 'Error';
    webgpuStatus.className = 'status-value error';
  }
}

function buildCloudConfig(config: PlaygroundConfig) {
  if (!config.cloudBaseURL) return undefined;
  return {
    baseURL: config.cloudBaseURL,
    ...(config.cloudApiKey && { apiKey: config.cloudApiKey }),
    ...(config.cloudModel && { model: config.cloudModel }),
    ...(config.cloudTimeout && { timeout: parseInt(config.cloudTimeout, 10) }),
    ...(config.cloudRetries && { retries: parseInt(config.cloudRetries, 10) }),
  };
}

function initClient() {
  if (client) client.dispose();
  
  const config = collectConfig();
  saveConfig(config);

  const cloud = buildCloudConfig(config);
  const local = {
    model: config.localModel || undefined,
    useWebWorker: config.localWebWorker,
    useCache: config.localCache,
  };

  try {
    if (config.mode === 'local') {
      client = createClient({ local, onProgress: handleProgress });
    } else if (config.mode === 'cloud') {
      if (!cloud) {
        addSystemMessage('Please provide a Cloud Base URL.');
        return;
      }
      client = createClient({ local: false, cloud });
    } else {
      client = createClient({ local, cloud, onProgress: handleProgress });
    }
    addSystemMessage(`Client initialized: ${config.mode.toUpperCase()} mode`);
    sendBtn.disabled = false;
  } catch (err) {
    addSystemMessage(`Init Error: ${(err as Error).message}`);
  }
}

function handleProgress(p: { stage: string; progress: number; model: string }) {
  progressContainer.classList.remove('hidden');
  const percent = Math.round(p.progress * 100);
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${p.stage}: ${p.model} (${percent}%)`;
  if (p.progress >= 1) {
    setTimeout(() => progressContainer.classList.add('hidden'), 800);
  }
}

// --- UI Helpers ---
function addMessage(role: 'user' | 'assistant', content: string) {
  // Remove empty state if present
  const empty = messagesDiv.querySelector('.empty-state');
  if (empty) empty.remove();

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  msgDiv.appendChild(contentDiv);
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return contentDiv;
}

function addSystemMessage(text: string) {
  const div = document.createElement('div');
  div.className = 'system-tag';
  div.textContent = `• ${text} •`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Chat Actions ---
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || !client) return;

  userInput.value = '';
  userInput.style.height = 'auto';
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  sendBtn.classList.add('hidden');
  abortBtn.classList.remove('hidden');
  abortController = new AbortController();

  const assistantContent = addMessage('assistant', '');
  let fullContent = '';
  let modelName = '';

  try {
    const stream = client.chat.completions.create({
      messages: [...chatHistory],
      stream: true,
      signal: abortController.signal,
    });

    for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
      if (!modelName && chunk.model) modelName = chunk.model;
      const delta = chunk.choices[0]?.delta?.content ?? '';
      fullContent += delta;
      assistantContent.textContent = fullContent;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    if (modelName) {
      const tag = document.createElement('span');
      tag.className = 'model-tag';
      tag.textContent = modelName;
      assistantContent.parentElement?.appendChild(tag);
    }
    chatHistory.push({ role: 'assistant', content: fullContent });

  } catch (err: any) {
    if (err.name === 'AbortError') {
      assistantContent.textContent += ' [Interrupted]';
    } else {
      assistantContent.textContent = `Error: ${err.message}`;
      assistantContent.style.color = 'var(--error)';
    }
  } finally {
    sendBtn.classList.remove('hidden');
    abortBtn.classList.add('hidden');
    abortController = null;
  }
}

// --- Event Listeners ---
mobileMenuBtn.addEventListener('click', openSidebar);
closeSidebarBtn.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const mode = tab.getAttribute('data-mode')!;
    updateSettingsVisibility(mode);
    initClient();
  });
});

userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = userInput.scrollHeight + 'px';
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

sendBtn.addEventListener('click', handleSend);
abortBtn.addEventListener('click', () => abortController?.abort());

applySettingsBtn.addEventListener('click', () => {
  initClient();
  if (window.innerWidth <= 768) closeSidebar();
});

clearBtn.addEventListener('click', () => {
  chatHistory.length = 0;
  messagesDiv.innerHTML = `
    <div class="empty-state">
      <div class="logo-large">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      </div>
      <h2>WebLLM Playground</h2>
      <p>Run large language models directly in your browser.</p>
    </div>
  `;
  addSystemMessage('Chat history cleared');
  if (window.innerWidth <= 768) closeSidebar();
});

// --- Boot ---
const initialConfig = loadConfig();
syncUIWithConfig(initialConfig);
detectCapability();
initClient();