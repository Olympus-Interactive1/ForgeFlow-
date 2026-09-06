import type { Provider } from './types.js';

export class ProviderRegistry {
  private readonly providers = new Map<string, Provider>();

  register(provider: Provider): this {
    if (this.providers.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`);
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: string): Provider | undefined { return this.providers.get(id); }
  all(): Provider[] { return [...this.providers.values()]; }
}
