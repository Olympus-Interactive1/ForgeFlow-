import type { ModelRequest, ModelResponse, Provider, ProviderContext, RouteMode } from './types.js';

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

export class ModelRouter {
  private readonly providers: Provider[];
  private readonly freeProviders: Set<string>;
  private readonly qualityProviders: Set<string>;
  private readonly contextFor: (provider: Provider) => ProviderContext;
  private readonly freeOnly: boolean;
  private readonly health = new Map<string, ProviderHealth>();
  private readonly unhealthyCooldownMs = 30_000;

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
    const candidates = this.select(request, mode);
    if (candidates.length === 0) {
      const policy = this.freeOnly ? 'free-only policy' : 'provider policy';
      throw new Error(`No free provider/model supports capability/operation: ${request.capability} (${policy})`);
    }
    let lastError: unknown;

    for (const provider of candidates) {
      const started = Date.now();
      try {
        const result = await provider.execute(request, { ...this.contextFor(provider), freeOnly: this.freeOnly });
        this.recordSuccess(provider.id, Date.now() - started);
        return result;
      } catch (error) {
        this.recordFailure(provider.id, Date.now() - started);
        lastError = error;
        if (request.provider || (mode !== 'fallback' && mode !== 'auto' && mode !== 'free-first')) throw error;
      }
    }
    throw new Error(`All free candidate providers failed: ${String(lastError)}`);
  }

  getHealth(): Record<string, ProviderHealth> {
    return Object.fromEntries([...this.health.entries()].map(([id, value]) => [id, { ...value }]));
  }

  isFreeOnly(): boolean { return this.freeOnly; }

  resetHealth(providerId?: string): void {
    if (providerId) this.health.set(providerId, { successes: 0, failures: 0, consecutiveFailures: 0, latencyMs: 0 });
    else for (const provider of this.providers) this.health.set(provider.id, { successes: 0, failures: 0, consecutiveFailures: 0, latencyMs: 0 });
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

  private select(request: ModelRequest, mode: RouteMode): Provider[] {
    let candidates = this.providers.filter(p =>
      (!this.freeOnly || p.free) &&
      p.capabilities.includes(request.capability) &&
      (p.supports?.(request) ?? true)
    );
    if (request.provider) candidates = candidates.filter(p => p.id === request.provider);
    const now = Date.now();
    candidates.sort((a, b) => {
      const ah = this.health.get(a.id)!;
      const bh = this.health.get(b.id)!;
      const aCooling = ah.lastFailureAt !== undefined && now - ah.lastFailureAt < this.unhealthyCooldownMs && ah.consecutiveFailures >= 2;
      const bCooling = bh.lastFailureAt !== undefined && now - bh.lastFailureAt < this.unhealthyCooldownMs && bh.consecutiveFailures >= 2;
      if (aCooling !== bCooling) return Number(aCooling) - Number(bCooling);
      if (mode === 'free-first') return Number(this.freeProviders.has(b.id)) - Number(this.freeProviders.has(a.id));
      if (mode === 'quality') return Number(this.qualityProviders.has(b.id)) - Number(this.qualityProviders.has(a.id));
      return ah.consecutiveFailures - bh.consecutiveFailures || ah.latencyMs - bh.latencyMs;
    });
    return candidates;
  }
}
