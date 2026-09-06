import { describe, expect, it } from 'vitest';
import { ModelRouter } from '../src/core/router.js';
import type { Provider } from '../src/core/types.js';

const provider = (id: string): Provider => ({
  id,
  free: id === 'free' || id === 'text',
  capabilities: ['text'],
  async execute(request) { return { output: request.prompt ?? '', provider: id }; }
});

describe('ModelRouter', () => {
  it('prefers configured free providers', async () => {
    const router = new ModelRouter({ providers: [provider('paid'), provider('free')], freeProviders: ['free'] });
    const result = await router.route({ capability: 'text', prompt: 'hello', mode: 'free-first' });
    expect(result.provider).toBe('free');
  });

  it('rejects unsupported capabilities', async () => {
    const router = new ModelRouter({ providers: [provider('text')] });
    await expect(router.route({ capability: 'image' })).rejects.toThrow();
  });
});
