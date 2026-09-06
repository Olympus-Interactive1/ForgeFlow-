import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const url = new URL(process.env.FORGEFLOW_URL ?? 'http://localhost:8787/mcp');
const headers = process.env.FORGEFLOW_API_KEY ? { Authorization: `Bearer ${process.env.FORGEFLOW_API_KEY}` } : undefined;
const client = new Client({ name: 'forgeflow-example-client', version: '0.1.0' });
await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }));

const result = await client.callTool({ name: 'forgeflow_route', arguments: { capability: 'text', prompt: 'Say hello from ForgeFlow.' } });
console.log(JSON.stringify(result, null, 2));
await client.close();
