# ForgeFlow

Universal, provider-agnostic MCP server and AI media orchestration layer.

ForgeFlow is designed around the Model Context Protocol rather than a specific AI host. OpenCode can use it, but OpenCode is not a dependency. The same server can be integrated with other MCP-compatible hosts or a custom client.

## Stack

- Node.js 20+
- TypeScript / ESM
- MCP TypeScript SDK v2 (`@modelcontextprotocol/server`)
- Zod 4
- Vitest

## Architecture

```text
MCP Host / Client
       |
       v
MCP Core (tools / resources / prompts)
       |
       v
Model Router
(auto / free-first / quality / fallback)
       |
       v
Provider Registry
       |
       +--> Google
       +--> OpenRouter
       +--> NVIDIA
       +--> fal.ai
       +--> Local
       +--> Future providers
```

Media capabilities are modeled independently from providers:

- Image: generate, edit, analyze, upscale
- Video: generate, image-to-video, extend, analyze
- Audio: generation, TTS, STT
- Workflows: ad creation, social video, full media

## Repository layout

```text
src/
  core/          provider contracts, registry, routing
  media/         image/video/audio/STT/TTS contracts
  providers/     provider adapters
  workflows/     composable media workflows
  index.ts       MCP stdio entrypoint

tests/           automated tests
docs/            architecture and integrations
.github/         CI and contribution templates
```

## Quick start

```bash
npm install
npm run build
npm start
```

For development:

```bash
npm run dev
```

The current server exposes a minimal `forgeflow_route` MCP tool and a reference mock provider. Real provider adapters are intentionally separated from the core and will be added incrementally.

## Configuration

Copy `.env.example` to `.env` and configure only the provider credentials you need. Never commit `.env` or API keys.

## Generic MCP configuration

A host that supports local stdio MCP servers can launch ForgeFlow with a command equivalent to:

```json
{
  "mcpServers": {
    "forgeflow": {
      "command": "npx",
      "args": ["forgeflow-mcp"]
    }
  }
}
```

Host configuration formats vary. See `docs/INTEGRATIONS.md` for integration rules and the OpenCode example.

## Development quality gates

```bash
npm run lint
npm test
npm run build
```

GitHub Actions runs these checks on Node 20, 22, and 24.

## Roadmap

- [x] MCP v2 server foundation
- [x] Provider abstraction and registry
- [x] Routing modes
- [x] Media/workflow interfaces
- [x] CI and repository governance
- [ ] Google adapter
- [ ] OpenRouter adapter
- [ ] NVIDIA adapter
- [ ] fal.ai adapter
- [ ] Local provider adapter
- [ ] Streamable HTTP deployment
- [ ] Authentication and authorization layer
- [ ] Persistent routing/cost telemetry
- [ ] NPM release automation
- [ ] Full integration test suite

## License

MIT. See [LICENSE](LICENSE).
