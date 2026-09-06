import type { Capability, Provider } from './types.js';

export interface DiscoveredProvider {
  id: string;
  free: boolean;
  enabledByPolicy: boolean;
  capabilities: readonly Capability[];
  models: string[];
  discoveredAt: string;
  error?: string;
}

export async function discoverProviders(providers: Provider[], freeOnly: boolean): Promise<DiscoveredProvider[]> {
  return Promise.all(providers.map(async provider => {
    const discoveredAt = new Date().toISOString();
    if (freeOnly && !provider.free) {
      return { id: provider.id, free: provider.free, enabledByPolicy: false, capabilities: provider.capabilities, models: [], discoveredAt };
    }
    try {
      const models = provider.listModels ? await provider.listModels() : [];
      return { id: provider.id, free: provider.free, enabledByPolicy: true, capabilities: provider.capabilities, models, discoveredAt };
    } catch (error) {
      return { id: provider.id, free: provider.free, enabledByPolicy: true, capabilities: provider.capabilities, models: [], discoveredAt, error: String(error) };
    }
  }));
}
