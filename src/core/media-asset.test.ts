import { describe, expect, it } from 'vitest';
import { assertMediaAsset, normalizeMediaAsset } from './media-asset.js';

describe('media assets', () => {
  it('accepts URL-backed image assets', () => {
    expect(() => assertMediaAsset({ kind: 'image', mimeType: 'image/png', url: 'https://example.com/a.png' })).not.toThrow();
  });

  it('accepts inline video data', () => {
    const asset = normalizeMediaAsset({ data: 'AAAA', mimeType: 'video/mp4', durationSeconds: 4 }, 'video');
    expect(asset).toMatchObject({ kind: 'video', mimeType: 'video/mp4', data: 'AAAA', durationSeconds: 4 });
  });

  it('rejects assets without a payload', () => {
    expect(() => assertMediaAsset({ kind: 'image', mimeType: 'image/png' })).toThrow('either url or data');
  });

  it('rejects conflicting URL and inline payloads', () => {
    expect(() => assertMediaAsset({ kind: 'audio', mimeType: 'audio/mpeg', url: 'https://example.com/a.mp3', data: 'AAAA' })).toThrow('both url and data');
  });

  it('rejects MIME types that do not match the asset kind', () => {
    expect(() => assertMediaAsset({ kind: 'video', mimeType: 'image/png', url: 'https://example.com/a.png' })).toThrow('Invalid MIME type');
  });
});
