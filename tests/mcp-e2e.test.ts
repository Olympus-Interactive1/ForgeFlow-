import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const clients: Client[] = [];
const transports: StdioClientTransport[] = [];

async function connectClient() {
  const client = new Client({ name: 'forgeflow-e2e-test', version: '0.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['node_modules/tsx/dist/cli.mjs', 'src/index.ts'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORGEFLOW_FREE_ONLY: 'true',
      FORGEFLOW_PROVIDER_TIMEOUT_MS: '2000',
      FORGEFLOW_FREE_PROVIDERS: 'mock',
    },
  });
  await client.connect(transport);
  clients.push(client);
  transports.push(transport);
  return client;
}

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map(client => client.close()));
  await Promise.allSettled(transports.splice(0).map(transport => transport.close()));
});

describe('MCP protocol end-to-end', () => {
  it('discovers the public ForgeFlow tool surface', async () => {
    const client = await connectClient();
    const result = await client.listTools();
    const names = result.tools.map(tool => tool.name);

    expect(names).toContain('forgeflow_route');
    expect(names).toContain('forgeflow_discover');
    expect(names).toContain('forgeflow_media_pipeline');
    expect(names).toContain('forgeflow_full_media');
  });

  it('invokes forgeflow_route through the MCP wire protocol', async () => {
    const client = await connectClient();
    const result = await client.callTool({
      name: 'forgeflow_route',
      arguments: {
        capability: 'text',
        provider: 'mock',
        prompt: 'MCP E2E smoke test',
      },
    });

    expect(result.isError).not.toBe(true);
    const text = result.content.find(part => part.type === 'text');
    expect(text?.type).toBe('text');
    expect(JSON.parse(text!.text)).toMatchObject({
      provider: 'mock',
      output: { ok: true, capability: 'text', prompt: 'MCP E2E smoke test' },
    });
  });
});
