import { describe, expect, it } from 'vitest';
import { ModelRouter } from '../src/core/router.js';
import type { ModelResponse, Provider } from '../src/core/types.js';

const response = (provider: string): ModelResponse => ({
  output: { provider },
  provider,
});

function provider(id: string, execute: Provider['execute']): Provider {
  return { id, free: true, capabilities: ['text'], execute };
}

describe('v0.4 release hardening', () => {
  it('keeps explicit provider selection deterministic', async () => {
    const calls: string[] = [];
    const router = new ModelRouter({
      providers: [
        provider('a', async () => { calls.push('a'); return response('a'); }),
        provider('b', async () => { calls.push('b'); return response('b'); }),
      ],
    });

    const result = await router.route({ capability: 'text', provider: 'b' });

    expect(result.provider).toBe('b');
    expect(calls).toEqual(['b']);
  });

  it('does not fallback when an explicitly selected provider fails', async () => {
    const calls: string[] = [];
    const router = new ModelRouter({
      providers: [
        provider('a', async () => { calls.push('a'); return response('a'); }),
        provider('b', async () => { calls.push('b'); throw new Error('boom'); }),
      ],
    });

    await expect(router.route({ capability: 'text', provider: 'b' })).rejects.toThrow('boom');
    expect(calls).toEqual(['b']);
  });

  it('falls back only in automatic fallback mode', async () => {
    const calls: string[] = [];
    const router = new ModelRouter({
      providers: [
        provider('a', async () => { calls.push('a'); throw new Error('a failed'); }),
        provider('b', async () => { calls.push('b'); return response('b'); }),
      ],
    });

    const result = await router.route({ capability: 'text', mode: 'fallback' });

    expect(result.provider).toBe('b');
    expect(calls).toEqual(['a', 'b']);
  });

  it('tracks success, failure, latency and consecutive failures', async () => {
    const router = new ModelRouter({
      providers: [provider('a', async () => response('a'))],
    });

    await router.route({ capability: 'text', provider: 'a' });
    const health = router.getHealth().a;

    expect(health.successes).toBe(1);
    expect(health.failures).toBe(0);
    expect(health.consecutiveFailures).toBe(0);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
