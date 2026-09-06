#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { ModelRouter } from './core/router.js';
import { ProviderRegistry } from './core/provider-registry.js';
import { discoverProviders } from './core/discovery.js';
import { falProvider, googleProvider, mockProvider, nvidiaProvider, openRouterProvider } from './providers/index.js';
import { WorkflowEngine } from './workflows/index.js';
import type { Capability } from './core/types.js';

const VERSION = '0.6.0';
const registry = new ProviderRegistry().register(openRouterProvider).register(googleProvider).register(nvidiaProvider).register(falProvider).register(mockProvider);
const env = process.env;
const freeOnly = env.FORGEFLOW_FREE_ONLY !== 'false';
const router = new ModelRouter({
  providers: registry.all(),
  freeOnly,
  freeProviders: (env.FORGEFLOW_FREE_PROVIDERS ?? 'openrouter,google,nvidia').split(',').map(s => s.trim()).filter(Boolean),
  qualityProviders: (env.FORGEFLOW_QUALITY_PROVIDERS ?? 'google,nvidia,openrouter').split(',').map(s => s.trim()).filter(Boolean),
  contextFor: provider => ({
    apiKey: ({ openrouter: env.OPENROUTER_API_KEY, google: env.GOOGLE_API_KEY, nvidia: env.NVIDIA_API_KEY, fal: env.FAL_KEY } as Record<string, string | undefined>)[provider.id],
    baseUrl: ({ openrouter: env.OPENROUTER_BASE_URL, google: env.GOOGLE_BASE_URL, nvidia: env.NVIDIA_BASE_URL, fal: env.FAL_BASE_URL } as Record<string, string | undefined>)[provider.id],
    timeoutMs: Number(env.FORGEFLOW_PROVIDER_TIMEOUT_MS ?? 60000),
    freeOnly
  })
});
const workflows = new WorkflowEngine(router);

export function getForgeFlowHealth() {
  return { status: 'ok', service: 'forgeflow-mcp', version: VERSION, freeOnly: router.isFreeOnly(), providers: router.getHealth() };
}

async function routeTool(capability: Capability, args: { prompt?: string; input?: unknown; model?: string; provider?: string; mode?: 'auto' | 'free-first' | 'quality' | 'fallback'; metadata?: Record<string, unknown> }) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(await router.route({ capability, ...args })) }] };
}

export function createForgeFlowServer() {
  const server = new McpServer({ name: 'forgeflow-mcp', version: VERSION });
  const common = {
    prompt: z.string().optional(), input: z.unknown().optional(), model: z.string().optional(), provider: z.string().optional(),
    mode: z.enum(['auto', 'free-first', 'quality', 'fallback']).optional(), metadata: z.record(z.string(), z.unknown()).optional()
  };
  const mediaCommon = { ...common, metadata: z.record(z.string(), z.unknown()).optional() };

  server.registerTool('forgeflow_discover', { description: 'Discover currently available free provider models and capabilities. Paid providers are hidden by the default free-only policy.', inputSchema: z.object({}) }, async () => ({ content: [{ type: 'text' as const, text: JSON.stringify(await discoverProviders(registry.all(), freeOnly)) }] }));
  server.registerTool('forgeflow_route', { description: 'Route a supported request through ForgeFlow. v0.6.0 uses free providers/models only by default.', inputSchema: { capability: z.enum(['text', 'image', 'video', 'audio', 'stt', 'tts', 'embedding']), ...common } }, async args => routeTool(args.capability, args));
  server.registerTool('forgeflow_image_generate', { description: 'Generate an image with a free-capable provider. Fails clearly if no free image generator is configured.', inputSchema: common }, args => routeTool('image', { ...args, metadata: { ...args.metadata, operation: 'image_generate' } }));
  server.registerTool('forgeflow_image_edit', { description: 'Edit an image with a free-capable provider.', inputSchema: common }, args => routeTool('image', { ...args, metadata: { ...args.metadata, operation: 'image_edit' } }));
  server.registerTool('forgeflow_image_analyze', { description: 'Analyze an image using a free vision-capable provider.', inputSchema: common }, args => routeTool('image', { ...args, prompt: args.prompt ?? 'Analyze the supplied image.', metadata: { ...args.metadata, operation: 'image_analyze' } }));
  server.registerTool('forgeflow_image_upscale', { description: 'Upscale an image using a free-capable provider.', inputSchema: common }, args => routeTool('image', { ...args, prompt: args.prompt ?? 'Upscale the supplied image.', metadata: { ...args.metadata, operation: 'image_upscale' } }));
  server.registerTool('forgeflow_video_generate', { description: 'Generate a video with a free-capable provider such as NVIDIA Cosmos3 Nano.', inputSchema: mediaCommon }, args => routeTool('video', { ...args, metadata: { ...args.metadata, operation: 'video_generate' } }));
  server.registerTool('forgeflow_video_image_to_video', { description: 'Generate video from an image with a free-capable provider such as NVIDIA Cosmos3 Nano.', inputSchema: mediaCommon }, args => routeTool('video', { ...args, metadata: { ...args.metadata, operation: 'video_image_to_video' } }));
  server.registerTool('forgeflow_video_extend', { description: 'Extend a video with a free-capable provider. Fails closed when no free extender exists.', inputSchema: common }, args => routeTool('video', { ...args, metadata: { ...args.metadata, operation: 'video_extend' } }));
  server.registerTool('forgeflow_video_analyze', { description: 'Analyze a video using a free vision-capable provider.', inputSchema: common }, args => routeTool('video', { ...args, metadata: { ...args.metadata, operation: 'video_analyze' } }));
  server.registerTool('forgeflow_audio_tts', { description: 'Convert text to speech using a free-capable provider such as NVIDIA Magpie when its endpoint is configured.', inputSchema: common }, args => routeTool('tts', { ...args, metadata: { ...args.metadata, operation: 'tts' } }));
  server.registerTool('forgeflow_audio_stt', { description: 'Transcribe speech using a free-capable provider. Fails closed when no free hosted ASR is configured.', inputSchema: common }, args => routeTool('stt', { ...args, metadata: { ...args.metadata, operation: 'stt' } }));
  server.registerTool('forgeflow_audio_generate', { description: 'Generate music or sound effects with a free-capable provider. Fails closed when none is configured.', inputSchema: common }, args => routeTool('audio', { ...args, metadata: { ...args.metadata, operation: 'audio_generate' } }));

  server.registerTool('forgeflow_create_ad', { description: 'Run an image + copy advertising workflow using free-capable providers only.', inputSchema: { brief: z.string(), imageModel: z.string().optional(), copyModel: z.string().optional() } }, async args => ({ content: [{ type: 'text', text: JSON.stringify(await workflows.createAd(args)) }] }));
  server.registerTool('forgeflow_social_video', { description: 'Run a social video workflow using free-capable providers only.', inputSchema: { brief: z.string(), durationSeconds: z.number().positive().max(600).optional() } }, async args => ({ content: [{ type: 'text', text: JSON.stringify(await workflows.socialVideo(args)) }] }));
  server.registerTool('forgeflow_full_media', { description: 'Run multiple media capabilities in parallel using free-capable providers only.', inputSchema: { brief: z.string(), outputs: z.array(z.enum(['image', 'video', 'audio', 'tts'])).min(1) } }, async args => ({ content: [{ type: 'text', text: JSON.stringify(await workflows.fullMedia(args)) }] }));

  server.registerResource('providers', 'forgeflow://providers', { title: 'ForgeFlow Providers', mimeType: 'application/json' }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(registry.all().map(p => ({ id: p.id, free: p.free, enabledByPolicy: !freeOnly || p.free, capabilities: p.capabilities }))) }] }));
  return server;
}

if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) await serveStdio(() => createForgeFlowServer());
