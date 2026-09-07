import type { MediaAsset } from './media-asset.js';
import { assertMediaAsset } from './media-asset.js';
import type { MediaOperation, ModelRequest, ModelResponse } from './types.js';
import type { ModelRouter } from './router.js';

export interface PipelineStep {
  operation: MediaOperation;
  capability: ModelRequest['capability'];
  prompt?: string;
  model?: string;
  input?: unknown;
  metadata?: Record<string, unknown>;
}

export interface AssetPipelineStep extends PipelineStep {
  inputFromPrevious?: boolean;
}

const operationCapabilities: Record<MediaOperation, ModelRequest['capability']> = {
  text_generate: 'text',
  image_generate: 'image',
  image_edit: 'image',
  image_analyze: 'image',
  image_upscale: 'image',
  video_generate: 'video',
  video_image_to_video: 'video',
  video_extend: 'video',
  video_analyze: 'video',
  audio_generate: 'audio',
  tts: 'tts',
  stt: 'stt',
};

export const MAX_PIPELINE_STEPS = 32;

export class MediaPipeline {
  constructor(private readonly router: ModelRouter) {}

  async run(step: PipelineStep): Promise<ModelResponse> {
    MediaPipeline.validateStep(step);
    return this.router.route({
      capability: step.capability,
      model: step.model,
      prompt: step.prompt,
      input: step.input,
      mode: 'auto',
      metadata: { ...step.metadata, operation: step.operation },
    });
  }

  async runAssetChain(steps: AssetPipelineStep[]): Promise<ModelResponse[]> {
    if (steps.length === 0) throw new Error('Media pipeline must contain at least one step');
    if (steps.length > MAX_PIPELINE_STEPS) {
      throw new Error(`Media pipeline cannot contain more than ${MAX_PIPELINE_STEPS} steps`);
    }

    const results: ModelResponse[] = [];
    let previousAsset: MediaAsset | undefined;

    for (const step of steps) {
      const input = step.inputFromPrevious
        ? MediaPipeline.assetInput(previousAsset)
        : step.input;
      const result = await this.run({ ...step, input });
      if (result.asset) {
        previousAsset = MediaPipeline.requireAsset(result);
      }
      results.push(result);
    }

    return results;
  }

  static validateStep(step: PipelineStep): void {
    const requiredCapability = operationCapabilities[step.operation];
    if (!requiredCapability) throw new Error(`Unsupported pipeline operation: ${String(step.operation)}`);
    if (requiredCapability !== step.capability) {
      throw new Error(`Pipeline operation ${step.operation} requires ${requiredCapability} capability`);
    }
  }

  static requireAsset(response: ModelResponse): MediaAsset {
    if (!response.asset) throw new Error(`Operation ${String(response.metadata?.operation ?? 'media')} did not return a media asset`);
    assertMediaAsset(response.asset);
    return response.asset;
  }

  static assetInput(asset?: MediaAsset): string {
    if (!asset) throw new Error('Cannot chain media operation without a previous media asset');
    if (asset.data) return `data:${asset.mimeType};base64,${asset.data}`;
    if (asset.url) return asset.url;
    throw new Error('Media asset has neither data nor url');
  }
}
