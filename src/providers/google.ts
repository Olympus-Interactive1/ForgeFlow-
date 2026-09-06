import type { ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestJson } from '../core/http.js';

interface GeminiResponse { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; }
interface GeminiModel { name?: string; supportedGenerationMethods?: string[]; }
interface GeminiModelsResponse { models?: GeminiModel[]; }

export const googleProvider: Provider = {
  id: 'google',
  free: true,
  capabilities: ['text'],
  async listModels(): Promise<string[]> {
    const key = process.env.GOOGLE_API_KEY;
    const fallback = 'gemini-3.1-flash-lite';
    if (!key) return [fallback];
    const base = (process.env.GOOGLE_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const body = await requestJson<GeminiModelsResponse>(`${base}/models?key=${encodeURIComponent(key)}`, {
      method: 'GET', timeoutMs: Number(process.env.FORGEFLOW_PROVIDER_TIMEOUT_MS ?? 60000), headers: { 'Content-Type': 'application/json' }
    });
    const configured = process.env.GOOGLE_FREE_MODELS?.split(',').map(s => s.trim()).filter(Boolean) ?? [fallback];
    const available = new Set((body.models ?? []).filter(model => model.name && model.supportedGenerationMethods?.includes('generateContent')).map(model => model.name!.replace(/^models\//, '')));
    return configured.filter(model => available.has(model));
  },
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    if (!context.apiKey) throw new Error('GOOGLE_API_KEY is required');
    const model = request.model ?? 'gemini-3.1-flash-lite';
    const base = (context.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const body = await requestJson<GeminiResponse>(`${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(context.apiKey)}`, {
      method: 'POST', timeoutMs: context.timeoutMs, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: request.prompt ?? String(request.input ?? '') }] }] })
    });
    const output = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? null;
    return { output, provider: 'google', model, metadata: { free: true } };
  }
};
