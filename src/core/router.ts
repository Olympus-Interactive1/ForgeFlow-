import type { ModelRequest, ModelResponse, Provider, ProviderContext, RouteMode } from './types.js';

export interface RouterOptions {
  providers: Provider[];
  freeProviders?: string[];
  qualityProviders?: string[];
  contextFor?: (provider: Provider) => ProviderContext;
}

export class ModelRouter {
  private readonly providers: Provider[];
  private readonly freeProviders: Set<string>;
  private readonly qualityProviders: Set<string>;
  private readonly contextFor: (provider: Provider) => ProviderContext;

  constructor(options: RouterOptions) {
    this.providers = options.providers;
    this.freeProviders = new Set(options.freeProviders ?? []);
    this.qualityProviders = new Set(options.qualityProviders ?? []);
    this.contextFor = options.contextFor ?? (() => ({}));
  }

  async route(request: ModelRequest): Promise<ModelResponse> {
    const mode: RouteMode = request.mode ?? 'auto';
    const candidates = this.select(request, mode);
    if (candidates.length === 0) throw new Error(`No provider supports capability: ${request.capability}`);
    let lastError: unknown;
    for (const provider of candidates) {
      try { return await provider.execute(request, this.contextFor(provider)); }
      catch (error) { lastError = error; if (mode !== 'fallback' && mode !== 'auto') throw error; }
    }
    throw new Error(`All candidate providers failed: ${String(lastError)}`);
  }

  private select(request: ModelRequest, mode: RouteMode): Provider[] {
    let candidates = this.providers.filter(p => p.capabilities.includes(request.capability));
    if (request.provider) candidates = candidates.filter(p => p.id === request.provider);
    if (mode === 'free-first') candidates.sort((a, b) => Number(this.freeProviders.has(b.id)) - Number(this.freeProviders.has(a.id)));
    if (mode === 'quality') candidates.sort((a, b) => Number(this.qualityProviders.has(b.id)) - Number(this.qualityProviders.has(a.id)));
    return candidates;
  }
}
