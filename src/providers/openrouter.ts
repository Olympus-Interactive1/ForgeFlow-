import type { ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestJson } from '../core/http.js';

interface OpenRouterResponse { choices?: Array<{ message?: { content?: unknown } }>; model?: string; usage?: Record<string, number>; }

export const openRouterProvider: Provider = {
  id: 'openrouter',
  free: true,
  capabilities: ['text'],
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    if (!context.apiKey) throw new Error('OPENROUTER_API_KEY is required');
    const base = (context.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const model = request.model ?? 'openrouter/free';
    const body = await requestJson<OpenRouterResponse>(`${base}/chat/completions`, {
      method: 'POST',
      timeoutMs: context.timeoutMs,
      headers: { Authorization: `Bearer ${context.apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://github.com/Olympus-Interactive1/ForgeFlow-', 'X-Title': 'ForgeFlow MCP' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: request.prompt ?? String(request.input ?? '') }] })
    });
    return { output: body.choices?.[0]?.message?.content ?? null, provider: 'openrouter', model: body.model ?? model, usage: body.usage, metadata: { free: true, routing: model === 'openrouter/free' ? 'dynamic-free-model' : 'explicit-free-model' } };
  }
};
