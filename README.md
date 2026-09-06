# ForgeFlow MCP

Universal, provider-agnostic MCP server and AI media orchestration layer.

ForgeFlow is **not tied to OpenCode**. Any MCP-compatible host can connect through stdio or remote Streamable HTTP.

## v0.4.0 hardening

v0.4.0 strengthens provider routing with operation-aware capability filtering, deterministic explicit-provider behavior, fallback isolation, and expanded release-contract tests. Provider adapters remain replaceable and MCP tool contracts remain provider-agnostic.

## What is included

- MCP SDK v2 server
- Stdio transport
- Stateless Streamable HTTP transport
- Optional Bearer API-key authentication
- Request body-size protection and in-memory rate limiting
- Provider registry and health-aware model router
- Operation-aware provider support filtering
- `auto`, `free-first`, `quality`, and `fallback` routing modes
- Retry/backoff for transient provider failures
- OpenRouter adapter
- Google adapter
- NVIDIA NIM adapter
- fal.ai media adapter with operation-specific models and queue polling/result retrieval
- Local/mock provider for development
- Dedicated image, video, audio, STT and TTS MCP tools
- Composable ad, social-video and full-media workflows
- Generic MCP client example
- OpenCode remote MCP example
- Docker and Docker Compose deployment
- GitHub Actions CI with Node 20/22/24 and Docker smoke testing
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
                    │ + Health     │
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

### HTTP hardening

- Optional Bearer API-key authentication
- Configurable per-key/IP rate limit
- Configurable maximum request body size (`FORGEFLOW_MAX_BODY_BYTES`)
- No provider credentials in tool schemas
- Generic internal errors are not returned to remote clients
- Graceful SIGINT/SIGTERM shutdown

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
| fal.ai | `FAL_KEY` | image, video, audio, TTS, STT |
| Mock | none | development |

Provider adapters intentionally remain behind a common interface so additional providers can be added without changing MCP tool contracts.

## fal.ai media operations

When `fal` is selected, ForgeFlow maps each dedicated media tool to an operation-specific model by default:

| Tool | Default fal.ai model |
|---|---|
| `forgeflow_image_generate` | `fal-ai/z-image/base` |
| `forgeflow_image_edit` | `fal-ai/playground-v25/image-to-image` |
| `forgeflow_image_upscale` | `fal-ai/esrgan` |
| `forgeflow_video_generate` | `fal-ai/ltx-2.3/text-to-video` |
| `forgeflow_video_image_to_video` | `fal-ai/ltx-2.3/image-to-video` |
| `forgeflow_video_extend` | `fal-ai/ltx-2.3/extend-video` |
| `forgeflow_audio_generate` | `fal-ai/stable-audio-25/text-to-audio` |
| `forgeflow_audio_tts` | `fal-ai/chatterbox/text-to-speech` |
| `forgeflow_audio_stt` | `fal-ai/speech-to-text` |

You can override the model per request with the `model` argument. For asynchronous operation, set `metadata.waitForResult` to `false`; otherwise ForgeFlow polls the queue and returns a normalized result containing the request ID and media URL when available.

Input files should be supplied as provider-compatible public URLs or data URIs. ForgeFlow does not expose provider API keys to MCP clients.

Analyze tools are intentionally not mapped to fal.ai generation endpoints. A provider must explicitly advertise support for the requested operation before the router can select it.

## MCP tools

### Routing

- `forgeflow_route`

### Image

- `forgeflow_image_generate`
- `forgeflow_image_edit`
- `forgeflow_image_analyze`
- `forgeflow_image_upscale`

### Video

- `forgeflow_video_generate`
- `forgeflow_video_image_to_video`
- `forgeflow_video_extend`
- `forgeflow_video_analyze`

### Audio

- `forgeflow_audio_tts`
- `forgeflow_audio_stt`
- `forgeflow_audio_generate`

### Workflows

- `forgeflow_create_ad`
- `forgeflow_social_video`
- `forgeflow_full_media`

Provider/model support is capability- and operation-dependent; a tool being present does not imply every provider implements every operation.

## Provider routing and health

`auto` and `fallback` can move to another compatible provider after an execution failure. `free-first` prioritizes providers configured in `FORGEFLOW_FREE_PROVIDERS`; `quality` prioritizes `FORGEFLOW_QUALITY_PROVIDERS`.

ForgeFlow tracks success/failure counts, consecutive failures and rolling latency per provider. Providers with repeated recent failures are temporarily deprioritized. Health is exposed by `/health` without exposing API keys.

## OpenCode

See [`examples/opencode.jsonc`](examples/opencode.jsonc).

OpenCode can connect to ForgeFlow as a remote MCP server using the Streamable HTTP endpoint and an Authorization header.

## Generic MCP client

See [`examples/mcp-client.ts`](examples/mcp-client.ts). It uses the official MCP client SDK's Streamable HTTP transport.

## Docker

```bash
docker compose up --build -d
```

The image runs as the non-root `node` user and includes a container health check against `/health`.

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

CI validates all three supported Node major versions (20, 22 and 24) and performs a Docker build + health smoke test.

## Security

See [`SECURITY.md`](SECURITY.md). API keys are read from environment variables and are never part of the MCP tool schema. Review the production deployment guidance before exposing the HTTP endpoint to the public internet.

## License

MIT. See [`LICENSE`](LICENSE).
