import type { MediaAsset } from './media-asset.js';

export type RouteMode = 'auto' | 'free-first' | 'quality' | 'fallback';
export type Capability = 'text' | 'image' | 'video' | 'audio' | 'stt' | 'tts' | 'embedding';
export type ModelEligibility = 'free' | 'paid' | 'unknown';

export type MediaOperation =
  | 'text_generate'
  | 'image_generate' | 'image_edit' | 'image_analyze' | 'image_upscale'
  | 'video_generate' | 'video_image_to_video' | 'video_extend' | 'video_analyze'
  | 'audio_generate' | 'tts' | 'stt';

export interface DiscoveredModel {
  id: string;
  capabilities: readonly Capability[];
  /** Conservative model-level free flag. In free-only mode, only true is eligible. */
  free: boolean;
  /** Optional richer eligibility classification for providers with incomplete pricing metadata. */
  eligibility?: ModelEligibility;
  eligibilityReason?: string;
  quality?: number;
  metadata?: Record<string, unknown>;
}

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
  /** Canonical media representation for image/video/audio responses. */
  asset?: MediaAsset;
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
  /** Provider-level flag retained for backwards compatibility; model-level free status wins when discovered. */
  readonly free: boolean;
  readonly capabilities: readonly Capability[];
  supports?(request: ModelRequest): boolean;
  listModels?(): Promise<string[]>;
  discoverModels?(context?: ProviderContext): Promise<DiscoveredModel[]>;
  execute(request: ModelRequest, context: ProviderContext): Promise<ModelResponse>;
}
