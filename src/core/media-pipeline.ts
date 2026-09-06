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

export class MediaPipeline {
  constructor(private readonly router: ModelRouter) {}

  async run(step: PipelineStep): Promise<ModelResponse> {
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
