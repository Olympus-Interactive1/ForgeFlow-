import { describe, expect, it } from 'vitest';
import type { Capability, ModelRequest, Provider } from '../src/core/types.js';
import { falProvider } from '../src/providers/fal.js';

const capabilities: Capability[] = ['text', 'image', 'video', 'audio', 'stt', 'tts', 'embedding'];

function fakeProvider(id: string, supported: Capability[]): Provider {
  return {
    id,
    free: true,
    capabilities: supported,
    async execute(request: ModelRequest) {
      return { output: request.input, provider: id };
    },
  };
}

describe('v0.4 provider contract', () => {
  it('keeps the capability vocabulary unique and stable', () => {
    expect(new Set(capabilities).size).toBe(capabilities.length);
    expect(capabilities).toContain('stt');
    expect(capabilities).toContain('tts');
  });

  it('allows providers to expose only the capabilities they implement', () => {
    const provider = fakeProvider('example', ['text', 'image']);
    expect(provider.capabilities).toEqual(['text', 'image']);
    expect(provider.capabilities).not.toContain('video');
  });

  it('declares fal media capabilities explicitly', () => {
    expect(falProvider.id).toBe('fal');
    expect(falProvider.free).toBe(false);
    expect(falProvider.capabilities).toEqual(['image', 'video', 'audio', 'stt', 'tts']);
  });

  it('filters unsupported analyze operations instead of treating them as generation', () => {
    expect(falProvider.supports?.({ capability: 'image', metadata: { operation: 'image_analyze' } })).toBe(false);
    expect(falProvider.supports?.({ capability: 'video', metadata: { operation: 'video_analyze' } })).toBe(false);
  });

  it('accepts each supported dedicated fal operation', () => {
    const operations = [
      'image_generate', 'image_edit', 'image_upscale',
      'video_generate', 'video_image_to_video', 'video_extend',
      'audio_generate', 'tts', 'stt',
    ];
    for (const operation of operations) {
      const capability = operation.startsWith('image_') ? 'image'
        : operation.startsWith('video_') ? 'video'
        : operation === 'tts' ? 'tts'
        : operation === 'stt' ? 'stt'
        : 'audio';
      expect(falProvider.supports?.({ capability, metadata: { operation } })).toBe(true);
    }
  });
});
