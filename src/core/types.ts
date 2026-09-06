export type RouteMode = 'auto' | 'free-first' | 'quality' | 'fallback';
export type Capability = 'text' | 'image' | 'video' | 'audio' | 'stt' | 'tts' | 'embedding';

export interface ModelRequest {
  capability: Capability;
  model?: string;
  prompt?: string;
  input?: unknown;
  mode?: RouteMode;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface ModelResponse<T = unknown> {
  output: T;
  provider: string;
  model?: string;
  usage?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface ProviderContext {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  freeOnly?: boolean;
}

export interface Provider {
  readonly id: string;
  /** Provider-level flag used by ForgeFlow's hard free-only policy. */
  readonly free: boolean;
  readonly capabilities: readonly Capability[];
  /** Optional operation-level filter for providers that expose only part of a capability. */
  supports?(request: ModelRequest): boolean;
  listModels?(): Promise<string[]>;
  execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse>;
}
