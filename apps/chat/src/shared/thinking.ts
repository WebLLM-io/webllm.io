export interface ThinkingResult {
  thinking: string;
  answer: string;
  isThinking: boolean;
}

export function parseThinkingContent(rawContent: string, reasoningFromAPI: string): ThinkingResult {
  // Format 2: reasoning_content field (OpenAI o1/o3) takes priority
  if (reasoningFromAPI) {
    return { thinking: reasoningFromAPI, answer: rawContent, isThinking: !rawContent };
  }

  // Format 1: <think> tags (DeepSeek R1, QwQ, local MLC models)
  if (rawContent.startsWith('<think>')) {
    const closeIdx = rawContent.indexOf('</think>');
    if (closeIdx === -1) {
      return { thinking: rawContent.slice(7), answer: '', isThinking: true };
    }
    const thinking = rawContent.slice(7, closeIdx);
    const answer = rawContent.slice(closeIdx + 8);
    return { thinking, answer, isThinking: false };
  }

  return { thinking: '', answer: rawContent, isThinking: false };
}
