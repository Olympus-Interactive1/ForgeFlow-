import type { ModelRouter } from '../core/router.js';
import type { MediaOperation, ModelResponse } from '../core/types.js';

export interface CreateAdInput { brief: string; imageModel?: string; copyModel?: string; }
export interface SocialVideoInput { brief: string; durationSeconds?: number; }
export interface FullMediaInput { brief: string; outputs: Array<'image' | 'video' | 'audio' | 'tts'>; }

const operationForCapability: Record<FullMediaInput['outputs'][number], MediaOperation> = {
  image: 'image_generate',
  video: 'video_generate',
  audio: 'audio_generate',
  tts: 'tts',
};

export class WorkflowEngine {
  constructor(private readonly router: ModelRouter) {}

  async createAd(input: CreateAdInput): Promise<ModelResponse[]> {
    const [image, copy] = await Promise.all([
      this.router.route({
        capability: 'image',
        prompt: input.brief,
        model: input.imageModel,
        mode: 'auto',
        metadata: { operation: 'image_generate' },
      }),
      this.router.route({
        capability: 'text',
        prompt: input.brief,
        model: input.copyModel,
        mode: 'auto',
        metadata: { operation: 'text_generate' },
      }),
    ]);
    return [image, copy];
  }

  async socialVideo(input: SocialVideoInput): Promise<ModelResponse> {
    return this.router.route({
      capability: 'video',
      prompt: `${input.brief}\nDuration: ${input.durationSeconds ?? 15}s`,
      mode: 'auto',
      metadata: { operation: 'video_generate' },
    });
  }

  async fullMedia(input: FullMediaInput): Promise<ModelResponse[]> {
    return Promise.all(input.outputs.map(capability => this.router.route({
      capability,
      prompt: input.brief,
      mode: 'auto',
      metadata: { operation: operationForCapability[capability] },
    })));
  }
}
