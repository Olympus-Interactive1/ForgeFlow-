import { describe, expect, it } from 'vitest';
import { MAX_MEDIA_ASSET_DATA_CHARS, MAX_MEDIA_ASSET_URL_CHARS, assertMediaAsset } from './media-asset.js';

describe('media asset safety limits', () => {
  const base = { kind: 'image' as const, mimeType: 'image/png', data: 'a' };

  it('accepts assets within the inline payload limit', () => {
    expect(() => assertMediaAsset({ ...base, data: 'a'.repeat(MAX_MEDIA_ASSET_DATA_CHARS) })).not.toThrow();
  });

  it('rejects oversized inline payloads', () => {
    expect(() => assertMediaAsset({ ...base, data: 'a'.repeat(MAX_MEDIA_ASSET_DATA_CHARS + 1) }))
      .toThrow(`Media asset data exceeds ${MAX_MEDIA_ASSET_DATA_CHARS} characters`);
  });

  it('accepts URLs within the length limit', () => {
    expect(() => assertMediaAsset({ kind: 'image', mimeType: 'image/png', url: `https://x.test/${'a'.repeat(MAX_MEDIA_ASSET_URL_CHARS - 19)}` })).not.toThrow();
  });

  it('rejects oversized URLs', () => {
    expect(() => assertMediaAsset({ kind: 'image', mimeType: 'image/png', url: `https://x.test/${'a'.repeat(MAX_MEDIA_ASSET_URL_CHARS)}` }))
      .toThrow(`Media asset URL exceeds ${MAX_MEDIA_ASSET_URL_CHARS} characters`);
  });
});
