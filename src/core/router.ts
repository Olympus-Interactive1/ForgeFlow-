import type { DiscoveredModel, ModelRequest, ModelResponse, Provider, ProviderContext, RouteMode } from './types.js';

export interface RouterOptions {
  providers: Provider[];
  freeProviders?: string[];
  qualityProviders?: string[];
  contextFor?: (provider: Provider) => ProviderContext;
  freeOnly?: boolean;
}

export interface ProviderHealth {
  successes: number;
  failures: number;
  consecutiveFailures: number;
  lastFailureAt?: number;
  latencyMs: number;
}

interface Candidate { provider: Provider; model?: DiscoveredModel; }

export class ModelRouter {
  private readonly providers: Provider[];
  private readonly freeProviders: Set<string>;
  private readonly qualityProviders: Set<string>;
  private readonly contextFor: (provider: Provider) => ProviderContext;
  private readonly freeOnly: boolean;
  private readonly health = new Map<string, ProviderHealth>();
  private readonly unhealthyCooldownMs = 30_000;
  private readonly discoveryCache = new Map<string, { expiresAt: number; models: DiscoveredModel[] }>();
  private readonly discoveryTtlMs = 60_000;

  constructor(options: RouterOptions) {
    this.providers = options.providers;
    this.freeProviders = new Set(options.freeProviders ?? []);
    this.qualityProviders = new Set(options.qualityProviders ?? []);
    this.contextFor = options.contextFor ?? (() => ({}));
    this.freeOnly = options.freeOnly ?? true;
    for (const provider of this.providers) this.health.set(provider.id, { successes: 0, failures: 0, consecutiveFailures: 0, latencyMs: 0 });
  }

  async route(request: ModelRequest): Promise<ModelResponse> {
    const mode: RouteMode = request.mode ?? 'free-first';
    const candidates = await this.select(request, mode);
    if (candidates.length === 0) throw new Error(`No compatible ${request.capability} model is available under the current policy`);
    let lastError: unknown;
    for (const candidate of candidates) {
      const { provider, model } = candidate;
      const started = Date.now();
      try {
        const result = await provider.execute({ ...request, model: request.model ?? model?.id }, { ...this.contextFor(provider), freeOnly: this.freeOnly });
        this.recordSuccess(provider.id, Date.now() - started);
        return result;
      } catch (error) {
        this.recordFailure(provider.id, Date.now() - started);
        lastError = error;
        if (request.provider) throw error;
      }
    }
    throw new Error(`All compatible candidate models failed: ${String(lastError)}`);
  }

  getHealth(): Record<string, ProviderHealth> {
    return Object.fromEntries([...this.health.entries()].map(([id, value]) => [id, { ...value }]));
  }

  isFreeOnly(): boolean { return this.freeOnly; }

  resetHealth(providerId?: string): void {
    if (providerId) this.health.set(providerId, { successes: 0, failures: 0, consecutiveFailures: 0, latencyMs: 0 });
    else for (const provider of this.providers) this.health.set(provider.id, { successes: 0, failures: 0, consecutiveFailures: 0, latencyMs: 0 });
  }

  private async discover(provider: Provider): Promise<DiscoveredModel[]> {
    const cached = this.discoveryCache.get(provider.id);
    if (cached && cached.expiresAt > Date.now()) return cached.models;
    const context = this.contextFor(provider);
    let models: DiscoveredModel[];
    if (provider.discoverModels) {
      models = await provider.discoverModels(context);
    } else if (provider.listModels) {
      const ids = await provider.listModels();
      models = ids.map(id => ({ id, capabilities: provider.capabilities, free: provider.free }));
    } else {
      models = [{ id: `${provider.id}:default`, capabilities: provider.capabilities, free: provider.free }];
    }
    this.discoveryCache.set(provider.id, { expiresAt: Date.now() + this.discoveryTtlMs, models });
    return models;
  }

  private async select(request: ModelRequest, mode: RouteMode): Promise<Candidate[]> {
    const now = Date.now();
    const candidates: Candidate[] = [];
    for (const provider of this.providers) {
      if (request.provider && provider.id !== request.provider) continue;
      if (this.freeOnly && !provider.free) continue;
      if (!provider.capabilities.includes(request.capability)) continue;
      if (!(provider.supports?.(request) ?? true)) continue;
      try {
        const models = await this.discover(provider);
        const compatible = models.filter(model => model.capabilities.includes(request.capability) && (!this.freeOnly || model.free) && (!request.model || model.id === request.model));
        for (const model of compatible) candidates.push({ provider, model });
        if (compatible.length === 0 && request.model && provider.capabilities.includes(request.capability)) {
          candidates.push({ provider, model: { id: request.model, capabilities: provider.capabilities, free: provider.free } });
        }
      } catch {
        if (!request.model) candidates.push({ provider });
      }
    }
    candidates.sort((a, b) => {
      const ah = this.health.get(a.provider.id)!;
      const bh = this.health.get(b.provider.id)!;
      const aCooling = ah.lastFailureAt !== undefined && now - ah.lastFailureAt < this.unhealthyCooldownMs && ah.consecutiveFailures >= 2;
      const bCooling = bh.lastFailureAt !== undefined && now - bh.lastFailureAt < this.unhealthyCooldownMs && bh.consecutiveFailures >= 2;
      if (aCooling !== bCooling) return Number(aCooling) - Number(bCooling);
      if ((b.model?.quality ?? 50) !== (a.model?.quality ?? 50)) return (b.model?.quality ?? 50) - (a.model?.quality ?? 50);
      if (mode === 'free-first') return Number(this.freeProviders.has(b.provider.id)) - Number(this.freeProviders.has(a.provider.id));
      if (mode === 'quality') return Number(this.qualityProviders.has(b.provider.id)) - Number(this.qualityProviders.has(a.provider.id));
      return ah.consecutiveFailures - bh.consecutiveFailures || ah.latencyMs - bh.latencyMs;
    });
    return candidates;
  }

  private recordSuccess(id: string, latencyMs: number): void {
    const current = this.health.get(id) ?? { successes: 0, failures: 0, consecutiveFailures: 0, latencyMs: 0 };
    current.successes += 1;
    current.consecutiveFailures = 0;
    current.latencyMs = current.latencyMs === 0 ? latencyMs : Math.round(current.latencyMs * 0.7 + latencyMs * 0.3);
    this.health.set(id, current);
  }

  private recordFailure(id: string, latencyMs: number): void {
    const current = this.health.get(id) ?? { successes: 0, failures: 0, consecutiveFailures: 0, latencyMs: 0 };
    current.failures += 1;
    current.consecutiveFailures += 1;
    current.lastFailureAt = Date.now();
    current.latencyMs = current.latencyMs === 0 ? latencyMs : Math.round(current.latencyMs * 0.7 + latencyMs * 0.3);
    this.health.set(id, current);
  }
}
