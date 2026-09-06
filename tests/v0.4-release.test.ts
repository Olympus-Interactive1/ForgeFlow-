import { describe, expect, it } from 'vitest';
import { ModelRouter } from '../src/core/router.js';

describe('v0.4 release hardening', () => {
  it('keeps explicit provider selection deterministic', async () => {
    const calls: string[] = [];
    const router = new ModelRouter({
      providers: [
        { id: 'a', capabilities: ['text'], execute: async () => { calls.push('a'); return { text: 'ok' }; } },
        { id: 'b', capabilities: ['text'], execute: async () => { calls.push('b'); return { text: 'ok' }; } },
      ] as any,
    } as any);
    const result = await router.execute({ operation: 'text', provider: 'b' } as any);
    expect(result).toEqual({ text: 'ok' });
    expect(calls).toEqual(['b']);
  });

  it('does not fallback on an explicitly selected provider failure', async () => {
    const calls: string[] = [];
    const router = new ModelRouter({
      providers: [
        { id: 'a', capabilities: ['text'], execute: async () => { calls.push('a'); return { text: 'wrong' }; } },
        { id: 'b', capabilities: ['text'], execute: async () => { calls.push('b'); throw new Error('boom'); } },
      ] as any,
    } as any);
    await expect(router.execute({ operation: 'text', provider: 'b' } as any)).rejects.toThrow('boom');
    expect(calls).toEqual(['b']);
  });
});
