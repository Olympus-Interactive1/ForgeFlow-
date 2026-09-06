# ForgeFlow

Universal, provider-agnostic MCP server and media/model orchestration layer.

> Early-stage foundation — APIs and provider adapters are intentionally designed for extension.

## Vision

ForgeFlow exposes a standards-based MCP interface for model routing, image, video, audio, speech, and composable media workflows without coupling the server to a single MCP host or AI application.

## Principles

- MCP-first and host-agnostic
- Provider adapters behind stable interfaces
- Explicit routing and fallback policies
- Secure environment-based credentials
- TypeScript, strict typing, testable modules
- Small core with independently extensible providers

## Planned capabilities

- Model routing: `auto`, `free-first`, `quality`, `fallback`
- Text/model providers
- Image generation, editing, analysis, and upscaling
- Video generation, image-to-video, extension, and analysis
- TTS, STT, and audio generation
- Composable media workflows
- Local providers
- Generic MCP client examples
- OpenCode integration example (optional; not required)

## Status

The repository is being built incrementally. The public API may change before the first stable release.

## License

MIT. See [LICENSE](LICENSE).
