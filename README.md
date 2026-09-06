<div align="center">

# ForgeFlow MCP

### Universal AI orchestration for MCP

**Provider-agnostic · Free-first · Fail-closed · MCP-native**

[![npm](https://img.shields.io/npm/v/forgeflow-mcp?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/forgeflow-mcp)
[![CI](https://img.shields.io/github/actions/workflow/status/Olympus-Interactive1/ForgeFlow-/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/Olympus-Interactive1/ForgeFlow-/actions)
[![Release](https://img.shields.io/github/v/release/Olympus-Interactive1/ForgeFlow-?style=for-the-badge&label=release)](https://github.com/Olympus-Interactive1/ForgeFlow-/releases)
[![Node](https://img.shields.io/badge/node-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/Olympus-Interactive1/ForgeFlow-?style=for-the-badge)](LICENSE)

**Route AI workloads across eligible providers without locking your MCP client to one vendor.**

ForgeFlow works with **OpenCode, Claude, Cursor, VS Code, custom MCP clients, and other MCP-compatible hosts** through stdio or Streamable HTTP.

</div>

---

## Why ForgeFlow?

ForgeFlow places a capability-aware routing layer between an MCP client and multiple AI providers.

```text
MCP Client
    │
    ▼
MCP / stdio / HTTP
    │
    ▼
ForgeFlow
    ├── Capability filter
    ├── Operation filter
    ├── Free-only policy
    ├── Health + latency routing
    ├── Media asset normalization
    └── Provider-neutral pipelines
    │
    ├── OpenRouter
    ├── Google
    └── NVIDIA
```

### Core properties

| Capability | ForgeFlow |
|---|:---:|
| MCP-native | ✅ |
| Provider-agnostic | ✅ |
| Free-only mode | ✅ Default |
| User-owned API keys | ✅ |
| Capability-aware routing | ✅ |
| Operation-aware routing | ✅ |
| Health-aware fallback | ✅ |
| Media asset contract | ✅ |
| Sequential media pipelines | ✅ |
| Silent paid fallback | ❌ |
| OpenCode lock-in | ❌ |
| Docker deployment | ✅ |
| Stdio + Streamable HTTP | ✅ |

> **Core rule:** with `FORGEFLOW_FREE_ONLY=true`, ForgeFlow never silently routes to a paid provider/model. If no eligible free path exists, the request fails closed.

---

## Quick start

### Install

```bash
npm install forgeflow-mcp
```

Or:

```bash
npx forgeflow-mcp
```

### Configure provider keys

```env
FORGEFLOW_FREE_ONLY=true
FORGEFLOW_FREE_PROVIDERS=openrouter,google,nvidia

OPENROUTER_API_KEY=
GOOGLE_API_KEY=
NVIDIA_API_KEY=
```

You only need to configure the providers you intend to use. API keys remain user-owned; ForgeFlow does not ship a shared inference key.

See **[GETTING_STARTED.md](GETTING_STARTED.md)** for installation and MCP client configuration.

---

## Routing

ForgeFlow supports:

- `auto` — balanced automatic routing
- `free-first` — prioritize eligible free paths
- `quality` — prioritize configured quality providers while respecting policy
- `fallback` — resilience-oriented selection

The router considers capability, operation metadata, model eligibility, provider health, failures and latency. Repeated provider failures temporarily reduce priority.

### Free-only policy

The default policy is deliberately strict:

1. Discover compatible models.
2. Reject known paid models.
3. Match the requested capability and operation.
4. Prefer eligible free paths.
5. Avoid unhealthy providers.
6. Execute.
7. Fall back only to another eligible free candidate.

Provider/account free tiers can change. Free availability is therefore treated as an eligibility decision, not a permanent promise that every workload costs $0.

---

## MCP tools

### Routing and discovery

- `forgeflow_route`
- `forgeflow_discover`

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

- `forgeflow_media_pipeline`
- `forgeflow_create_ad`
- `forgeflow_social_video`
- `forgeflow_full_media`

A tool being present in the MCP contract does **not** mean that a free model exists for that operation at every provider. ForgeFlow fails closed instead of silently charging through a paid fallback.

---

## Media assets and pipelines

ForgeFlow 0.8 introduces a provider-neutral `MediaAsset` contract for image, video and audio results. Providers can return either a remote URL or inline base64 data while the MCP layer receives a consistent shape.

Pipelines can chain assets between operations:

```text
image_generate
      │
      ▼
MediaAsset
      │
      ▼
video_image_to_video
      │
      ▼
MediaAsset
```

`forgeflow_media_pipeline` validates operation/capability compatibility before execution and can feed the previous media asset into the next step.

Long-running provider jobs use a shared polling abstraction with timeout and cancellation handling.

---

## Provider layer

| Provider | Role | Free-only default |
|---|---|:---:|
| OpenRouter | Free model routing for supported workloads | ✅ |
| Google | Gemini/Veo free-tier routing where eligible | ✅ |
| NVIDIA | Hosted endpoints supported by the adapter | ✅ |
| fal.ai | Adapter retained for abstraction/future use | 🚫 blocked |

`fal.ai` is intentionally blocked while free-only mode is enabled because its normal model APIs are usage-priced.

---

## Architecture

```text
ForgeFlow MCP
├── MCP Core
│   ├── Tools
│   └── Resources
├── Model Router
│   ├── Capability selection
│   ├── Operation selection
│   ├── Free eligibility
│   └── Health-aware fallback
├── Media Contracts
│   ├── MediaAsset
│   ├── MediaJob
│   └── MediaPipeline
├── Providers
│   ├── Google
│   ├── OpenRouter
│   ├── NVIDIA
│   ├── fal.ai adapter
│   └── Mock
└── Deployment
    ├── Stdio
    ├── Streamable HTTP
    └── Docker
```

---

## MCP configuration

ForgeFlow is a normal MCP server, not an OpenCode plugin.

```json
{
  "mcpServers": {
    "forgeflow": {
      "command": "npx",
      "args": ["forgeflow-mcp"],
      "env": {
        "FORGEFLOW_FREE_ONLY": "true",
        "FORGEFLOW_FREE_PROVIDERS": "openrouter,google,nvidia",
        "OPENROUTER_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

The same server contract can be used by any MCP-compatible client.

---

## Streamable HTTP

```bash
cp .env.example .env
npm run start:http
```

Default endpoint:

```text
http://localhost:8787/mcp
```

Optional server authentication:

```env
FORGEFLOW_API_KEY=change-me
```

The HTTP server also exposes `/health`, rate limiting and request-size protection.

---

## Docker

```bash
docker compose up --build -d
```

The container uses a non-root runtime user, restricted Linux capabilities, a read-only filesystem and a health check.

---

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

CI validates Node.js 20, 22 and 24 plus Docker build and health smoke testing. The test suite includes MCP wire-level end-to-end coverage using a deterministic mock provider, so CI does not require external API keys.

---

## Project status

**Current release: `v0.8.0`**

0.8.0 establishes the provider-neutral media asset layer, long-running media-job abstraction, operation-aware pipelines, stricter free eligibility, normalized Google/NVIDIA media outputs and MCP protocol end-to-end coverage.

Live provider/account eligibility still depends on the provider and credentials configured by the user. ForgeFlow does not guarantee free access to every media workload.

---

## Security

- Never commit `.env` files.
- Never put provider API keys into prompts or MCP tool arguments.
- Rotate exposed provider keys immediately.
- Use TLS/reverse-proxy protection for public HTTP deployments.
- Keep `FORGEFLOW_FREE_ONLY=true` for a strict no-paid-fallback policy.

See [`SECURITY.md`](SECURITY.md).

---

## Documentation

- [Getting Started](GETTING_STARTED.md)
- [Changelog](CHANGELOG.md)
- [Security](SECURITY.md)
- [License](LICENSE)
- [Latest Release](https://github.com/Olympus-Interactive1/ForgeFlow-/releases/latest)

<div align="center">

### ForgeFlow MCP

**One MCP interface. Multiple providers. No forced vendor lock-in.**

[GitHub](https://github.com/Olympus-Interactive1/ForgeFlow-) · [Releases](https://github.com/Olympus-Interactive1/ForgeFlow/) · [npm](https://www.npmjs.com/package/forgeflow-mcp)

</div>
