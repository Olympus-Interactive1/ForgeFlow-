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
    try {
      const discoveredModels = provider.discoverModels
        ? await provider.discoverModels({ freeOnly })
        : (provider.listModels
          ? (await provider.listModels()).map(id => ({ id, capabilities: provider.capabilities, free: provider.free, eligibility: provider.free ? 'free' : 'paid' }))
          : [{ id: `${provider.id}:default`, capabilities: provider.capabilities, free: provider.free, eligibility: provider.free ? 'free' : 'paid' }]);
      const eligibleModels = freeOnly ? discoveredModels.filter(model => model.free && model.eligibility !== 'paid') : discoveredModels;
      return {
        id: provider.id,
        free: provider.free,
        enabledByPolicy: !freeOnly || provider.free || eligibleModels.length > 0,
        capabilities: provider.capabilities,
        models: eligibleModels.map(model => model.id),
        discoveredModels: eligibleModels,
        discoveredAt
      };
    } catch (error) {
      return { id: provider.id, free: provider.free, enabledByPolicy: !freeOnly || provider.free, capabilities: provider.capabilities, models: [], discoveredModels: [], discoveredAt, error: String(error) };
    }
  }));
}
