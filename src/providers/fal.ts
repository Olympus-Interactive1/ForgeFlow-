import type { ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestJson } from '../core/http.js';

interface FalSubmit { request_id: string; }
interface FalStatus { status: string; }

type Operation =
  | 'image_generate' | 'image_edit' | 'image_upscale'
  | 'video_generate' | 'video_image_to_video' | 'video_extend'
  | 'audio_generate' | 'tts' | 'stt';

const DEFAULT_MODELS: Record<Operation, string> = {
  image_generate: 'fal-ai/z-image/base',
  image_edit: 'fal-ai/playground-v25/image-to-image',
  image_upscale: 'fal-ai/esrgan',
  video_generate: 'fal-ai/ltx-2.3/text-to-video',
  video_image_to_video: 'fal-ai/kling-video/v3/standard/image-to-video',
  video_extend: 'fal-ai/ltx-2.3/extend-video',
  audio_generate: 'fal-ai/stable-audio-25/text-to-audio',
  tts: 'fal-ai/chatterbox/text-to-speech',
  stt: 'fal-ai/speech-to-text'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function metadataOf(request: ModelRequest): Record<string, unknown> {
  return request.metadata ?? {};
}

function operationOf(request: ModelRequest): Operation {
  const operation = metadataOf(request).operation;
  if (typeof operation === 'string' && operation in DEFAULT_MODELS) return operation as Operation;
  switch (request.capability) {
    case 'tts': return 'tts';
    case 'stt': return 'stt';
    case 'audio': return 'audio_generate';
    case 'video': return 'video_generate';
    case 'image': return 'image_generate';
    default: throw new Error(`fal does not implement capability ${request.capability}`);
  }
}

function buildInput(request: ModelRequest, operation: Operation): Record<string, unknown> {
  const source = typeof request.input === 'object' && request.input ? request.input as Record<string, unknown> : {};
  const input = { ...source };
  if (request.prompt && input.prompt === undefined) input.prompt = request.prompt;

  if (operation === 'tts' && input.text === undefined && request.prompt) input.text = request.prompt;
  if (operation === 'stt' && input.audio_url === undefined && typeof source.url === 'string') input.audio_url = source.url;
  if (operation === 'image_edit' && input.image_url === undefined && typeof source.url === 'string') input.image_url = source.url;
  if (operation === 'image_upscale' && input.image_url === undefined && typeof source.url === 'string') input.image_url = source.url;
  if (operation === 'video_image_to_video' && input.image_url === undefined && typeof source.url === 'string') input.image_url = source.url;
  if (operation === 'video_extend' && input.video_url === undefined && typeof source.url === 'string') input.video_url = source.url;

  return input;
}

function normalizeResult(result: unknown, requestId: string, operation: Operation): Record<string, unknown> {
  const object = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  const candidates = [object.image, object.video, object.audio, object.file].filter(Boolean);
  const media = candidates.find(value => value && typeof value === 'object') as Record<string, unknown> | undefined;
  const url = typeof media?.url === 'string' ? media.url :
    typeof object.audio === 'string' ? object.audio :
    typeof object.url === 'string' ? object.url : undefined;

  return {
    requestId,
    operation,
    status: 'completed',
    ...(url ? { url } : {}),
    ...(media?.content_type ? { mimeType: media.content_type } : {}),
    result
  };
}

export const falProvider: Provider = {
  id: 'fal',
  capabilities: ['image', 'video', 'audio', 'stt', 'tts'],
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    if (!context.apiKey) throw new Error('FAL_KEY is required');

    const operation = operationOf(request);
    const model = request.model ?? DEFAULT_MODELS[operation];
    const base = (context.baseUrl ?? 'https://queue.fal.run').replace(/\/$/, '');
    const headers = { Authorization: `Key ${context.apiKey}`, 'Content-Type': 'application/json' };
    const input = buildInput(request, operation);
    const metadata = metadataOf(request);

    const submitted = await requestJson<FalSubmit>(`${base}/${model}`, {
      method: 'POST',
      timeoutMs: context.timeoutMs,
      headers,
      body: JSON.stringify(input)
    });

    const wait = metadata.waitForResult !== false;
    if (!wait) {
      return {
        output: { requestId: submitted.request_id, status: 'queued', operation, model },
        provider: 'fal', model,
        metadata: { requestId: submitted.request_id, operation, status: 'queued' }
      };
    }

    const maxWaitMs = Number(metadata.maxWaitMs ?? 300_000);
    const pollMs = Number(metadata.pollIntervalMs ?? 1_500);
    const deadline = Date.now() + maxWaitMs;
    let lastStatus = 'IN_QUEUE';

    while (Date.now() < deadline) {
      const status = await requestJson<FalStatus>(`${base}/${model}/requests/${submitted.request_id}/status`, {
        method: 'GET',
        timeoutMs: Math.min(context.timeoutMs ?? 60_000, 15_000),
        headers
      });
      lastStatus = status.status;

      if (status.status === 'COMPLETED') {
        const result = await requestJson<unknown>(`${base}/${model}/requests/${submitted.request_id}`, {
          method: 'GET', timeoutMs: context.timeoutMs, headers
        });
        return {
          output: normalizeResult(result, submitted.request_id, operation),
          provider: 'fal', model,
          metadata: { requestId: submitted.request_id, operation, status: status.status }
        };
      }
      if (status.status === 'FAILED' || status.status === 'CANCELLED') {
        throw new Error(`fal request ${submitted.request_id} ended with status ${status.status}`);
      }
      await sleep(pollMs);
    }

    return {
      output: { requestId: submitted.request_id, status: lastStatus, operation, model },
      provider: 'fal', model,
      metadata: {
        requestId: submitted.request_id,
        operation,
        pending: true,
        timedOut: true,
        pollUrl: `${base}/${model}/requests/${submitted.request_id}/status`
      }
    };
  }
};
