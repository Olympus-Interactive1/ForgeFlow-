# ForgeFlow Agent Guide

## Repository intent

ForgeFlow is a generic MCP server and orchestration layer. Do not introduce host-specific assumptions into the core.

## Boundaries

- `src/core/`: provider-neutral contracts, routing, registry, policy.
- `src/providers/`: provider adapters and credential mapping.
- `src/mcp/`: MCP-facing tools, resources, prompts, and transport composition.
- `src/workflows/`: higher-level media workflows.
- `tests/`: unit and integration tests.
- `docs/`: architecture and integration documentation.

## Engineering rules

- TypeScript strict mode.
- Node.js 20+.
- ESM.
- No secrets in code or fixtures.
- Prefer dependency inversion and capability-based interfaces.
- Preserve backwards compatibility once a public API is marked stable.
