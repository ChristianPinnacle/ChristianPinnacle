/**
 * LLM invocation wrapper — all AI calls must go through this module.
 * Stub for Phase 1 scaffold; implemented in Phase 2+.
 */
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
}

export async function invokeLLM(
  _messages: LLMMessage[],
  _options?: LLMOptions,
): Promise<string> {
  throw new Error(
    'invokeLLM is not configured yet. Set ANTHROPIC_API_KEY in Phase 2.',
  );
}
