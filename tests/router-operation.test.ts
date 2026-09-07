import { describe, expect, it, vi } from 'vitest';
import { ModelRouter } from '../src/core/router.js';
import type { Provider } from '../src/core/types.js';

describe('ModelRouter operation-aware selection', () => {
  it('does not select an image-understanding model for image generation', async () => {
    const execute = vi.fn(async (request: Parameters<Provider['execute']>[0]) => ({
      output: 'ok',
      provider: 'test',
      model: request.model,
    }));
    const provider: Provider = {
      id: 'test',
      free: true,
      capabilities: ['image'],
      discoverModels: async () => [
        { id: 'vision-only', capabilities: ['image'], free: true, metadata: { operations: ['image_analyze'] } },
        { id: 'image-generator', capabilities: ['image'], free: true, metadata: { operations: ['image_generate'] } },
      ],
      execute,
    };

    const router = new ModelRouter({ providers: [provider], freeOnly: true });
    const result = await router.route({
      capability: 'image',
      mode: 'free-first',
      prompt: 'generate a landscape',
      metadata: { operation: 'image_generate' },
    });

    expect(result.model).toBe('image-generator');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0].model).toBe('image-generator');
  });

  it('keeps providers without operation metadata compatible', async () => {
    const execute = vi.fn(async (request: Parameters<Provider['execute']>[0]) => ({
      output: 'ok',
      provider: 'test',
      model: request.model,
    }));
    const provider: Provider = {
      id: 'test',
      free: true,
      capabilities: ['image'],
      discoverModels: async () => [
        { id: 'legacy-image', capabilities: ['image'], free: true },
      ],
      execute,
    };

    const router = new ModelRouter({ providers: [provider], freeOnly: true });
    const result = await router.route({
      capability: 'image',
      mode: 'free-first',
      metadata: { operation: 'image_generate' },
    });

    expect(result.model).toBe('legacy-image');
  });
});
