import { describe, expect, it } from 'vitest';
import type { ModelResponse } from '../src/core/types.js';
import { assertMediaAsset } from '../src/core/media-asset.js';

function expectMediaResponse(response: ModelResponse, kind: 'image' | 'video' | 'audio') {
  expect(response.asset).toBeDefined();
  assertMediaAsset(response.asset);
  expect(response.asset.kind).toBe(kind);
  expect(response.output).toEqual(response.asset);
}

describe('provider media response contract', () => {
  it('defines a canonical image response shape', () => {
    const asset = { kind: 'image' as const, mimeType: 'image/png', data: 'AAAA' };
    expectMediaResponse({ output: asset, asset, provider: 'google', model: 'image-model' }, 'image');
  });

  it('defines a canonical video response shape', () => {
    const asset = { kind: 'video' as const, mimeType: 'video/mp4', data: 'AAAA' };
    expectMediaResponse({ output: asset, asset, provider: 'nvidia', model: 'video-model' }, 'video');
  });

  it('defines a canonical audio response shape', () => {
    const asset = { kind: 'audio' as const, mimeType: 'audio/wav', data: 'AAAA' };
    expectMediaResponse({ output: asset, asset, provider: 'nvidia', model: 'tts-model' }, 'audio');
  });
});
