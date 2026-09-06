# Contributing to ForgeFlow

## Development

1. Use Node.js 20+.
2. Copy `.env.example` to `.env` when provider credentials are needed.
3. Install dependencies with `npm install`.
4. Run `npm run lint`, `npm test`, and `npm run build` before opening a PR.

## Architecture rules

- Keep MCP transport concerns in the MCP layer.
- Keep provider-specific API calls inside provider adapters.
- Do not leak provider SDK types into core interfaces.
- Never commit API keys or secrets.
- Add tests for routing decisions and provider behavior.

## Pull requests

Explain the problem, design choice, compatibility impact, and tests performed. Keep changes focused.
