import type { Capability, DiscoveredModel, Provider } from './types.js';

export interface DiscoveredProvider {
  id: string;
  free: boolean;
  enabledByPolicy: boolean;
  capabilities: readonly Capability[];
  models: string[];
  discoveredModels: DiscoveredModel[];
  discoveredAt: string;
  error?: string;
}

export async function discoverProviders(providers: Provider[], freeOnly: boolean): Promise<DiscoveredProvider[]> {
  return Promise.all(providers.map(async provider => {
    const discoveredAt = new Date().toISOString();
    if (freeOnly && !provider.free) {
      return { id: provider.id, free: provider.free, enabledByPolicy: false, capabilities: provider.capabilities, models: [], discoveredModels: [], discoveredAt };
    }
    try {
      const discoveredModels = provider.discoverModels
        ? await provider.discoverModels({ freeOnly })
        : (provider.listModels ? (await provider.listModels()).map(id => ({ id, capabilities: provider.capabilities, free: provider.free })) : []);
      return {
        id: provider.id,
        free: provider.free,
        enabledByPolicy: true,
        capabilities: provider.capabilities,
        models: discoveredModels.map(model => model.id),
        discoveredModels,
        discoveredAt
      };
    } catch (error) {
      return { id: provider.id, free: provider.free, enabledByPolicy: true, capabilities: provider.capabilities, models: [], discoveredModels: [], discoveredAt, error: String(error) };
    }
  }));
}
