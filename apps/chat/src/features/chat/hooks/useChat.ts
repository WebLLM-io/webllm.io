import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { ChatCompletionChunk, Message } from '@webllm-io/sdk';
import { useStore } from '../../../store';
import { parseThinkingContent } from '../../../shared/thinking';
import type { ChatMessage } from '../../conversations/types';

interface SendOptions {
  onFirstChunk: () => void;
  onThinking: (thinking: string, isThinking: boolean) => void;
  onAnswer: (answer: string) => void;
  onFinalize: (answer: string) => void;
  onModel: (model: string) => void;
  onError: (error: Error) => void;
  onAbort: (partialAnswer: string) => void;
  onDone: () => void;
}

export function useChat() {
  const sendMessage = useCallback(async (text: string, conversationId: string, opts: SendOptions) => {
    const store = useStore.getState();
    const { client, mode } = store;
    if (!client) return;

    // Add user message to conversation
    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    store.addMessage(conversationId, userMsg);

    // Set up streaming state
    store.setStreaming(true);
    store.setStreamingContent('');
    store.setStreamingReasoning('');
    store.setStreamingModel('');
    store.setLastRouteDecision(null);

    const abortController = new AbortController();
    store.setAbortController(abortController);

    // Build messages array from conversation (re-read fresh state after addMessage)
    const freshState = useStore.getState();
    const conversation = freshState.conversations.find((c) => c.id === conversationId);
    const messages: Message[] = conversation
      ? conversation.messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: 'user' as const, content: text }];

    let rawContent = '';
    let reasoningFromAPI = '';
    let modelName = '';
    let firstChunk = true;
    let lastChunk: ChatCompletionChunk | null = null;

    try {
      const stream = client.chat.completions.create({
        messages,
        stream: true,
        signal: abortController.signal,
        ...(mode !== 'auto' && { provider: mode as 'local' | 'cloud' }),
      });

      for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
        if (firstChunk) {
          opts.onFirstChunk();
          firstChunk = false;
        }

        if (!modelName && chunk.model) {
          modelName = chunk.model;
          opts.onModel(modelName);
        }

        const delta = chunk.choices[0]?.delta;
        rawContent += delta?.content ?? '';
        reasoningFromAPI += delta?.reasoning_content ?? '';

        const parsed = parseThinkingContent(rawContent, reasoningFromAPI);

        if (parsed.thinking) {
          opts.onThinking(parsed.thinking, parsed.isThinking);
          if (parsed.answer) {
            opts.onAnswer(parsed.answer);
          }
        } else {
          opts.onAnswer(parsed.answer);
        }

        lastChunk = chunk;
      }

      // Finalize
      const finalParsed = parseThinkingContent(rawContent, reasoningFromAPI);
      opts.onFinalize(finalParsed.answer);

      // Token usage
      const routeDecision = useStore.getState().lastRouteDecision;
      const target = routeDecision === 'cloud' ? 'cloud' : 'local';
      if (lastChunk?.usage) {
        store.addTokenUsage(target, lastChunk.usage.prompt_tokens, lastChunk.usage.completion_tokens);
      } else {
        const inputLen = messages.map((m) => m.content).join(' ').length;
        store.addTokenUsage(target, Math.ceil(inputLen / 4), Math.ceil((rawContent.length + reasoningFromAPI.length) / 4));
      }

      // Save assistant message
      const assistantMsg: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: finalParsed.answer,
        thinking: finalParsed.thinking || undefined,
        model: modelName || undefined,
        route: routeDecision || undefined,
        usage: lastChunk?.usage ? { prompt_tokens: lastChunk.usage.prompt_tokens, completion_tokens: lastChunk.usage.completion_tokens } : undefined,
        createdAt: Date.now(),
      };
      store.addMessage(conversationId, assistantMsg);

    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ABORTED') {
        const parsed = parseThinkingContent(rawContent, reasoningFromAPI);
        opts.onAbort(parsed.answer || rawContent);

        // Save partial response
        if (rawContent || reasoningFromAPI) {
          const parsed2 = parseThinkingContent(rawContent, reasoningFromAPI);
          const assistantMsg: ChatMessage = {
            id: nanoid(),
            role: 'assistant',
            content: (parsed2.answer || rawContent) + ' [Interrupted]',
            thinking: parsed2.thinking || undefined,
            model: modelName || undefined,
            route: useStore.getState().lastRouteDecision || undefined,
            createdAt: Date.now(),
          };
          store.addMessage(conversationId, assistantMsg);
        }
      } else {
        opts.onError(err);
      }
    } finally {
      store.setStreaming(false);
      store.setAbortController(null);
      opts.onDone();
    }
  }, []);

  const abort = useCallback(() => {
    const controller = useStore.getState().abortController;
    controller?.abort();
  }, []);

  return { sendMessage, abort };
}
