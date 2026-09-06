import { describe, expect, it } from 'vitest';
import { normalizeMediaAsset, assertMediaAsset } from '../src/core/media-asset.js';

describe('media asset provider contract', () => {
  it('accepts inline image data', () => {
    const asset = normalizeMediaAsset({ data: 'aGVsbG8=', mimeType: 'image/png' }, 'image');
    expect(asset.kind).toBe('image');
    expect(asset.data).toBe('aGVsbG8=');
    expect(asset.mimeType).toBe('image/png');
  });

  it('accepts remote video URLs', () => {
    const asset = normalizeMediaAsset({ url: 'https://example.test/video.mp4', mimeType: 'video/mp4' }, 'video');
    expect(asset.kind).toBe('video');
    expect(asset.url).toBe('https://example.test/video.mp4');
  });

  it('rejects assets containing both URL and inline data', () => {
    expect(() => assertMediaAsset({ kind: 'audio', mimeType: 'audio/wav', url: 'https://example.test/a.wav', data: 'AAAA' })).toThrow('cannot contain both');
  });

  it('rejects a MIME type that does not match the asset kind', () => {
    expect(() => assertMediaAsset({ kind: 'video', mimeType: 'image/png', data: 'AAAA' })).toThrow('Invalid MIME type');
  });
});
