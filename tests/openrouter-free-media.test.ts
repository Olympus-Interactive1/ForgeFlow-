import { afterEach, describe, expect, it } from 'vitest';
import { isVerifiedFreeMediaModel } from '../src/providers/openrouter.js';

describe('OpenRouter media free eligibility', () => {
  afterEach(() => {
    delete process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS;
  });

  it('does not treat zero-priced media SKUs as proof of free access', () => {
    expect(isVerifiedFreeMediaModel('example/image-model', { image: '0' })).toBe(false);
    expect(isVerifiedFreeMediaModel('example/video-model', { video: '0' })).toBe(false);
  });

  it('allows an explicitly trusted media model', () => {
    process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS = 'example/image-model,example/video-model';
    expect(isVerifiedFreeMediaModel('example/image-model', { image: '1' })).toBe(true);
    expect(isVerifiedFreeMediaModel('example/video-model', { video: '0' })).toBe(true);
  });

  it('does not trust an unlisted model', () => {
    process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS = 'example/other-model';
    expect(isVerifiedFreeMediaModel('example/image-model', { image: '0' })).toBe(false);
  });
});
