# Changelog

## 0.2.0 — 2026-09-06

- Added OpenRouter, Google, NVIDIA and fal.ai provider adapters.
- Added image, video, audio, STT and TTS MCP tool contracts.
- Added ad, social-video and full-media workflows.
- Added automatic/free-first/quality/fallback routing modes.
- Added provider health scoring and temporary cooldown for repeated failures.
- Added transient HTTP retry/backoff with `Retry-After` support.
- Added fal.ai queue polling and result retrieval.
- Added optional HTTP Bearer authentication and rate limiting.
- Added HTTP request body-size protection and graceful shutdown.
- Hardened Docker runtime with non-root execution and a health check.
- Added CI validation on Node 20, 22 and 24 plus Docker smoke testing.
- Added router and provider-registry resilience tests.

## 0.1.0 — 2026-09-06

- Initial public repository foundation.
- Provider abstraction and registry.
- Capability-aware model router.
- MCP TypeScript SDK v2 server entrypoint.
- Environment template and project governance files.
