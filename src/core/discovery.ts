import type { Capability, Provider, ProviderContext } from './types.js';

export interface DiscoveredProvider {
  id: string;
  free: boolean;
  enabledByPolicy: boolean;
  capabilities: readonly Capability[];
  models: string[];
  discoveredAt: string;
  error?: string;
}

export async function discoverProviders(
  providers: Provider[],
  contextFor: (provider: Provider) => ProviderContext,
  freeOnly: boolean
): Promise<DiscoveredProvider[]> {
  const results = await Promise.all(providers.map(async provider => {
    if (freeOnly && !provider.free) {
      return { id: provider.id, free: provider.free, enabledByPolicy: false, capabilities: provider.capabilities, models: [], discoveredAt: new Date().toISOString() };
    }
    try {
      const models = provider.listModels ? await provider.listModels() : [];
      return { id: provider.id, free: provider.free, enabledByPolicy: true, capabilities: provider.capabilities, models, discoveredAt: new Date().toISOString() };
    } catch (error) {
      return { id: provider.id, free: provider.free, enabledByPolicy: true, capabilities: provider.capabilities, models: [], discoveredAt: new Date().toISOString(), error: String(error) };
    }
  }));
  return results;
}
