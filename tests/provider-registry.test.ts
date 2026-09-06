import { describe, expect, it } from 'vitest';
import { ProviderRegistry } from '../src/core/provider-registry.js';
import type { Provider } from '../src/core/types.js';

const provider = (id: string): Provider => ({ id, capabilities: ['text'], async execute() { return { output: null, provider: id }; } });

describe('ProviderRegistry', () => {
  it('registers and retrieves providers', () => {
    const registry = new ProviderRegistry().register(provider('one')).register(provider('two'));
    expect(registry.get('one')?.id).toBe('one');
    expect(registry.all().map(item => item.id)).toEqual(['one', 'two']);
  });

  it('rejects duplicate provider ids', () => {
    const registry = new ProviderRegistry().register(provider('one'));
    expect(() => registry.register(provider('one'))).toThrow('Provider already registered: one');
  });
});
