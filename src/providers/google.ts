import type { ModelRequest, ModelResponse, Provider, ProviderContext } from '../core/types.js';
import { requestJson } from '../core/http.js';

interface GeminiResponse { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; }

export const googleProvider: Provider = {
  id: 'google',
  capabilities: ['text', 'image', 'video'],
  async execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse> {
    if (!context.apiKey) throw new Error('GOOGLE_API_KEY is required');
    const model = request.model ?? 'gemini-2.5-flash';
    const base = context.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    const body = await requestJson<GeminiResponse>(`${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(context.apiKey)}`, {
      method: 'POST', timeoutMs: context.timeoutMs, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: request.prompt ?? String(request.input ?? '') }] }] })
    });
    const output = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? null;
    return { output, provider: 'google', model };
  }
};
