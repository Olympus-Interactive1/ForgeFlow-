import { describe, expect, it } from 'vitest';
import type { Capability, ModelRequest, Provider } from '../src/core/types.js';
import { falProvider } from '../src/providers/fal.js';

const capabilities: Capability[] = ['text', 'image', 'video', 'audio', 'stt', 'tts', 'embedding'];

function fakeProvider(id: string, supported: Capability[]): Provider {
  return {
    id,
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
    expect(falProvider.capabilities).toEqual(['image', 'video', 'audio', 'stt', 'tts']);
  });

  it('keeps operation metadata separate from the generic capability vocabulary', () => {
    const request: ModelRequest = {
      capability: 'video',
      metadata: { operation: 'video_image_to_video' },
    };
    expect(request.capability).toBe('video');
    expect(request.metadata?.operation).toBe('video_image_to_video');
  });
});
