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

  it('does not route to a discovered paid model in free-only mode', async () => {
    const paidModelProvider: Provider = {
      id: 'mixed',
      free: true,
      capabilities: ['text'],
      async discoverModels() {
        return [
          { id: 'paid-model', capabilities: ['text'], free: false, eligibility: 'paid' },
          { id: 'free-model', capabilities: ['text'], free: true, eligibility: 'free' }
        ];
      },
      async execute(request) { return { output: request.model ?? '', provider: 'mixed' }; }
    };
    const router = new ModelRouter({ providers: [paidModelProvider], freeOnly: true });
    const result = await router.route({ capability: 'text', model: 'free-model' });
    expect(result.model).toBe('free-model');
    await expect(router.route({ capability: 'text', model: 'paid-model' })).rejects.toThrow('No compatible text model');
  });

  it('does not let a paid explicit model bypass free-only discovery', async () => {
    let executions = 0;
    const mixedProvider: Provider = {
      id: 'mixed',
      free: true,
      capabilities: ['text'],
      async discoverModels() { return [{ id: 'paid-model', capabilities: ['text'], free: false, eligibility: 'paid' }]; },
      async execute() { executions += 1; return { output: 'should not execute', provider: 'mixed' }; }
    };
    const router = new ModelRouter({ providers: [mixedProvider], freeOnly: true });
    await expect(router.route({ capability: 'text', model: 'paid-model' })).rejects.toThrow('No compatible text model');
    expect(executions).toBe(0);
  });
});
