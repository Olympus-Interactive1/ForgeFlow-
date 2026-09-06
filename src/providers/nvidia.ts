import type { ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestJson } from '../core/http.js';

interface NvidiaResponse { choices?: Array<{ message?: { content?: unknown } }>; model?: string; usage?: Record<string, number>; }

export const nvidiaProvider: Provider = {
  id: 'nvidia',
  free: true,
  capabilities: ['text'],
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    if (!context.apiKey) throw new Error('NVIDIA_API_KEY is required');
    const base = (context.baseUrl ?? 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
    const model = request.model ?? 'deepseek-ai/deepseek-v4-flash-0731';
    const body = await requestJson<NvidiaResponse>(`${base}/chat/completions`, {
      method: 'POST', timeoutMs: context.timeoutMs,
      headers: { Authorization: `Bearer ${context.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: request.prompt ?? String(request.input ?? '') }] })
    });
    return { output: body.choices?.[0]?.message?.content ?? null, provider: 'nvidia', model: body.model ?? model, usage: body.usage, metadata: { free: true } };
  }
};
