#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ModelRouter } from './core/router.js';
import { ProviderRegistry } from './core/provider-registry.js';
import { mockProvider } from './providers/mock.js';

const registry = new ProviderRegistry().register(mockProvider);
const router = new ModelRouter({ providers: registry.all(), freeProviders: ['mock'] });
const server = new McpServer({ name: 'forgeflow-mcp', version: '0.1.0' });

server.registerTool('forgeflow_route', {
  description: 'Route a model/media request through ForgeFlow providers.',
  inputSchema: {
    capability: z.enum(['text', 'image', 'video', 'audio', 'stt', 'tts', 'embedding']),
    prompt: z.string().optional(),
    input: z.unknown().optional(),
    model: z.string().optional(),
    provider: z.string().optional(),
    mode: z.enum(['auto', 'free-first', 'quality', 'fallback']).optional()
  }
}, async args => {
  const result = await router.route(args);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});

server.registerResource('forgeflow://providers', 'providers', async () => ({
  contents: [{ uri: 'forgeflow://providers', mimeType: 'application/json', text: JSON.stringify(registry.all().map(p => ({ id: p.id, capabilities: p.capabilities }))) }]
}));

await server.connect(new StdioServerTransport());
