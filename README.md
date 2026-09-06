# ForgeFlow MCP

Universal, provider-agnostic MCP server and AI media orchestration layer.

ForgeFlow is **not tied to OpenCode**. Any MCP-compatible host can connect through stdio or remote Streamable HTTP.

## What is included

- MCP SDK v2 server
- Stdio transport
- Stateless Streamable HTTP transport
- Optional Bearer API-key authentication
- Provider registry and model router
- `auto`, `free-first`, `quality`, and `fallback` routing modes
- OpenRouter adapter
- Google adapter
- NVIDIA NIM adapter
- fal.ai queue adapter
- Local/mock provider for development
- Dedicated image, video, audio, STT and TTS MCP tools
- Generic MCP client example
- OpenCode remote MCP example
- Docker and Docker Compose deployment
- GitHub Actions CI
- npm publish workflow
- TypeScript declarations

## Architecture

```text
MCP Host
  │
  ├── stdio ───────────────┐
  └── Streamable HTTP ─────┤
                           ▼
                    ForgeFlow MCP Core
                           │
                    ┌──────┴──────┐
                    │ Model Router │
                    └──────┬──────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         Providers      Media Tools   Workflows
             │
   ┌─────────┼──────────┬─────────┐
   ▼         ▼          ▼         ▼
OpenRouter Google     NVIDIA     fal.ai
```

## Install

```bash
npm install forgeflow-mcp
```

Or run directly from source:

```bash
npm install
npm run build
npm start
```

## Stdio

MCP hosts that launch local processes can execute:

```bash
npx forgeflow-mcp
```

## Streamable HTTP

```bash
cp .env.example .env
npm run dev:http
```

The MCP endpoint defaults to `http://localhost:8787/mcp` and the health endpoint is `/health`.

The HTTP server uses the MCP SDK's stateless Streamable HTTP transport. It creates a fresh MCP server/transport pair per request, which keeps the remote endpoint simple and horizontally deployable.

## Authentication

Set `FORGEFLOW_API_KEY` to require:

```http
Authorization: Bearer <key>
```

Do not commit `.env` or provider credentials.

## Provider configuration

Copy `.env.example` to `.env` and configure the providers you intend to use.

| Provider | Environment variable | Implemented capability |
|---|---|---|
| OpenRouter | `OPENROUTER_API_KEY` | text |
| Google | `GOOGLE_API_KEY` | text |
| NVIDIA | `NVIDIA_API_KEY` | text |
| fal.ai | `FAL_KEY` | image/video/audio queue submission |
| Mock | none | development |

Provider adapters intentionally remain behind a common interface so additional providers can be added without changing MCP tool contracts.

## MCP tools

- `forgeflow_route`
- `forgeflow_image_generate`
- `forgeflow_image_edit`
- `forgeflow_image_analyze`
- `forgeflow_image_upscale`
- `forgeflow_video_generate`
- `forgeflow_video_image_to_video`
- `forgeflow_video_extend`
- `forgeflow_video_analyze`
- `forgeflow_audio_tts`
- `forgeflow_audio_stt`
- `forgeflow_audio_generate`

Provider/model support is capability-dependent; a tool being present does not imply every provider implements every operation.

## OpenCode

See [`examples/opencode.jsonc`](examples/opencode.jsonc).

OpenCode can connect to ForgeFlow as a remote MCP server using the Streamable HTTP endpoint and an Authorization header.

## Generic MCP client

See [`examples/mcp-client.ts`](examples/mcp-client.ts). It uses the official MCP client SDK's Streamable HTTP transport.

## Docker

```bash
docker compose up --build -d
```

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

## Routing

`auto` chooses the normal provider order. `free-first` prioritizes providers configured in `FORGEFLOW_FREE_PROVIDERS`. `quality` prioritizes `FORGEFLOW_QUALITY_PROVIDERS`. `fallback` and `auto` continue to the next candidate when a provider fails.

## Security

See [`SECURITY.md`](SECURITY.md). API keys are read from environment variables and are never part of the MCP tool schema.

## License

MIT. See [`LICENSE`](LICENSE).
