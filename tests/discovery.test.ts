import { describe, expect, it } from 'vitest';
import { discoverProviders } from '../src/core/discovery.js';
import type { Provider } from '../src/core/types.js';

describe('provider discovery', () => {
  it('returns discovered free models and hides paid providers under free-only policy', async () => {
    const free: Provider = {
      id: 'free', free: true, capabilities: ['text'],
      listModels: async () => ['free-model'],
      execute: async () => ({ output: 'ok', provider: 'free' })
    };
    const paid: Provider = {
      id: 'paid', free: false, capabilities: ['text'],
      listModels: async () => ['paid-model'],
      execute: async () => ({ output: 'ok', provider: 'paid' })
    };
    const result = await discoverProviders([free, paid], true);
    expect(result.find(p => p.id === 'free')?.models).toEqual(['free-model']);
    expect(result.find(p => p.id === 'paid')).toMatchObject({ enabledByPolicy: false, models: [] });
  });

  it('contains discovery errors without breaking other providers', async () => {
    const broken: Provider = {
      id: 'broken', free: true, capabilities: ['text'],
      listModels: async () => { throw new Error('catalog unavailable'); },
      execute: async () => ({ output: 'ok', provider: 'broken' })
    };
    const result = await discoverProviders([broken], true);
    expect(result[0]?.models).toEqual([]);
    expect(result[0]?.error).toContain('catalog unavailable');
  });
});
