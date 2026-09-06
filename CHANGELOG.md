# Changelog

## 0.8.0 — 2026-09-07

- Added provider-neutral `MediaAsset` contracts for image, video, and audio outputs.
- Added shared media-job polling for long-running provider operations.
- Added sequential provider-neutral media pipelines with previous-asset chaining.
- Added operation-aware routing and pipeline capability validation.
- Added model-level free/paid/unknown eligibility and stricter free-only routing.
- Added canonical media output normalization for Google and NVIDIA adapters.
- Added the MCP `forgeflow_media_pipeline` tool.
- Added MCP protocol end-to-end tests using the official MCP v2 client over stdio.
- Added provider media contract and free-eligibility regression tests.
- Prevented paid model selection from bypassing `FORGEFLOW_FREE_ONLY=true`.
- Prevented empty pricing metadata from being treated as proof of free media access.
- Normalized provider responses without exposing reasoning-only model output as final text.
- Preserved selected models in router responses.
- CI passes on Node.js 20, 22 and 24 with Docker build and health smoke testing.

> Free availability is provider/account dependent. ForgeFlow does not guarantee that every media operation is free at every provider and fails closed rather than silently using a paid route.

## 0.3.0 — 2026-09-06

- Added operation-specific fal.ai media routing.
- Added Z-Image Base text-to-image generation.
- Added Playground v2.5 image-to-image editing.
- Added ESRGAN image upscaling.
- Added LTX-2.3 text-to-video generation.
- Added Kling video image-to-video generation.
- Added LTX-2.3 video extension.
- Added Stable Audio 2.5 text-to-audio generation.
- Added Chatterbox text-to-speech.
- Added fal.ai speech-to-text.
- Added normalized media results with request ID, operation, status, URL and MIME type where available.
- Added explicit operation metadata to dedicated MCP media tools so edit/upscale/extend/TTS/STT requests do not fall back to generic generation.
- Expanded README provider/model documentation.

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
