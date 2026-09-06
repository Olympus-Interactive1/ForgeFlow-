import { describe, expect, it, vi } from 'vitest';
import { MediaPipeline } from './media-pipeline.js';
import type { ModelResponse } from './types.js';

const image = {
  kind: 'image' as const,
  mimeType: 'image/png',
  data: 'aGVsbG8=',
};

const response = (output: unknown, asset?: typeof image): ModelResponse => ({
  output,
  provider: 'mock',
  model: 'mock-model',
  asset,
});

describe('MediaPipeline', () => {
  it('routes a step with its operation metadata', async () => {
    const route = vi.fn().mockResolvedValue(response(image, image));
    const pipeline = new MediaPipeline({ route } as never);

    await pipeline.run({ capability: 'image', operation: 'image_generate', prompt: 'test' });

    expect(route).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'image',
      prompt: 'test',
      metadata: { operation: 'image_generate' },
    }));
  });

  it('chains the previous asset as a data URL', async () => {
    const route = vi.fn()
      .mockResolvedValueOnce(response(image, image))
      .mockResolvedValueOnce(response({ ok: true }, undefined));
    const pipeline = new MediaPipeline({ route } as never);

    const results = await pipeline.runAssetChain([
      { capability: 'image', operation: 'image_generate', prompt: 'a product' },
      { capability: 'video', operation: 'video_image_to_video', prompt: 'animate it', inputFromPrevious: true },
    ]);

    expect(results).toHaveLength(2);
    expect(route.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      capability: 'video',
      input: 'data:image/png;base64,aGVsbG8=',
      metadata: { operation: 'video_image_to_video' },
    }));
  });

  it('fails clearly when chaining without an asset', async () => {
    const route = vi.fn().mockResolvedValue(response('text'));
    const pipeline = new MediaPipeline({ route } as never);

    await expect(pipeline.runAssetChain([
      { capability: 'video', operation: 'video_image_to_video', inputFromPrevious: true },
    ])).rejects.toThrow('previous media asset');
  });

  it('accepts URL assets as chain input', () => {
    expect(MediaPipeline.assetInput({ kind: 'video', mimeType: 'video/mp4', url: 'https://example.test/video.mp4' }))
      .toBe('https://example.test/video.mp4');
  });
});
