import type { ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestJson } from '../core/http.js';

interface OpenRouterResponse { choices?: Array<{ message?: { content?: unknown } }>; model?: string; usage?: Record<string, number>; }

export const openRouterProvider: Provider = {
  id: 'openrouter',
  capabilities: ['text'],
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    if (!context.apiKey) throw new Error('OPENROUTER_API_KEY is required');
    const base = context.baseUrl ?? 'https://openrouter.ai/api/v1';
    const body = await requestJson<OpenRouterResponse>(`${base}/chat/completions`, {
      method: 'POST',
      timeoutMs: context.timeoutMs,
      headers: { Authorization: `Bearer ${context.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model ?? 'openai/gpt-4o-mini', messages: [{ role: 'user', content: request.prompt ?? String(request.input ?? '') }] })
    });
    return { output: body.choices?.[0]?.message?.content ?? null, provider: 'openrouter', model: body.model ?? request.model, usage: body.usage };
  }
};
