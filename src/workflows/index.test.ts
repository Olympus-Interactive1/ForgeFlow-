import { describe, expect, it, vi } from 'vitest';
import { WorkflowEngine } from './index.js';

describe('WorkflowEngine', () => {
  it('routes createAd with explicit image and text operations', async () => {
    const route = vi.fn()
      .mockResolvedValueOnce({ output: 'image', provider: 'mock', model: 'image-model' })
      .mockResolvedValueOnce({ output: 'copy', provider: 'mock', model: 'text-model' });
    const engine = new WorkflowEngine({ route } as never);

    await engine.createAd({ brief: 'product launch' });

    expect(route).toHaveBeenNthCalledWith(1, expect.objectContaining({
      capability: 'image',
      metadata: { operation: 'image_generate' },
    }));
    expect(route).toHaveBeenNthCalledWith(2, expect.objectContaining({
      capability: 'text',
      metadata: { operation: 'text_generate' },
    }));
  });

  it('routes socialVideo as video_generate', async () => {
    const route = vi.fn().mockResolvedValue({ output: 'video', provider: 'mock' });
    const engine = new WorkflowEngine({ route } as never);

    await engine.socialVideo({ brief: 'launch teaser', durationSeconds: 20 });

    expect(route).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'video',
      prompt: 'launch teaser\nDuration: 20s',
      metadata: { operation: 'video_generate' },
    }));
  });

  it('maps fullMedia capabilities to compatible operations', async () => {
    const route = vi.fn().mockResolvedValue({ output: 'ok', provider: 'mock' });
    const engine = new WorkflowEngine({ route } as never);

    await engine.fullMedia({ brief: 'campaign', outputs: ['image', 'video', 'audio', 'tts'] });

    expect(route).toHaveBeenNthCalledWith(1, expect.objectContaining({ capability: 'image', metadata: { operation: 'image_generate' } }));
    expect(route).toHaveBeenNthCalledWith(2, expect.objectContaining({ capability: 'video', metadata: { operation: 'video_generate' } }));
    expect(route).toHaveBeenNthCalledWith(3, expect.objectContaining({ capability: 'audio', metadata: { operation: 'audio_generate' } }));
    expect(route).toHaveBeenNthCalledWith(4, expect.objectContaining({ capability: 'tts', metadata: { operation: 'tts' } }));
  });
});
