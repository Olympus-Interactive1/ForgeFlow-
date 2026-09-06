#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { ModelRouter } from './core/router.js';
import { ProviderRegistry } from './core/provider-registry.js';
import { mockProvider } from './providers/mock.js';

const registry = new ProviderRegistry().register(mockProvider);
const router = new ModelRouter({ providers: registry.all(), freeProviders: ['mock'] });

function createServer(): McpServer {
  const server = new McpServer({ name: 'forgeflow-mcp', version: '0.1.0' });
  server.registerTool('forgeflow_route', {
    description: 'Route a model or media request through ForgeFlow providers.',
    inputSchema: z.object({
      capability: z.enum(['text', 'image', 'video', 'audio', 'stt', 'tts', 'embedding']),
      prompt: z.string().optional(),
      input: z.unknown().optional(),
      model: z.string().optional(),
      provider: z.string().optional(),
      mode: z.enum(['auto', 'free-first', 'quality', 'fallback']).optional()
    })
  }, async args => {
    try {
      const result = await router.route(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: String(error) }] };
    }
  });
  return server;
}

void serveStdio(createServer);
console.error('ForgeFlow MCP server running on stdio');
