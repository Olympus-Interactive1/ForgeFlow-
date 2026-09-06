import type { DiscoveredModel, ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestBytes, requestJson } from '../core/http.js';
import { extractTextContent } from '../core/response.js';
import { normalizeMediaAsset } from '../core/media-asset.js';

interface OpenRouterMessage { content?: unknown; reasoning_content?: unknown; }
interface OpenRouterResponse { choices?: Array<{ message?: OpenRouterMessage }>; model?: string; usage?: Record<string, number>; }
interface OpenRouterModel { id?: string; pricing?: { prompt?: string; completion?: string }; architecture?: { input_modalities?: string[]; output_modalities?: string[] }; }
interface OpenRouterModelsResponse { data?: OpenRouterModel[]; }
interface ImageResponse { data?: Array<{ b64_json?: string; url?: string; media_type?: string }>; }
interface VideoModel { id?: string; pricing_skus?: Record<string, string>; supported_frame_images?: string[]; }
interface VideoModelsResponse { data?: VideoModel[]; }
interface VideoJob { id?: string; status?: string; polling_url?: string; unsigned_urls?: string[]; usage?: Record<string, number>; error?: string; }

const timeout = () => Number(process.env.FORGEFLOW_PROVIDER_TIMEOUT_MS ?? 120000);
const freePrice = (value?: string) => value === '0' || value === '0.0' || value === '0.00';
const allPricesFree = (prices: Record<string, string> | undefined) => { const values = Object.values(prices ?? {}); return values.length > 0 && values.every(freePrice); };
const trustedFreeMediaModels = () => new Set((process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS ?? '').split(',').map(value => value.trim()).filter(Boolean));

/**
 * OpenRouter's media pricing catalog is not sufficient proof of account-level
 * free access: image/video requests may still require purchased credits.
 * Free-only routing therefore requires an explicit trusted model allowlist.
 */
export function isVerifiedFreeMediaModel(modelId: string, pricingSkus?: Record<string, string>): boolean {
  if (trustedFreeMediaModels().has(modelId)) return true;
  return false;
}

export const openRouterProvider: Provider = {
  id: 'openrouter', free: true, capabilities: ['text', 'image', 'video'],
  async discoverModels(context?: ProviderContext): Promise<DiscoveredModel[]> {
    const key = context?.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!key) return [{ id: 'openrouter/free', capabilities: ['text'], free: true, quality: 60 }];
    const base = (context?.baseUrl ?? process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const headers: Record<string, string> = { Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://github.com/Olympus-Interactive1/ForgeFlow-', 'X-Title': 'ForgeFlow MCP' };
    const [catalog, images, videos] = await Promise.all([
      requestJson<OpenRouterModelsResponse>(`${base}/models`, { method: 'GET', timeoutMs: timeout(), headers }),
      requestJson<{ data?: Array<{ id?: string; pricing_skus?: Record<string, string> }> }>(`${base}/images/models`, { method: 'GET', timeoutMs: timeout(), headers }).catch(() => ({ data: [] })),
      requestJson<VideoModelsResponse>(`${base}/videos/models`, { method: 'GET', timeoutMs: timeout(), headers }).catch(() => ({ data: [] }))
    ]);
    const result: DiscoveredModel[] = [];
    for (const model of catalog.data ?? []) {
      if (!model.id) continue;
      const input = model.architecture?.input_modalities ?? [], output = model.architecture?.output_modalities ?? [], capabilities: string[] = [];
      if (output.includes('text') || (!output.length && input.includes('text'))) capabilities.push('text');
      if (input.includes('image') || output.includes('image')) capabilities.push('image');
      const free = freePrice(model.pricing?.prompt) && freePrice(model.pricing?.completion);
      if (capabilities.length) result.push({ id: model.id, capabilities: capabilities as DiscoveredModel['capabilities'], free, quality: free ? 60 : 75 });
    }
    for (const model of images.data ?? []) if (model.id) {
      const verifiedFree = isVerifiedFreeMediaModel(model.id, model.pricing_skus);
      result.push({ id: model.id, capabilities: ['image'], free: verifiedFree, quality: 85, eligibility: verifiedFree ? 'free' : 'unknown', metadata: { endpoint: 'images', eligibility: verifiedFree ? 'free' : 'unknown', eligibilityReason: verifiedFree ? 'explicitly-trusted-free-media-model' : 'OpenRouter media pricing metadata does not prove account-level credit-free access' } });
    }
    for (const model of videos.data ?? []) if (model.id) {
      const verifiedFree = isVerifiedFreeMediaModel(model.id, model.pricing_skus);
      result.push({ id: model.id, capabilities: ['video'], free: verifiedFree, quality: 90, eligibility: verifiedFree ? 'free' : 'unknown', metadata: { endpoint: 'videos', frameImages: model.supported_frame_images ?? [], eligibility: verifiedFree ? 'free' : 'unknown', eligibilityReason: verifiedFree ? 'explicitly-trusted-free-media-model' : 'OpenRouter media pricing metadata does not prove account-level credit-free access' } });
    }
    return result;
  },
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    const apiKey = context.apiKey; if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');
    const base = (context.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, ''), model = request.model ?? 'openrouter/free';
    const operation = typeof request.metadata?.operation === 'string' ? request.metadata.operation : '';
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://github.com/Olympus-Interactive1/ForgeFlow-', 'X-Title': 'ForgeFlow MCP' };
    if (operation === 'image_generate' || operation === 'image_edit') {
      const imageOptions = (request.metadata?.imageOptions ?? {}) as Record<string, unknown>;
      const body = await requestJson<ImageResponse>(`${base}/images`, { method: 'POST', timeoutMs: context.timeoutMs ?? timeout(), headers, body: JSON.stringify({ model, prompt: request.prompt ?? String(request.input ?? ''), ...imageOptions }) });
      const item = body.data?.[0]; if (!item?.b64_json && !item?.url) throw new Error('OpenRouter image API returned no image');
      const asset = normalizeMediaAsset(item.b64_json ? { data: item.b64_json, mimeType: item.media_type ?? 'image/png' } : { url: item.url, mimeType: item.media_type ?? 'image/png' }, 'image');
      return { output: asset, asset, provider: 'openrouter', model, metadata: { free: isVerifiedFreeMediaModel(model), endpoint: 'images' } };
    }
    if (operation === 'video_generate' || operation === 'video_image_to_video') {
      const options = (request.metadata?.videoOptions ?? {}) as Record<string, unknown>, body: Record<string, unknown> = { model, prompt: request.prompt ?? String(request.input ?? ''), ...options };
      if (request.input && typeof request.input === 'string' && request.input.startsWith('data:image/')) body.frame_images = [{ frame_type: 'first_frame', image_url: request.input }];
      const job = await requestJson<VideoJob>(`${base}/videos`, { method: 'POST', timeoutMs: context.timeoutMs ?? timeout(), headers, body: JSON.stringify(body) });
      if (!job.id) throw new Error(job.error ?? 'OpenRouter video job was not created');
      const pollUrl = job.polling_url ? new URL(job.polling_url, base).toString() : `${base}/videos/${encodeURIComponent(job.id)}`;
      let status = job;
      for (let attempt = 0; attempt < 90; attempt++) { if (status.status === 'completed') break; if (status.status === 'failed' || status.status === 'cancelled') throw new Error(status.error ?? `OpenRouter video generation ${status.status}`); await new Promise(resolve => setTimeout(resolve, 2000)); status = await requestJson<VideoJob>(pollUrl, { method: 'GET', timeoutMs: context.timeoutMs ?? timeout(), headers }); }
      if (status.status !== 'completed') throw new Error('OpenRouter video generation timed out');
      const content = await requestBytes(`${base}/videos/${encodeURIComponent(job.id)}/content?index=0`, { method: 'GET', timeoutMs: context.timeoutMs ?? timeout(), headers });
      const asset = normalizeMediaAsset({ data: Buffer.from(content.bytes).toString('base64'), mimeType: content.contentType ?? 'video/mp4' }, 'video');
      return { output: asset, asset, provider: 'openrouter', model, usage: status.usage, metadata: { free: isVerifiedFreeMediaModel(model), endpoint: 'videos' } };
    }
    const body = await requestJson<OpenRouterResponse>(`${base}/chat/completions`, { method: 'POST', timeoutMs: context.timeoutMs, headers, body: JSON.stringify({ model, messages: [{ role: 'user', content: request.prompt ?? String(request.input ?? '') }] }) });
    const message = body.choices?.[0]?.message, output = extractTextContent(message?.content);
    if (output !== null) return { output, provider: 'openrouter', model: body.model ?? model, usage: body.usage, metadata: { free: true, routing: model === 'openrouter/free' ? 'dynamic-free-model' : 'explicit-model' } };
    if (message?.reasoning_content !== undefined && message.reasoning_content !== null) throw new Error('OpenRouter returned reasoning content without a final text response');
    throw new Error('OpenRouter returned no final text content');
  }
};
