#!/usr/bin/env node
import { createServer } from 'node:http';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { createForgeFlowServer, getForgeFlowHealth } from './index.js';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';
const apiKey = process.env.FORGEFLOW_API_KEY;
const endpoint = process.env.FORGEFLOW_MCP_PATH ?? '/mcp';
const rateLimit = Number(process.env.FORGEFLOW_RATE_LIMIT ?? 60);
const rateWindowMs = Number(process.env.FORGEFLOW_RATE_WINDOW_MS ?? 60_000);
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: import('node:http').IncomingMessage): string {
  return apiKey ? (req.headers.authorization ?? 'anonymous') : (req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown');
}

function rateLimited(key: string): boolean {
  if (rateLimit <= 0) return false;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rateWindowMs });
    return false;
  }
  current.count += 1;
  return current.count > rateLimit;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, Math.max(rateWindowMs, 10_000)).unref();

const httpServer = createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(getForgeFlowHealth()));
    return;
  }
  if (req.url !== endpoint) { res.writeHead(404); res.end('Not Found'); return; }
  if (apiKey && req.headers.authorization !== `Bearer ${apiKey}`) {
    res.writeHead(401, { 'content-type': 'application/json', 'www-authenticate': 'Bearer' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  const key = clientKey(req);
  if (rateLimited(key)) {
    res.writeHead(429, { 'content-type': 'application/json', 'retry-after': String(Math.ceil(rateWindowMs / 1000)) });
    res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
    return;
  }
  try {
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createForgeFlowServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    if (!res.writableEnded) res.end(JSON.stringify({ error: String(error) }));
  }
});

httpServer.listen(port, host, () => console.error(`ForgeFlow MCP listening on http://${host}:${port}${endpoint}`));
