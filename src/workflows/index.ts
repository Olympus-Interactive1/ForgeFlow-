import type { ModelRouter } from '../core/router.js';
import type { ModelResponse } from '../core/types.js';

export interface CreateAdInput { brief: string; imageModel?: string; copyModel?: string; }
export interface SocialVideoInput { brief: string; durationSeconds?: number; }
export interface FullMediaInput { brief: string; outputs: Array<'image' | 'video' | 'audio' | 'tts'>; }

export class WorkflowEngine {
  constructor(private readonly router: ModelRouter) {}

  async createAd(input: CreateAdInput): Promise<ModelResponse[]> {
    const results: ModelResponse[] = [];
    results.push(await this.router.route({ capability: 'image', prompt: input.brief, model: input.imageModel }));
    results.push(await this.router.route({ capability: 'text', prompt: input.brief, model: input.copyModel }));
    return results;
  }

  async socialVideo(input: SocialVideoInput): Promise<ModelResponse> {
    return this.router.route({ capability: 'video', prompt: `${input.brief}\nDuration: ${input.durationSeconds ?? 15}s` });
  }

  async fullMedia(input: FullMediaInput): Promise<ModelResponse[]> {
    return Promise.all(input.outputs.map(capability => this.router.route({ capability, prompt: input.brief })));
  }
}
