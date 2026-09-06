import type { Provider } from '../core/types.js';

export const mockProvider: Provider = {
  id: 'mock',
  capabilities: ['text', 'image', 'video', 'audio', 'stt', 'tts'],
  async execute(request) {
    return { output: { ok: true, capability: request.capability, input: request.input, prompt: request.prompt }, provider: 'mock', model: request.model };
  }
};
