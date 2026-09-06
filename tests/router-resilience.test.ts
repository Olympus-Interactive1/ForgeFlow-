import { describe, expect, it } from 'vitest';
import { ModelRouter } from '../src/core/router.js';
import type { Provider } from '../src/core/types.js';

const failing = (id: string): Provider => ({
  id,
  free: true,
  capabilities: ['text'],
  async execute() { throw new Error(`${id} failed`); }
});

const succeeding = (id: string): Provider => ({
  id,
  free: true,
  capabilities: ['text'],
  async execute(request) { return { output: request.prompt ?? '', provider: id }; }
});

describe('ModelRouter resilience', () => {
  it('falls back after an automatic provider failure', async () => {
    const router = new ModelRouter({ providers: [failing('first'), succeeding('second')] });
    const result = await router.route({ capability: 'text', prompt: 'hello', mode: 'auto' });
    expect(result.provider).toBe('second');
    expect(router.getHealth().first.failures).toBe(1);
    expect(router.getHealth().second.successes).toBe(1);
  });

  it('does not silently replace an explicitly selected provider', async () => {
    const router = new ModelRouter({ providers: [failing('first'), succeeding('second')] });
    await expect(router.route({ capability: 'text', provider: 'first', mode: 'auto' })).rejects.toThrow('first failed');
    expect(router.getHealth().first.failures).toBe(1);
    expect(router.getHealth().second.successes).toBe(0);
  });

  it('resets provider health', async () => {
    const router = new ModelRouter({ providers: [failing('first')] });
    await expect(router.route({ capability: 'text' })).rejects.toThrow();
    expect(router.getHealth().first.failures).toBe(1);
    router.resetHealth('first');
    expect(router.getHealth().first).toEqual({ successes: 0, failures: 0, consecutiveFailures: 0, latencyMs: 0 });
  });
});
