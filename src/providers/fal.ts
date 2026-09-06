import type { ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestJson } from '../core/http.js';

interface FalSubmit { request_id: string; }
interface FalStatus { status: string; }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const falProvider: Provider = {
  id: 'fal',
  capabilities: ['image', 'video', 'audio'],
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    if (!context.apiKey) throw new Error('FAL_KEY is required');
    const model = request.model ?? (request.capability === 'video' ? 'fal-ai/fast-video' : 'fal-ai/fast-sdxl');
    const base = (context.baseUrl ?? 'https://queue.fal.run').replace(/\/$/, '');
    const headers = { Authorization: `Key ${context.apiKey}`, 'Content-Type': 'application/json' };
    const input = typeof request.input === 'object' && request.input ? request.input : {};
    const submitted = await requestJson<FalSubmit>(`${base}/${model}`, {
      method: 'POST', timeoutMs: context.timeoutMs, headers,
      body: JSON.stringify({ ...input, ...(request.prompt ? { prompt: request.prompt } : {}) })
    });

    const wait = Boolean((request.metadata as Record<string, unknown> | undefined)?.waitForResult);
    if (!wait) return { output: { requestId: submitted.request_id, status: 'queued' }, provider: 'fal', model };

    const maxWaitMs = Number((request.metadata as Record<string, unknown> | undefined)?.maxWaitMs ?? 300_000);
    const pollMs = Number((request.metadata as Record<string, unknown> | undefined)?.pollIntervalMs ?? 1_500);
    const deadline = Date.now() + maxWaitMs;
    let lastStatus = 'IN_QUEUE';

    while (Date.now() < deadline) {
      const status = await requestJson<FalStatus>(`${base}/${model}/requests/${submitted.request_id}/status`, {
        method: 'GET', timeoutMs: Math.min(context.timeoutMs ?? 60_000, 15_000), headers
      });
      lastStatus = status.status;
      if (status.status === 'COMPLETED') {
        const result = await requestJson<unknown>(`${base}/${model}/requests/${submitted.request_id}`, {
          method: 'GET', timeoutMs: context.timeoutMs, headers
        });
        return { output: result, provider: 'fal', model, metadata: { requestId: submitted.request_id, status: status.status } };
      }
      if (status.status === 'FAILED' || status.status === 'CANCELLED') {
        throw new Error(`fal request ${submitted.request_id} ended with status ${status.status}`);
      }
      await sleep(pollMs);
    }

    return {
      output: { requestId: submitted.request_id, status: lastStatus },
      provider: 'fal', model,
      metadata: { pending: true, timedOut: true, pollUrl: `${base}/${model}/requests/${submitted.request_id}/status` }
    };
  }
};
