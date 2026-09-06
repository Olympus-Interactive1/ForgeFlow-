# ForgeFlow MCP

Universal, provider-agnostic MCP server and AI orchestration layer.

ForgeFlow is **not tied to OpenCode**. Any MCP-compatible host can use it through stdio or remote Streamable HTTP.

## v0.5.0 — Free-only routing

v0.5.0 changes the runtime policy around a simple rule:

> **ForgeFlow uses free providers/models only by default. It never silently falls back to a paid model.**

Every user supplies their **own provider API keys**. ForgeFlow does not ship a shared inference key and does not bill users for provider usage.

The router is provider-agnostic: MCP tools do not require callers to know which model is behind them. Providers can choose an eligible free model or free endpoint for the requested capability. Provider availability and free-tier limits can change over time.

## What is included

- MCP SDK v2 server
- Stdio transport
- Stateless Streamable HTTP transport
- Optional Bearer API-key authentication for remote ForgeFlow servers
- Provider registry and health-aware router
- Hard free-only policy (`FORGEFLOW_FREE_ONLY=true` by default)
- Free-first routing and health-aware fallback
- Operation-aware provider support filtering
- User-owned API credentials
- OpenRouter free routing
- Google Gemini free-tier routing where available
- NVIDIA hosted free endpoints where supported by the adapter
- fal.ai adapter retained but blocked by the free-only policy
- Local/mock provider for development
- Dedicated image, video, audio, STT and TTS MCP tool contracts
- Composable ad, social-video and full-media workflows
- Docker and Docker Compose deployment
- GitHub Actions CI with Node 20/22/24 and Docker smoke testing
- npm publish workflow
- TypeScript declarations

## Architecture

```text
MCP Host
   │
   ├── stdio
   └── Streamable HTTP
          │
          ▼
   ┌───────────────────────┐
   │    ForgeFlow Core     │
   │ MCP Tools / Resources │
   └──────────┬────────────┘
              │
       Free-only Router
              │
      capability + operation
      health + routing mode
              │
     ┌────────┼─────────┐
     ▼        ▼         ▼
 OpenRouter Google   NVIDIA
     │        │         │
     └────────┼─────────┘
              │
        User's own keys
              │
              ▼
      Eligible free model

 fal.ai remains implemented as a provider adapter but is excluded by
 the default free-only policy because fal.ai is pay-as-you-go.
```

## Install

```bash
npm install forgeflow-mcp
```

Or:

```bash
npx forgeflow-mcp
```

## Provider API keys

Create your own keys and put them in `.env` or the environment of the MCP process:

```env
FORGEFLOW_FREE_ONLY=true

OPENROUTER_API_KEY=
GOOGLE_API_KEY=
NVIDIA_API_KEY=
```

You do **not** need all three. Configure the providers you want to use.

Detailed, phone-friendly setup instructions are in [`GETTING_STARTED.md`](GETTING_STARTED.md).

### OpenRouter

OpenRouter provides a free-model router for eligible workloads. ForgeFlow uses `openrouter/free` when an explicit model is not supplied for supported text routing.

### Google

Google provides a Gemini API free tier with model-specific limits. ForgeFlow uses a current free-tier model for its default text route; availability is controlled by Google and may change.

### NVIDIA

NVIDIA Build exposes hosted free endpoints as well as downloadable models. ForgeFlow only uses a hosted endpoint when the adapter knows the request contract and the endpoint is eligible under the free-only policy.

### fal.ai

fal.ai is **not considered free**. Its normal model APIs are usage-priced. The adapter remains in the codebase so the provider abstraction is preserved, but v0.5.0 refuses to select it while free-only mode is enabled.

## Free-only routing behavior

`FORGEFLOW_FREE_ONLY=true` is the default.

The router:

1. filters out non-free providers;
2. filters by capability;
3. filters by operation-level support;
4. removes unhealthy providers from the preferred path;
5. applies the selected routing mode;
6. executes the request;
7. falls back only to another eligible free provider when allowed.

If no free provider supports an operation, ForgeFlow **fails closed**. It does not silently charge the user.

Example:

```text
forgeflow_image_generate
        │
        ▼
 free capability candidates?
        │
    ┌───┴───┐
    │       │
   yes      no
    │       │
    ▼       ▼
 best free  explicit error
 candidate  (no paid fallback)
```

## Model selection

MCP clients normally do not need to specify a model.

```text
forgeflow_route
capability: text
prompt: "Write a product description."
```

ForgeFlow decides which eligible free provider/model path to use. The architecture intentionally avoids hard-coding one model into the MCP contract.

Free model catalogs and provider limits are volatile. A model being free today does not guarantee that it will remain free tomorrow. Provider adapters should therefore treat free availability as provider policy, not as a permanent product guarantee.

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

Tool availability is an MCP contract. A tool being present does not imply a free model exists for that operation at every provider.

## Stdio

```bash
npx forgeflow-mcp
```

The MCP host must launch the process with the provider environment variables available to it.

See [`examples/opencode.jsonc`](examples/opencode.jsonc) for an example host configuration.

## Streamable HTTP

```bash
cp .env.example .env
npm run start:http
```

Default endpoint:

```text
http://localhost:8787/mcp
```

Set `FORGEFLOW_API_KEY` to require:

```http
Authorization: Bearer <your-server-key>
```

Provider keys are server-side and are never part of MCP tool schemas.

## Health

The HTTP `/health` endpoint reports ForgeFlow status, version, free-only policy and provider health counters without exposing API keys.

## Docker

```bash
docker compose up --build -d
```

The container runs as the non-root `node` user and includes a health check.

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

CI validates Node 20, 22 and 24 and performs a Docker build + health smoke test.

## Security

- Never commit `.env`.
- Never put provider keys into MCP prompts/tool arguments.
- Rotate exposed provider keys immediately.
- For public HTTP deployments use TLS/reverse-proxy protection.
- Keep `FORGEFLOW_FREE_ONLY=true` if you want a strict no-paid-fallback guarantee.

See [`SECURITY.md`](SECURITY.md).

## License

MIT. See [`LICENSE`](LICENSE).
