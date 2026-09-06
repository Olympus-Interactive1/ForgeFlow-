import type { ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestJson } from '../core/http.js';

interface FalSubmit { request_id: string; }

export const falProvider: Provider = {
  id: 'fal',
  capabilities: ['image', 'video', 'audio'],
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    if (!context.apiKey) throw new Error('FAL_KEY is required');
    const model = request.model ?? 'fal-ai/fast-sdxl';
    const base = context.baseUrl ?? 'https://queue.fal.run';
    const submitted = await requestJson<FalSubmit>(`${base}/${model}`, {
      method: 'POST', timeoutMs: context.timeoutMs, headers: { Authorization: `Key ${context.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: request.prompt, ...(typeof request.input === 'object' && request.input ? request.input : {}) })
    });
    return { output: { requestId: submitted.request_id, status: 'queued' }, provider: 'fal', model };
  }
};
