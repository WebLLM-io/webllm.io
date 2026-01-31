import { createClient, checkCapability } from '@webllm-io/sdk';
import type { WebLLMClient, ChatCompletionChunk, Message } from '@webllm-io/sdk';

// DOM elements
const webgpuStatus = document.getElementById('webgpu-status')!;
const deviceGrade = document.getElementById('device-grade')!;
const vramInfo = document.getElementById('vram-info')!;
const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
const cloudUrl = document.getElementById('cloud-url') as HTMLInputElement;
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

// --- Client initialization ---
function initClient() {
  if (client) {
    client.dispose();
    client = null;
  }

  const mode = modeSelect.value;
  const cloud = cloudUrl.value.trim() || undefined;

  try {
    if (mode === 'local') {
      client = createClient({
        local: 'auto',
        onProgress: handleProgress,
      });
    } else if (mode === 'cloud') {
      if (!cloud) {
        addSystemMessage('Please enter a Cloud API URL for cloud-only mode.');
        return;
      }
      client = createClient({
        local: false,
        cloud,
      });
    } else {
      // auto mode
      client = createClient({
        local: 'auto',
        cloud: cloud,
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

  try {
    const stream = client.chat.completions.create({
      messages: [...messages],
      stream: true,
      signal: abortController.signal,
    });

    for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      fullContent += delta;
      assistantDiv.textContent = fullContent;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
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

// --- Event listeners ---
modeSelect.addEventListener('change', initClient);
cloudUrl.addEventListener('change', initClient);

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
detectCapability();
initClient();
