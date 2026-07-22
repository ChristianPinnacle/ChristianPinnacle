/**
 * LLM invocation wrapper — all AI calls must go through this module.
 */
import Anthropic from '@anthropic-ai/sdk';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export async function invokeLLM(
  messages: LLMMessage[],
  options?: LLMOptions,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set — cannot call Claude. Add it to .env for Phase 2 Scouter chat.',
    );
  }

  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const turnMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  if (turnMessages.length === 0) {
    throw new Error('invokeLLM requires at least one user/assistant message');
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: options?.model ?? DEFAULT_MODEL,
    max_tokens: options?.maxTokens ?? 1024,
    system: system || undefined,
    messages: turnMessages,
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Claude returned an empty response');
  }

  return text;
}
