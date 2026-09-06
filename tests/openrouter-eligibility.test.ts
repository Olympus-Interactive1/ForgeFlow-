import { afterEach, describe, expect, it } from 'vitest';
import { isVerifiedFreeMediaModel } from '../src/providers/openrouter.js';

describe('OpenRouter free media eligibility', () => {
  const original = process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS;

  afterEach(() => {
    if (original === undefined) delete process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS;
    else process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS = original;
  });

  it('does not infer account-level free access from pricing metadata', () => {
    delete process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS;
    expect(isVerifiedFreeMediaModel('image-model', { input: '0', output: '0' })).toBe(false);
    expect(isVerifiedFreeMediaModel('video-model', {})).toBe(false);
  });

  it('accepts only explicitly trusted media models', () => {
    process.env.FORGEFLOW_TRUSTED_FREE_MEDIA_MODELS = 'image-model, video-model';
    expect(isVerifiedFreeMediaModel('image-model')).toBe(true);
    expect(isVerifiedFreeMediaModel('video-model')).toBe(true);
    expect(isVerifiedFreeMediaModel('other-model')).toBe(false);
  });
});
