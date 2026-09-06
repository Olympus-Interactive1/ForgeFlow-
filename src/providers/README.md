# Provider adapters

Provider adapters belong here. Each adapter should:

1. Implement `Provider` from `src/core/types.ts`.
2. Read credentials from environment/configuration.
3. Translate ForgeFlow requests to the provider API.
4. Normalize responses back to ForgeFlow types.
5. Never expose provider SDK types through `src/core`.

Planned adapters:

- Google
- OpenRouter
- NVIDIA
- fal.ai
- Local

Adapters should be independently testable with mocked HTTP/API clients.
