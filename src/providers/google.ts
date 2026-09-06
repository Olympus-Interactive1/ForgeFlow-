import type { DiscoveredModel, ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { pollMediaJob } from '../core/media-job.js';
import { requestBytes, requestJson } from '../core/http.js';

interface GeminiPart { text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string }; }
interface GeminiResponse { candidates?: Array<{ content?: { parts?: GeminiPart[] } }>; }
interface GeminiModel { name?: string; supportedGenerationMethods?: string[]; }
interface GeminiModelsResponse { models?: GeminiModel[]; }
interface GoogleOperation { name?: string; done?: boolean; error?: { message?: string }; response?: { generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> } }; }

const timeout = () => Number(process.env.FORGEFLOW_PROVIDER_TIMEOUT_MS ?? 120000);
const configuredFree = () => new Set((process.env.GOOGLE_FREE_MODELS ?? 'gemini-3.1-flash-lite').split(',').map(s => s.trim()).filter(Boolean));
const modelCapabilities = (id: string): DiscoveredModel['capabilities'] => {
  const name = id.toLowerCase();
  if (name.includes('veo')) return ['video'];
  if (name.includes('image') || name.includes('imagen') || name.includes('nano-banana')) return ['image'];
  return ['text'];
};

export const googleProvider: Provider = {
  id: 'google',
  free: true,
  capabilities: ['text', 'image', 'video'],

  async discoverModels(context?: ProviderContext): Promise<DiscoveredModel[]> {
    const key = context?.apiKey ?? process.env.GOOGLE_API_KEY;
    const free = configuredFree();
    if (!key) return [{ id: 'gemini-3.1-flash-lite', capabilities: ['text'], free: true, quality: 65 }];
    const base = (context?.baseUrl ?? process.env.GOOGLE_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const body = await requestJson<GeminiModelsResponse>(`${base}/models?key=${encodeURIComponent(key)}`, {
      method: 'GET', timeoutMs: timeout(), headers: { 'Content-Type': 'application/json' }
    });
    return (body.models ?? [])
      .filter(model => Boolean(model.name) && Boolean(model.supportedGenerationMethods) && model.supportedGenerationMethods!.includes('generateContent'))
      .map(model => {
        const id = model.name!.replace(/^models\//, '');
        const capabilities = modelCapabilities(id);
        return { id, capabilities, free: free.has(id), quality: capabilities.includes('video') ? 95 : capabilities.includes('image') ? 90 : 70 };
      });
  },

  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    const apiKey = context.apiKey;
    if (!apiKey) throw new Error('GOOGLE_API_KEY is required');
    const model = request.model ?? 'gemini-3.1-flash-lite';
    const base = (context.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const operation = typeof request.metadata?.operation === 'string' ? request.metadata.operation : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };

    if (operation === 'image_generate' || operation === 'image_edit') {
      const imageOptions = (request.metadata?.imageOptions ?? {}) as Record<string, unknown>;
      const parts: Record<string, unknown>[] = [{ text: request.prompt ?? String(request.input ?? '') }];
      if (typeof request.input === 'string' && request.input.startsWith('data:image/')) {
        const match = request.input.match(/^data:([^;]+);base64,(.+)$/s);
        if (match) parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
      }
      const body = await requestJson<GeminiResponse>(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', timeoutMs: context.timeoutMs ?? timeout(), headers,
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], ...imageOptions } })
      });
      const part = body.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data || p.inline_data?.data);
      const data = part?.inlineData?.data ?? part?.inline_data?.data;
      if (!data) throw new Error('Google image model returned no image');
      return { output: { data, mimeType: part?.inlineData?.mimeType ?? part?.inline_data?.mime_type ?? 'image/png' }, provider: 'google', model, metadata: { free: configuredFree().has(model) } };
    }

    if (operation === 'video_generate' || operation === 'video_image_to_video') {
      const videoOptions = (request.metadata?.videoOptions ?? {}) as Record<string, unknown>;
      const instance: Record<string, unknown> = { prompt: request.prompt ?? String(request.input ?? '') };
      if (typeof request.input === 'string' && request.input.startsWith('data:image/')) {
        const match = request.input.match(/^data:([^;]+);base64,(.+)$/s);
        if (match) instance.image = { bytesBase64Encoded: match[2], mimeType: match[1] };
      }
      const operationResult = await requestJson<GoogleOperation>(`${base}/models/${encodeURIComponent(model)}:predictLongRunning`, {
        method: 'POST', timeoutMs: context.timeoutMs ?? timeout(), headers,
        body: JSON.stringify({ instances: [instance], parameters: videoOptions })
      });
      if (!operationResult.name) throw new Error(operationResult.error?.message ?? 'Google video operation was not created');

      const completed = await pollMediaJob<GoogleOperation>(async () => {
        const status = await requestJson<GoogleOperation>(`${base}/${operationResult.name}`, {
          method: 'GET', timeoutMs: context.timeoutMs ?? timeout(), headers
        });
        return {
          id: operationResult.name!,
          provider: 'google',
          status: status.error ? 'failed' : status.done ? 'completed' : 'running',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          result: status,
          error: status.error?.message,
        };
      }, {
        timeoutMs: context.timeoutMs ?? timeout(),
        intervalMs: Number(process.env.FORGEFLOW_MEDIA_JOB_POLL_MS ?? 3000),
      });

      const status = completed.result;
      if (!status) throw new Error('Google video operation completed without a response');
      const uri = status.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error('Google video model returned no video');
      const video = await requestBytes(uri, { method: 'GET', timeoutMs: context.timeoutMs ?? timeout(), headers });
      return { output: { data: Buffer.from(video.bytes).toString('base64'), mimeType: video.contentType ?? 'video/mp4' }, provider: 'google', model, metadata: { free: configuredFree().has(model) } };
    }

    const body = await requestJson<GeminiResponse>(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', timeoutMs: context.timeoutMs, headers,
      body: JSON.stringify({ contents: [{ parts: [{ text: request.prompt ?? String(request.input ?? '') }] }] })
    });
    const output = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? null;
    return { output, provider: 'google', model, metadata: { free: configuredFree().has(model) } };
  }
};
