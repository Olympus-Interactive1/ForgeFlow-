#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { ModelRouter } from './core/router.js';
import { ProviderRegistry } from './core/provider-registry.js';
import { falProvider, googleProvider, mockProvider, nvidiaProvider, openRouterProvider } from './providers/index.js';

const registry = new ProviderRegistry()
  .register(openRouterProvider)
  .register(googleProvider)
  .register(nvidiaProvider)
  .register(falProvider)
  .register(mockProvider);

const env = process.env;
const router = new ModelRouter({
  providers: registry.all(),
  freeProviders: (env.FORGEFLOW_FREE_PROVIDERS ?? 'mock').split(',').map(s => s.trim()).filter(Boolean),
  qualityProviders: (env.FORGEFLOW_QUALITY_PROVIDERS ?? 'google,openrouter,nvidia').split(',').map(s => s.trim()).filter(Boolean),
  contextFor: provider => ({
    apiKey: ({ openrouter: env.OPENROUTER_API_KEY, google: env.GOOGLE_API_KEY, nvidia: env.NVIDIA_API_KEY, fal: env.FAL_KEY } as Record<string, string | undefined>)[provider.id],
    baseUrl: ({ openrouter: env.OPENROUTER_BASE_URL, google: env.GOOGLE_BASE_URL, nvidia: env.NVIDIA_BASE_URL, fal: env.FAL_BASE_URL } as Record<string, string | undefined>)[provider.id],
    timeoutMs: Number(env.FORGEFLOW_PROVIDER_TIMEOUT_MS ?? 60000)
  })
});

export function createForgeFlowServer() {
  const server = new McpServer({ name: 'forgeflow-mcp', version: '0.2.0' });
  server.registerTool('forgeflow_route', {
    description: 'Route a text or media request through ForgeFlow providers.',
    inputSchema: {
      capability: z.enum(['text', 'image', 'video', 'audio', 'stt', 'tts', 'embedding']),
      prompt: z.string().optional(), input: z.unknown().optional(), model: z.string().optional(), provider: z.string().optional(),
      mode: z.enum(['auto', 'free-first', 'quality', 'fallback']).optional()
    }
  }, async args => ({ content: [{ type: 'text', text: JSON.stringify(await router.route(args)) }] }));

  server.registerResource('forgeflow://providers', 'providers', async () => ({
    contents: [{ uri: 'forgeflow://providers', mimeType: 'application/json', text: JSON.stringify(registry.all().map(p => ({ id: p.id, capabilities: p.capabilities }))) }]
  }));
  return server;
}

if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) {
  await serveStdio(() => createForgeFlowServer());
}
