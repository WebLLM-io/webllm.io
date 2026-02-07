import { createClient, checkCapability, hasModelInCache } from '@webllm-io/sdk';
import type { WebLLMClient, ChatCompletionChunk, Message } from '@webllm-io/sdk';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import 'highlight.js/styles/github-dark.css';
import { renderMarkdown, initCodeCopyHandler, createStreamRenderer } from './markdown';

// --- Types ---
interface ModelOption {
  model_id: string;
  cached: boolean;
  recommended: boolean;
}

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

interface ThinkingResult {
  thinking: string;
  answer: string;
  isThinking: boolean;
}

type PipelineStatus = 'idle' | 'initializing' | 'loading' | 'ready' | 'error';

const CONFIG_KEY = 'webllm-playground-config-v2';

const GRADE_THRESHOLDS: Record<string, string> = {
  S: '\u2265 8192 MB',
  A: '\u2265 4096 MB',
  B: '\u2265 2048 MB',
  C: '< 2048 MB',
};

// Recommended models per grade (matches mlc-backend.ts)
const RECOMMENDED_MODELS: Record<string, string> = {
  S: 'Qwen3-8B-q4f16_1-MLC',
  A: 'Qwen3-8B-q4f16_1-MLC',
  B: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  C: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
};

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
const localModelEl = document.getElementById('local-model')!;
const pipelineStatusEl = document.getElementById('pipeline-status')!;
const batteryInfoEl = document.getElementById('battery-info')!;
const localTokensEl = document.getElementById('local-tokens')!;
const cloudTokensEl = document.getElementById('cloud-tokens')!;

const settingLocalModel = document.getElementById('setting-local-model') as HTMLInputElement;
const localModelCombobox = document.getElementById('local-model-combobox')!;
const localModelListbox = document.getElementById('local-model-listbox')!;
const comboboxToggle = localModelCombobox.querySelector('.combobox-toggle') as HTMLButtonElement;
const modelCountEl = document.getElementById('model-count')!;
const settingLocalWorker = document.getElementById('setting-local-worker') as HTMLInputElement;
const settingLocalCache = document.getElementById('setting-local-cache') as HTMLInputElement;
const settingBaseURL = document.getElementById('setting-base-url') as HTMLInputElement;
const settingApiKey = document.getElementById('setting-api-key') as HTMLInputElement;
const settingModel = document.getElementById('setting-model') as HTMLInputElement;
const settingTimeout = document.getElementById('setting-timeout') as HTMLInputElement;
const settingRetries = document.getElementById('setting-retries') as HTMLInputElement;

const applySettingsBtn = document.getElementById('apply-settings-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const codeContent = document.getElementById('code-content')!;
const copyCodeBtn = document.getElementById('copy-code-btn') as HTMLButtonElement;

const progressSection = document.getElementById('progress-section')!;
const progressFill = document.getElementById('progress-fill')!;
const progressText = document.getElementById('progress-text')!;
const errorSection = document.getElementById('error-section')!;
const errorMessage = document.getElementById('error-message')!;
const errorRetryBtn = document.getElementById('error-retry-btn') as HTMLButtonElement;
const errorDismissBtn = document.getElementById('error-dismiss-btn') as HTMLButtonElement;

const pipelineSteps = document.querySelectorAll('.pipeline-step');

const messagesDiv = document.getElementById('messages')!;
const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const abortBtn = document.getElementById('abort-btn') as HTMLButtonElement;

// --- Markdown Code Copy Handler ---
initCodeCopyHandler(messagesDiv);

// --- State ---
let client: WebLLMClient | null = null;
let abortController: AbortController | null = null;
let lastRouteDecision: 'local' | 'cloud' | null = null;
let pipelineStatus: PipelineStatus = 'idle';
const chatHistory: Message[] = [];
let localTokens = { prompt: 0, completion: 0 };
let cloudTokens = { prompt: 0, completion: 0 };
let appliedConfig: PlaygroundConfig | null = null;

// --- Combobox State ---
let modelOptions: ModelOption[] = [];
let filteredOptions: ModelOption[] = [];
let highlightedIndex = -1;
let isComboboxOpen = false;
let detectedGrade: string = 'C';

// --- Pipeline Status ---
function setPipelineStatus(status: PipelineStatus) {
  pipelineStatus = status;
  const labels: Record<PipelineStatus, string> = {
    idle: 'Idle',
    initializing: 'Initializing',
    loading: 'Loading',
    ready: 'Ready',
    error: 'Error',
  };
  const classes: Record<PipelineStatus, string> = {
    idle: 'status-value pending',
    initializing: 'status-value pending',
    loading: 'status-value pending',
    ready: 'status-value success',
    error: 'status-value error',
  };
  pipelineStatusEl.textContent = labels[status];
  pipelineStatusEl.className = classes[status];
}

function updateStatusCard() {
  if (!client) return;
  const s = client.status();
  localModelEl.textContent = s.localModel || '\u2014';
  localModelEl.title = s.localModel || '';
}

function updateTokenDisplay() {
  const localTotal = localTokens.prompt + localTokens.completion;
  const cloudTotal = cloudTokens.prompt + cloudTokens.completion;
  localTokensEl.textContent = localTotal.toLocaleString();
  localTokensEl.title = `Prompt: ${localTokens.prompt.toLocaleString()}, Completion: ${localTokens.completion.toLocaleString()}`;
  cloudTokensEl.textContent = cloudTotal.toLocaleString();
  cloudTokensEl.title = `Prompt: ${cloudTokens.prompt.toLocaleString()}, Completion: ${cloudTokens.completion.toLocaleString()}`;
}

// --- Pipeline Steps ---
function updatePipelineStage(stage: string) {
  const stages = ['download', 'compile', 'ready'];
  const currentIdx = stages.indexOf(stage);
  pipelineSteps.forEach((step) => {
    const stepStage = step.getAttribute('data-stage')!;
    const stepIdx = stages.indexOf(stepStage);
    step.classList.remove('active', 'complete');
    if (stepIdx < currentIdx) {
      step.classList.add('complete');
    } else if (stepIdx === currentIdx) {
      step.classList.add('active');
    }
  });
}

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

// --- Apply Button State ---
function configNeedsReinit(): boolean {
  if (!appliedConfig) return true;
  const current = collectConfig();
  // Compare only backend-relevant fields; mode is handled per-request
  return (
    current.localModel !== appliedConfig.localModel ||
    current.localWebWorker !== appliedConfig.localWebWorker ||
    current.localCache !== appliedConfig.localCache ||
    current.cloudBaseURL !== appliedConfig.cloudBaseURL ||
    current.cloudApiKey !== appliedConfig.cloudApiKey ||
    current.cloudModel !== appliedConfig.cloudModel ||
    current.cloudTimeout !== appliedConfig.cloudTimeout ||
    current.cloudRetries !== appliedConfig.cloudRetries
  );
}

function updateApplyButton() {
  applySettingsBtn.disabled = !configNeedsReinit();
}

// --- Combobox Logic ---
function initModelOptions() {
  const modelIds = prebuiltAppConfig.model_list.map((m) => m.model_id);
  modelOptions = modelIds.map((id) => ({
    model_id: id,
    cached: false,
    recommended: false,
  }));
  filteredOptions = [...modelOptions];
  modelCountEl.textContent = `${modelOptions.length} models available`;
  renderComboboxOptions();

  // Check cache status in background
  checkCacheStatusInBackground();
}

async function checkCacheStatusInBackground() {
  const BATCH_SIZE = 10;
  for (let i = 0; i < modelOptions.length; i += BATCH_SIZE) {
    const batch = modelOptions.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (opt) => {
        try {
          return { id: opt.model_id, cached: await hasModelInCache(opt.model_id) };
        } catch {
          return { id: opt.model_id, cached: false };
        }
      })
    );
    for (const { id, cached } of results) {
      const opt = modelOptions.find((m) => m.model_id === id);
      if (opt) opt.cached = cached;
    }
    sortModelOptions();
    filterComboboxOptions(settingLocalModel.value);
  }
}

function isQwenModel(modelId: string): boolean {
  return /qwen/i.test(modelId);
}

function sortModelOptions() {
  modelOptions.sort((a, b) => {
    // Cached models first
    if (a.cached !== b.cached) return a.cached ? -1 : 1;
    // Then recommended models
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    // Then Qwen models (brand priority)
    const aQwen = isQwenModel(a.model_id);
    const bQwen = isQwenModel(b.model_id);
    if (aQwen !== bQwen) return aQwen ? -1 : 1;
    // Then alphabetically
    return a.model_id.localeCompare(b.model_id);
  });
}

function filterComboboxOptions(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) {
    filteredOptions = [...modelOptions];
  } else {
    filteredOptions = modelOptions.filter((opt) => opt.model_id.toLowerCase().includes(q));
  }
  highlightedIndex = filteredOptions.length > 0 ? 0 : -1;
  renderComboboxOptions();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

function renderComboboxOptions() {
  const query = settingLocalModel.value;
  const currentValue = settingLocalModel.value.trim();

  if (filteredOptions.length === 0) {
    localModelListbox.innerHTML = '<li class="combobox-empty">No matching models</li>';
    return;
  }

  localModelListbox.innerHTML = filteredOptions
    .map((opt, idx) => {
      const isHighlighted = idx === highlightedIndex;
      const isSelected = opt.model_id === currentValue;
      const classes = [
        'combobox-option',
        isHighlighted ? 'highlighted' : '',
        isSelected ? 'selected' : '',
      ]
        .filter(Boolean)
        .join(' ');

      let badges = '';
      if (opt.cached) badges += '<span class="model-badge badge-downloaded">Downloaded</span>';
      if (opt.recommended) badges += '<span class="model-badge badge-recommended">Recommended</span>';

      return `<li class="${classes}" role="option" data-value="${escapeHtml(opt.model_id)}" data-index="${idx}">
        <span class="model-name">${highlightMatch(opt.model_id, query)}</span>
        ${badges ? `<span class="model-badges">${badges}</span>` : ''}
      </li>`;
    })
    .join('');
}

function openCombobox() {
  if (isComboboxOpen) return;
  isComboboxOpen = true;
  localModelCombobox.classList.add('open');
  localModelListbox.classList.remove('hidden');
  settingLocalModel.setAttribute('aria-expanded', 'true');
  filterComboboxOptions(settingLocalModel.value);
  scrollHighlightedIntoView();
}

function closeCombobox() {
  if (!isComboboxOpen) return;
  isComboboxOpen = false;
  localModelCombobox.classList.remove('open');
  localModelListbox.classList.add('hidden');
  settingLocalModel.setAttribute('aria-expanded', 'false');
  highlightedIndex = -1;
}

function toggleCombobox() {
  if (isComboboxOpen) {
    closeCombobox();
  } else {
    openCombobox();
    settingLocalModel.focus();
  }
}

function selectOption(value: string) {
  settingLocalModel.value = value;
  closeCombobox();
  generateCodeSnippet();
  updateApplyButton();
}

function updateHighlight(newIndex: number) {
  if (filteredOptions.length === 0) return;
  highlightedIndex = Math.max(0, Math.min(newIndex, filteredOptions.length - 1));
  renderComboboxOptions();
  scrollHighlightedIntoView();
}

function scrollHighlightedIntoView() {
  const highlighted = localModelListbox.querySelector('.highlighted') as HTMLElement;
  if (highlighted) {
    highlighted.scrollIntoView({ block: 'nearest' });
  }
}

// --- Code Snippet ---
function generateCodeSnippet() {
  const config = collectConfig();
  const lines: string[] = ['import { createClient } from "@webllm-io/sdk";', '', 'const client = createClient({'];

  if (config.mode === 'local') {
    const localProps: string[] = [];
    if (config.localModel) localProps.push(`    model: "${config.localModel}"`);
    if (!config.localWebWorker) localProps.push('    useWebWorker: false');
    if (!config.localCache) localProps.push('    useCache: false');
    if (localProps.length > 0) {
      lines.push('  local: {');
      lines.push(localProps.join(',\n'));
      lines.push('  },');
    } else {
      lines.push("  local: 'auto',");
    }
  } else if (config.mode === 'cloud') {
    lines.push('  local: false,');
    if (config.cloudBaseURL) {
      lines.push('  cloud: {');
      const cloudProps: string[] = [`    baseURL: "${config.cloudBaseURL}"`];
      if (config.cloudApiKey) cloudProps.push(`    apiKey: "${config.cloudApiKey}"`);
      if (config.cloudModel) cloudProps.push(`    model: "${config.cloudModel}"`);
      if (config.cloudTimeout) cloudProps.push(`    timeout: ${config.cloudTimeout}`);
      if (config.cloudRetries) cloudProps.push(`    retries: ${config.cloudRetries}`);
      lines.push(cloudProps.join(',\n'));
      lines.push('  },');
    }
  } else {
    // auto mode
    const localProps: string[] = [];
    if (config.localModel) localProps.push(`    model: "${config.localModel}"`);
    if (!config.localWebWorker) localProps.push('    useWebWorker: false');
    if (!config.localCache) localProps.push('    useCache: false');
    if (localProps.length > 0) {
      lines.push('  local: {');
      lines.push(localProps.join(',\n'));
      lines.push('  },');
    } else {
      lines.push("  local: 'auto',");
    }
    if (config.cloudBaseURL) {
      lines.push('  cloud: {');
      const cloudProps: string[] = [`    baseURL: "${config.cloudBaseURL}"`];
      if (config.cloudApiKey) cloudProps.push(`    apiKey: "${config.cloudApiKey}"`);
      if (config.cloudModel) cloudProps.push(`    model: "${config.cloudModel}"`);
      if (config.cloudTimeout) cloudProps.push(`    timeout: ${config.cloudTimeout}`);
      if (config.cloudRetries) cloudProps.push(`    retries: ${config.cloudRetries}`);
      lines.push(cloudProps.join(',\n'));
      lines.push('  },');
    }
  }

  lines.push('});');
  codeContent.textContent = lines.join('\n');
}

// --- SDK Integration ---
async function detectCapability() {
  try {
    const report = await checkCapability();
    webgpuStatus.textContent = report.webgpu ? 'Available' : 'Unavailable';
    webgpuStatus.className = `status-value ${report.webgpu ? 'success' : 'error'}`;

    const hint = GRADE_THRESHOLDS[report.grade] || '';
    deviceGrade.innerHTML = `${report.grade} <span class="status-hint">(${hint})</span>`;

    vramInfo.textContent = report.gpu ? `${report.gpu.vram} MB` : 'Unknown';

    // Battery
    if (report.battery) {
      const pct = Math.round(report.battery.level * 100);
      const charging = report.battery.charging ? ' (charging)' : '';
      batteryInfoEl.textContent = `${pct}%${charging}`;
    } else {
      batteryInfoEl.textContent = 'N/A';
    }

    // Update recommended model based on detected grade
    detectedGrade = report.grade;
    const recommendedModelId = RECOMMENDED_MODELS[detectedGrade];
    for (const opt of modelOptions) {
      opt.recommended = opt.model_id === recommendedModelId;
    }
    sortModelOptions();
    filterComboboxOptions(settingLocalModel.value);

  } catch {
    webgpuStatus.textContent = 'Error';
    webgpuStatus.className = 'status-value error';
  }
}

function buildLocalConfig(config: PlaygroundConfig): 'auto' | { model: string; useWebWorker: boolean; useCache: boolean } {
  if (config.localModel) {
    return {
      model: config.localModel,
      useWebWorker: config.localWebWorker,
      useCache: config.localCache,
    };
  }
  return 'auto';
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

function showProgressLoading() {
  progressSection.classList.remove('hidden');
  errorSection.classList.add('hidden');
  setPipelineStatus('loading');
}

function showProgressError(msg: string) {
  progressSection.classList.add('hidden');
  errorSection.classList.remove('hidden');
  errorMessage.textContent = msg;
  setPipelineStatus('error');
}

function hideProgress() {
  progressSection.classList.add('hidden');
  errorSection.classList.add('hidden');
}

function initClient() {
  if (client) client.dispose();

  const config = collectConfig();
  saveConfig(config);

  const cloud = buildCloudConfig(config);
  const local = buildLocalConfig(config);

  lastRouteDecision = null;

  try {
    // Always create client with all available backends.
    // Mode switching is handled per-request via the `provider` field,
    // so we don't need to rebuild the client when switching tabs.
    const opts: Parameters<typeof createClient>[0] = {
      onRoute: handleRoute,
    };

    if (local) {
      opts.local = local;
      opts.onProgress = handleProgress;
      opts.onError = handleInitError;
    }
    if (cloud) {
      opts.cloud = cloud;
    }

    if (!opts.local && !opts.cloud) {
      addSystemMessage('Please configure at least one backend.');
      return;
    }

    client = createClient(opts);
    appliedConfig = { ...config };
    addSystemMessage(`Client initialized: ${config.mode.toUpperCase()} mode`);
    sendBtn.disabled = false;
    setPipelineStatus(opts.local ? 'initializing' : 'idle');
    updateStatusCard();
    updateApplyButton();
  } catch (err) {
    addSystemMessage(`Init Error: ${(err as Error).message}`);
    setPipelineStatus('error');
  }
}

function handleRoute(info: { decision: 'local' | 'cloud'; reason: string }) {
  lastRouteDecision = info.decision;
}

function handleInitError(err: Error) {
  showProgressError(err.message);
}

function handleProgress(p: { stage: string; progress: number; model: string }) {
  showProgressLoading();
  const percent = Math.round(p.progress * 100);
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${p.model} (${percent}%)`;

  // Update model name directly from progress event, because
  // MLCBackend.currentModel is only set after load() resolves,
  // but progress callbacks fire during the await.
  localModelEl.textContent = p.model;
  localModelEl.title = p.model;

  // Map MLC stages to pipeline stages
  if (p.stage === 'download') {
    updatePipelineStage('download');
  } else if (p.stage === 'compile') {
    updatePipelineStage('compile');
  } else if (p.stage === 'warmup') {
    updatePipelineStage('compile');
  }

  if (p.progress >= 1) {
    updatePipelineStage('ready');
    setPipelineStatus('ready');
    setTimeout(() => hideProgress(), 800);
    // Refresh cache status for this model
    refreshModelCacheStatus(p.model);
  }
}

async function refreshModelCacheStatus(modelId: string) {
  const opt = modelOptions.find((m) => m.model_id === modelId);
  if (opt) {
    try {
      opt.cached = await hasModelInCache(modelId);
    } catch {
      opt.cached = false;
    }
    sortModelOptions();
    filterComboboxOptions(settingLocalModel.value);
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
  contentDiv.innerHTML = renderMarkdown(content);

  msgDiv.appendChild(contentDiv);
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return contentDiv;
}

function addTypingIndicator(): { container: HTMLDivElement; contentDiv: HTMLDivElement } {
  const empty = messagesDiv.querySelector('.empty-state');
  if (empty) empty.remove();

  const msgDiv = document.createElement('div');
  msgDiv.className = 'message assistant';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  contentDiv.appendChild(typing);

  msgDiv.appendChild(contentDiv);
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return { container: msgDiv, contentDiv };
}

function createRouteBadge(decision: 'local' | 'cloud'): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'route-badge';
  if (decision === 'local') {
    badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>local';
  } else {
    badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>cloud';
  }
  return badge;
}

function addSystemMessage(text: string) {
  const div = document.createElement('div');
  div.className = 'system-tag';
  div.textContent = `\u2022 ${text} \u2022`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function renderChatError(
  container: HTMLDivElement,
  contentDiv: HTMLDivElement,
  errMsg: string,
  onRetry: () => void,
) {
  contentDiv.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'chat-error-card';
  card.innerHTML = `
    <div class="error-title">Request Failed</div>
    <div class="error-message">${escapeHtml(errMsg)}</div>
    <div class="error-actions"></div>
  `;
  const actions = card.querySelector('.error-actions')!;

  const retryBtn = document.createElement('button');
  retryBtn.className = 'primary-btn';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', () => {
    container.remove();
    onRetry();
  });
  actions.appendChild(retryBtn);

  contentDiv.appendChild(card);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function parseThinkingContent(rawContent: string, reasoningFromAPI: string): ThinkingResult {
  // Format 2: reasoning_content field (OpenAI o1/o3) takes priority
  if (reasoningFromAPI) {
    // Still thinking until answer content starts arriving
    return { thinking: reasoningFromAPI, answer: rawContent, isThinking: !rawContent };
  }

  // Format 1: <think> tags (DeepSeek R1, QwQ, local MLC models)
  if (rawContent.startsWith('<think>')) {
    const closeIdx = rawContent.indexOf('</think>');
    if (closeIdx === -1) {
      // Still inside thinking block
      return { thinking: rawContent.slice(7), answer: '', isThinking: true };
    }
    const thinking = rawContent.slice(7, closeIdx);
    const answer = rawContent.slice(closeIdx + 8);
    return { thinking, answer, isThinking: false };
  }

  // No thinking content — regular model
  return { thinking: '', answer: rawContent, isThinking: false };
}

// --- Chat Actions ---
async function handleSend(retryText?: string) {
  const text = retryText || userInput.value.trim();
  if (!text || !client) return;

  if (!retryText) {
    userInput.value = '';
    userInput.style.height = 'auto';
    addMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
  }

  sendBtn.classList.add('hidden');
  abortBtn.classList.remove('hidden');
  abortController = new AbortController();

  lastRouteDecision = null;
  const { container, contentDiv } = addTypingIndicator();
  let rawContent = '';
  let reasoningFromAPI = '';
  let modelName = '';
  let firstChunk = true;
  let lastChunk: ChatCompletionChunk | null = null;
  let inputText = '';
  let thinkingStartTime = 0;
  let thinkingFinalized = false;

  // DOM elements for thinking display (created lazily)
  let thinkingDetails: HTMLDetailsElement | null = null;
  let thinkingSummary: HTMLElement | null = null;
  let thinkingContentEl: HTMLDivElement | null = null;
  let answerEl: HTMLDivElement | null = null;

  // Stream markdown renderer (created lazily on first answer chunk)
  let answerRenderer: ReturnType<typeof createStreamRenderer> | null = null;

  function ensureThinkingDOM() {
    if (thinkingDetails) return;
    // Cancel any renderer that was targeting contentDiv before we rebuild the DOM
    if (answerRenderer) {
      answerRenderer.cancel();
      answerRenderer = null;
    }
    contentDiv.innerHTML = '';
    thinkingStartTime = Date.now();

    thinkingDetails = document.createElement('details');
    thinkingDetails.className = 'thinking-section';
    thinkingDetails.open = true;

    thinkingSummary = document.createElement('summary');
    thinkingSummary.innerHTML = 'Thinking<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>';
    thinkingDetails.appendChild(thinkingSummary);

    thinkingContentEl = document.createElement('div');
    thinkingContentEl.className = 'thinking-content';
    thinkingDetails.appendChild(thinkingContentEl);

    contentDiv.appendChild(thinkingDetails);

    answerEl = document.createElement('div');
    answerEl.className = 'answer-text';
    contentDiv.appendChild(answerEl);
  }

  function finalizeThinking() {
    if (thinkingFinalized || !thinkingDetails || !thinkingSummary) return;
    thinkingFinalized = true;
    const elapsed = ((Date.now() - thinkingStartTime) / 1000).toFixed(1);
    thinkingSummary.textContent = `Thought for ${elapsed}s`;
    thinkingDetails.open = false;
  }

  try {
    // Capture input text for fallback estimation
    inputText = chatHistory.map(m => m.content).join(' ');

    // Route based on active mode tab: auto lets the router decide,
    // local/cloud forces the corresponding backend via `provider`.
    const activeTab = document.querySelector('.mode-tab.active');
    const currentMode = activeTab?.getAttribute('data-mode') || 'auto';

    const stream = client.chat.completions.create({
      messages: [...chatHistory],
      stream: true,
      signal: abortController.signal,
      ...(currentMode !== 'auto' && { provider: currentMode as 'local' | 'cloud' }),
    });

    for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
      if (firstChunk) {
        contentDiv.innerHTML = '';
        firstChunk = false;
      }
      if (!modelName && chunk.model) modelName = chunk.model;

      const delta = chunk.choices[0]?.delta;
      const deltaContent = delta?.content ?? '';
      const deltaReasoning = delta?.reasoning_content ?? '';

      rawContent += deltaContent;
      reasoningFromAPI += deltaReasoning;

      const parsed = parseThinkingContent(rawContent, reasoningFromAPI);

      if (parsed.thinking) {
        // Has thinking content — use structured DOM
        ensureThinkingDOM();
        thinkingContentEl!.textContent = parsed.thinking;
        thinkingContentEl!.scrollTop = thinkingContentEl!.scrollHeight;
        if (parsed.answer) {
          if (!answerRenderer) answerRenderer = createStreamRenderer(answerEl!);
          answerRenderer.update(parsed.answer);
        }
        if (!parsed.isThinking) {
          finalizeThinking();
        }
      } else {
        // No thinking content — markdown stream rendering
        if (!answerRenderer) answerRenderer = createStreamRenderer(contentDiv);
        answerRenderer.update(parsed.answer);
      }

      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      lastChunk = chunk;
    }

    // Finalize thinking if stream ended while still thinking
    if (thinkingDetails && thinkingSummary && thinkingDetails.open) {
      finalizeThinking();
    }

    // Final markdown render (ensures complete output even if rAF was pending)
    if (answerRenderer) {
      const finalParsed = parseThinkingContent(rawContent, reasoningFromAPI);
      answerRenderer.finalize(finalParsed.answer);
    }

    // Accumulate token usage
    const target = lastRouteDecision === 'cloud' ? cloudTokens : localTokens;
    if (lastChunk?.usage) {
      target.prompt += lastChunk.usage.prompt_tokens;
      target.completion += lastChunk.usage.completion_tokens;
    } else {
      // Fallback: estimate tokens as chars / 4 (include reasoning length)
      target.prompt += Math.ceil(inputText.length / 4);
      target.completion += Math.ceil((rawContent.length + reasoningFromAPI.length) / 4);
    }
    updateTokenDisplay();

    // Model tag and route badge
    const metaContainer = document.createElement('div');
    metaContainer.style.display = 'flex';
    metaContainer.style.alignItems = 'center';
    metaContainer.style.gap = '4px';
    metaContainer.style.flexWrap = 'wrap';

    if (modelName) {
      const tag = document.createElement('span');
      tag.className = 'model-tag';
      tag.textContent = modelName;
      metaContainer.appendChild(tag);
    }

    if (lastRouteDecision) {
      metaContainer.appendChild(createRouteBadge(lastRouteDecision));
    }

    if (metaContainer.children.length > 0) {
      container.appendChild(metaContainer);
    }

    // Store only the answer in chat history (exclude thinking content)
    const parsed = parseThinkingContent(rawContent, reasoningFromAPI);
    chatHistory.push({ role: 'assistant', content: parsed.answer });

  } catch (err: any) {
    if (err.name === 'AbortError' || err.code === 'ABORTED') {
      if (firstChunk) contentDiv.innerHTML = '';
      // Finalize thinking on abort
      if (thinkingDetails && thinkingSummary && thinkingDetails.open) {
        finalizeThinking();
      }
      const parsed = parseThinkingContent(rawContent, reasoningFromAPI);
      if (answerRenderer) {
        answerRenderer.finalize((parsed.answer || rawContent) + ' [Interrupted]');
      } else if (thinkingDetails) {
        answerEl!.textContent = (parsed.answer || '') + ' [Interrupted]';
      } else {
        contentDiv.textContent = (parsed.answer || rawContent) + ' [Interrupted]';
      }
    } else {
      answerRenderer?.cancel();
      const lastUserText = text;
      renderChatError(container, contentDiv, err.message, () => {
        handleSend(lastUserText);
      });
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
    generateCodeSnippet();
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

sendBtn.addEventListener('click', () => handleSend());
abortBtn.addEventListener('click', () => abortController?.abort());

applySettingsBtn.addEventListener('click', () => {
  initClient();
  if (window.innerWidth <= 768) closeSidebar();
});

clearBtn.addEventListener('click', () => {
  chatHistory.length = 0;
  localTokens = { prompt: 0, completion: 0 };
  cloudTokens = { prompt: 0, completion: 0 };
  updateTokenDisplay();
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

// Code snippet: update on input changes
const settingInputs = [
  settingLocalModel, settingLocalWorker, settingLocalCache,
  settingBaseURL, settingApiKey, settingModel, settingTimeout, settingRetries,
];
settingInputs.forEach(el => {
  el.addEventListener('input', () => { generateCodeSnippet(); updateApplyButton(); });
  el.addEventListener('change', () => { generateCodeSnippet(); updateApplyButton(); });
});

copyCodeBtn.addEventListener('click', () => {
  const code = codeContent.textContent || '';
  navigator.clipboard.writeText(code).then(() => {
    copyCodeBtn.textContent = 'Copied!';
    setTimeout(() => { copyCodeBtn.textContent = 'Copy'; }, 1500);
  });
});

// Progress overlay error buttons
errorRetryBtn.addEventListener('click', () => {
  hideProgress();
  initClient();
});

errorDismissBtn.addEventListener('click', () => {
  hideProgress();
});

// --- Combobox Event Listeners ---
settingLocalModel.addEventListener('focus', () => {
  openCombobox();
});

settingLocalModel.addEventListener('input', () => {
  filterComboboxOptions(settingLocalModel.value);
  if (!isComboboxOpen) openCombobox();
});

settingLocalModel.addEventListener('keydown', (e) => {
  if (!isComboboxOpen) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openCombobox();
    }
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      updateHighlight(highlightedIndex + 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      updateHighlight(highlightedIndex - 1);
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        selectOption(filteredOptions[highlightedIndex].model_id);
      } else {
        closeCombobox();
      }
      break;
    case 'Escape':
      e.preventDefault();
      closeCombobox();
      break;
    case 'Tab':
      closeCombobox();
      break;
  }
});

comboboxToggle.addEventListener('click', (e) => {
  e.preventDefault();
  toggleCombobox();
});

localModelListbox.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const option = target.closest('.combobox-option') as HTMLElement;
  if (option) {
    const value = option.dataset.value || '';
    selectOption(value);
  }
});

localModelListbox.addEventListener('mousemove', (e) => {
  const target = e.target as HTMLElement;
  const option = target.closest('.combobox-option') as HTMLElement;
  if (option && option.dataset.index !== undefined) {
    const idx = parseInt(option.dataset.index, 10);
    if (idx !== highlightedIndex) {
      highlightedIndex = idx;
      renderComboboxOptions();
    }
  }
});

// Close combobox when clicking outside
document.addEventListener('click', (e) => {
  if (!localModelCombobox.contains(e.target as Node)) {
    closeCombobox();
  }
});

// --- Boot ---
const initialConfig = loadConfig();
syncUIWithConfig(initialConfig);
initModelOptions();
generateCodeSnippet();
detectCapability();
initClient();
