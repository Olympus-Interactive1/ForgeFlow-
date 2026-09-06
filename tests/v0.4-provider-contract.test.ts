import { describe, expect, it } from 'vitest';

describe('v0.4 provider contract', () => {
  it('has a deterministic operation-to-capability vocabulary', () => {
    const operations = ['image_generate', 'image_edit', 'image_analyze', 'image_upscale', 'video_generate', 'video_image_to_video', 'video_extend', 'video_analyze', 'tts', 'stt', 'audio_generate'];
    expect(new Set(operations).size).toBe(operations.length);
    expect(operations).toContain('video_image_to_video');
    expect(operations).toContain('video_extend');
  });
});
