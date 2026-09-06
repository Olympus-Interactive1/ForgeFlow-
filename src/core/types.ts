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
}

export interface Provider {
  readonly id: string;
  readonly capabilities: readonly Capability[];
  listModels?(): Promise<string[]>;
  execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse>;
}
