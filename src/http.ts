#!/usr/bin/env node
import { createServer } from 'node:http';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { createForgeFlowServer } from './index.js';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';
const apiKey = process.env.FORGEFLOW_API_KEY;
const endpoint = process.env.FORGEFLOW_MCP_PATH ?? '/mcp';

const httpServer = createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'forgeflow-mcp', version: '0.2.0' }));
    return;
  }
  if (req.url !== endpoint) { res.writeHead(404); res.end('Not Found'); return; }
  if (apiKey && req.headers.authorization !== `Bearer ${apiKey}`) {
    res.writeHead(401, { 'content-type': 'application/json', 'www-authenticate': 'Bearer' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createForgeFlowServer();
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

httpServer.listen(port, host, () => console.error(`ForgeFlow MCP listening on http://${host}:${port}${endpoint}`));
