# ForgeFlow MCP — Getting Started

ForgeFlow MCP is a provider-agnostic MCP server. Starting with v0.6.0, the default policy is **free-only**: ForgeFlow will not select a paid provider/model while `FORGEFLOW_FREE_ONLY=true`.

You install ForgeFlow locally and supply your own provider API keys. ForgeFlow does not ship a shared API key and does not charge users for inference.

## 1. Requirements

- Node.js 20 or newer
- An MCP-compatible host such as OpenCode, Claude Desktop, Cursor, VS Code, or another MCP client
- At least one supported provider API key

## 2. Install

```bash
npm install forgeflow-mcp
```

Or run it directly:

```bash
npx forgeflow-mcp
```

## 3. Create your environment file

For local source/Docker deployments:

```bash
cp .env.example .env
```

For a package installation, create a `.env` file in the working directory from which ForgeFlow is launched, or export the same variables in your shell/service manager.

Never commit `.env` to Git.

## 4. Add your own API keys

You do not need every provider. Add the keys for the providers you want to use.

### OpenRouter

1. Open the OpenRouter website and sign in.
2. Create an API key from your account's Keys page.
3. Put it in `.env`:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
```

ForgeFlow can query OpenRouter's model catalog and keeps models whose reported input and output pricing are both zero. When no model is explicitly requested, the normal route may use `openrouter/free`.

Important: OpenRouter's free catalog changes over time. Free does not mean unlimited; provider rate limits still apply.

### Google Gemini

1. Open Google AI Studio and sign in.
2. Create a Gemini API key.
3. Put it in `.env`:

```env
GOOGLE_API_KEY=your_google_key_here
GOOGLE_FREE_MODELS=gemini-3.1-flash-lite
```

ForgeFlow verifies the configured allowlist against Google's current model catalog before reporting a model as available. Update `GOOGLE_FREE_MODELS` only with models you are entitled to use on Google's free tier.

### NVIDIA

1. Open NVIDIA Build and sign in.
2. Open an eligible free endpoint and use **Get API Key**.
3. Put the key in `.env`:

```env
NVIDIA_API_KEY=your_nvidia_key_here
```

NVIDIA's model catalog contains hosted free endpoints as well as downloadable/local models. ForgeFlow's hosted adapter only uses endpoints that match its supported request contract.

### fal.ai

`FAL_KEY` is intentionally **not used by the v0.6.0 free-only router**. fal.ai is a pay-as-you-go provider, so it cannot be treated as a universally free provider. The adapter remains in the repository for future paid/opt-in work, but the default policy blocks it.

## 5. Discover what is currently available

ForgeFlow exposes the `forgeflow_discover` MCP tool. It checks eligible providers and returns their currently discoverable models, capabilities, and any catalog errors.

This is the mechanism intended to prevent users from having to hunt through provider catalogs themselves.

Paid providers are hidden from discovery while free-only mode is enabled.

## 6. Keep the free-only policy enabled

```env
FORGEFLOW_FREE_ONLY=true
FORGEFLOW_FREE_PROVIDERS=openrouter,google,nvidia
```

With this setting:

- paid providers are excluded before routing;
- an explicit paid provider request is rejected;
- automatic fallback can only move to another eligible free provider;
- if no free provider supports an operation, ForgeFlow returns an explicit error instead of silently charging the user.

Do not set `FORGEFLOW_FREE_ONLY=false` if the goal is a strictly free product.

## 7. Configure an MCP host

### Generic stdio configuration

The command is:

```bash
npx forgeflow-mcp
```

The host must launch this command with the provider environment variables above available to the process.

### OpenCode

See `examples/opencode.jsonc`. The important part is that the MCP process receives the provider environment variables. Never put keys directly into the MCP tool arguments.

### Remote Streamable HTTP

Start ForgeFlow:

```bash
npm run start:http
```

Default endpoint:

```text
http://localhost:8787/mcp
```

Protect a public deployment with `FORGEFLOW_API_KEY` and pass:

```http
Authorization: Bearer <your_forgeflow_server_key>
```

The provider API keys remain server-side and are never part of MCP tool schemas.

## 8. How model selection works

You do not need to choose a specific AI model for normal requests.

For example:

```text
forgeflow_route
capability = text
prompt = "Write a product description for a gaming mouse."
```

ForgeFlow evaluates the eligible provider pool, free-only policy, capability/operation support, provider health and routing mode. Provider adapters may use their own free model router/catalog when the provider exposes one.

The architecture deliberately avoids making MCP clients depend on a single model name.

Automatic modes may retry another eligible free provider after a provider failure. If you explicitly name a provider, ForgeFlow treats that as an explicit contract and does not silently switch providers.

## 9. Media operations and the free-only rule

ForgeFlow exposes image, video and audio tools even when a particular installation has no free model for one of those operations.

This is intentional.

A tool being present means the MCP contract exists; it does **not** mean a free model is guaranteed to exist at every provider at every moment.

If no eligible free provider supports an operation, ForgeFlow fails closed with an explicit error. It will not silently route the request to a paid model.

This is especially important for image/video/audio generation because free API availability changes faster than text-model availability.

## 10. Security

- Keep `.env` private.
- Never paste API keys into MCP prompts.
- Never commit provider keys to GitHub.
- Rotate a key immediately if it is exposed.
- For remote deployments, set `FORGEFLOW_API_KEY` and use HTTPS/reverse-proxy TLS.
- Treat provider API keys as equivalent to passwords.

## 11. Troubleshooting

### `No free provider/model supports capability/operation`

No configured free provider currently supports that operation. Add another eligible free provider key or wait for a supported free endpoint to become available.

### `OPENROUTER_API_KEY is required`

Set `OPENROUTER_API_KEY` in the process environment before starting ForgeFlow.

### `GOOGLE_API_KEY is required`

Set `GOOGLE_API_KEY` in the process environment before starting ForgeFlow.

### `NVIDIA_API_KEY is required`

Set `NVIDIA_API_KEY` in the process environment before starting ForgeFlow.

### A provider is rate-limited

ForgeFlow records provider failures and temporarily deprioritizes unhealthy providers. Free-tier quotas are controlled by the provider, not ForgeFlow.
