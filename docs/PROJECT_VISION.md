# ForgeFlow Project Vision

> Long-term product vision and implementation roadmap for ForgeFlow MCP.
>
> This document is intended to be a durable handoff document for maintainers and AI coding agents. Before implementing a major feature, read this document and preserve its architectural principles and explicit non-goals.

## 1. Product Vision

ForgeFlow is a universal, provider-agnostic MCP server and AI orchestration layer.

The core idea is simple: users should not need to search for individual AI services, learn every provider's API, remember model names, or manually switch between providers. ForgeFlow should provide one consistent MCP interface while selecting an eligible provider behind the scenes.

ForgeFlow is inspired by the convenience and aggregation experience of products such as OmniRoute, but it is not intended to copy their implementation or become provider-locked. ForgeFlow is MCP-native, provider-agnostic, and designed around user-owned API access.

The long-term product should evolve from an MCP package into a complete local AI provider control plane:

```text
Install ForgeFlow
       ↓
MCP server configured automatically
       ↓
forge / flow
       ↓
Local ForgeFlow dashboard
       ↓
Add API keys
       ↓
Discover accessible providers/models
       ↓
See available capabilities
       ↓
Configure routing and preferences
       ↓
Use ForgeFlow through any compatible MCP client
```

## 2. Core Principles

### 2.1 Free-first means free-only by default

ForgeFlow's default policy is strict:

- Prefer eligible free providers.
- Never silently fall back to a paid provider.
- If automatic routing fails, another eligible free provider may be tried.
- If the user explicitly selects a provider and it fails, return an error instead of silently switching providers.
- If no eligible free provider exists for a capability, fail closed and explain why.
- Paid providers may exist as adapters for future opt-in scenarios, but they must never bypass the default free-only policy.

This is a product invariant, not merely a UI preference.

### 2.2 User-owned credentials

Users provide their own API keys. ForgeFlow should manage provider configuration locally and securely rather than requiring a central ForgeFlow account or centralizing provider credentials.

Never hard-code, log, expose, or commit API keys or secrets.

### 2.3 Provider abstraction

Provider-specific APIs must remain behind adapters. Core routing, MCP tools, workflows, and UI code should not depend directly on a single provider's API format.

Adding a provider should require implementing a clear provider contract rather than rewriting the router.

### 2.4 Runtime capability discovery

ForgeFlow should determine what is actually available instead of assuming that a provider's marketing capability is currently usable or free.

Discovery should consider, where available:

- provider
- model
- capability
- free/paid status
- configured credentials
- endpoint availability
- model availability
- provider health
- relevant limits or quotas

## 3. Current State: v0.6.0

v0.6.0 establishes the foundation for this vision.

Current major capabilities include:

- MCP server
- provider registry
- model routing
- free-only routing by default
- automatic fallback between eligible free providers
- explicit-provider no-silent-fallback behavior
- provider health tracking and cooldowns
- dynamic free-provider discovery
- `forgeflow_discover`
- OpenRouter integration
- Google integration
- NVIDIA integration
- NVIDIA Cosmos3-Nano T2V/I2V support
- NVIDIA Magpie TTS support
- media-oriented MCP tools and workflows
- HTTP transport
- Docker support
- CI validation across supported Node.js versions

v0.6.0 is the foundation. The next stages should focus on making the provider system extensible and turning the server into a usable product rather than simply adding random integrations.

## 4. Roadmap

### v0.7.0 — Provider Platform Foundation

**Goal:** Make provider expansion scalable and predictable.

#### Planned

- Formal provider adapter contract
- Capability normalization across providers
- Better runtime discovery normalization
- Discovery result caching with safe invalidation/TTL
- Provider health and availability metadata
- Cleaner provider registration
- Easier addition of third-party providers
- Stronger free-only enforcement at every routing boundary
- Provider capability tests and contract tests
- Better documentation for implementing a provider adapter

#### Should NOT be the focus

- A large visual dashboard
- A central cloud account system
- Paid-provider billing
- Rewriting the MCP protocol layer without a concrete need
- Adding providers solely for the sake of increasing the provider count

Quality and extensibility matter more than the raw number of adapters.

---

### v0.8.0 — Provider & Model Management

**Goal:** Give users a clear way to understand and configure what they can actually access.

#### Planned

- Local CLI entry point
- `forge` command
- `flow` command as a supported alias if technically appropriate
- Provider configuration commands
- Local configuration management
- API-key setup flow
- Model discovery commands
- Capability discovery commands
- Clear free/paid status for discovered models
- Configuration validation
- Human-readable diagnostics

Example future UX:

```text
$ forge

ForgeFlow
─────────
Provider configuration
Model discovery
Capabilities
Health
Settings
Open dashboard
```

The CLI should remain useful on its own and should not require the web dashboard for basic configuration.

---

### v0.9.0 — Local Web Dashboard

**Goal:** Make ForgeFlow easy to configure without editing environment files manually.

Running `forge` or `flow` should be able to start/open a local ForgeFlow web interface.

#### Planned dashboard areas

- Provider list
- API-key management
- Connection/test status
- Discovered models
- Available capabilities
- Free/paid classification
- Provider health
- Routing mode
- Free-only policy status
- Preferred providers
- Model preferences
- Discovery refresh
- Logs/diagnostics suitable for local troubleshooting

The dashboard should make it immediately clear:

```text
Provider → Model → Capability → Availability → Free/Paid → Health
```

#### Security requirements

- Bind to localhost by default.
- Never expose API keys in the UI after storage unless explicitly required.
- Never send credentials to a third-party analytics service.
- Do not introduce a remote control plane without an explicit future architecture decision.
- Avoid storing secrets in browser localStorage when a safer local mechanism is available.
- Protect sensitive configuration endpoints against unintended network exposure.

---

### v1.0.0 — ForgeFlow AI Orchestration Platform

**Goal:** Deliver the complete product experience.

The target experience is:

```text
User
 │
 ├── MCP Client
 │       ↓
 │   ForgeFlow MCP
 │       ↓
 ├── Discovery
 ├── Router
 ├── Health
 ├── Workflows
 └── Provider adapters
         ↓
   Free eligible providers
         ↓
   User-owned API access
```

#### Target capabilities

- Mature provider plugin architecture
- Robust runtime discovery
- Intelligent free-provider routing
- Automatic free-provider fallback
- Local CLI
- Local dashboard
- Provider/model configuration
- Capability matrix
- Health monitoring
- Unified media asset handling
- Strong workflow chaining
- Better asynchronous job support where providers require it
- Comprehensive integration tests
- Production-grade documentation

## 5. Provider Expansion Strategy

The project should grow horizontally through adapters rather than by coupling the core to individual vendors.

Target structure:

```text
src/
├── core/
│   ├── router/
│   ├── discovery/
│   ├── health/
│   └── capabilities/
├── providers/
│   ├── openrouter/
│   ├── google/
│   ├── nvidia/
│   ├── fal/
│   └── future-provider/
├── media/
├── workflows/
├── mcp/
├── cli/
└── dashboard/
```

A future provider should ideally implement a predictable contract such as:

```text
Provider
 ├── identity
 ├── authentication
 ├── discovery
 ├── capabilities
 ├── pricing/free-status
 ├── health
 └── execution
```

The router should consume normalized provider information rather than provider-specific response formats.

## 6. Free Provider Rules

A provider must not be treated as free merely because:

- its website has a free trial;
- an API has promotional credits;
- a model appears inexpensive;
- a provider supports a capability but charges for it;
- a third-party list claims that it is free.

ForgeFlow should use the strongest available runtime evidence and configured provider policy.

When free availability cannot be established, ForgeFlow should prefer safety and fail closed rather than falsely advertise a capability as free.

## 7. Model Management

The future dashboard and CLI should answer questions such as:

- Which providers can I use with my configured keys?
- Which models are currently accessible?
- Which capabilities does each model support?
- Which options are free?
- Which provider is currently healthy?
- Why was a provider skipped?
- Why did fallback happen?
- Why is a requested capability unavailable?

Users should not have to manually maintain a giant model allowlist whenever possible.

However, user overrides must remain possible for cases where automatic discovery is insufficient.

## 8. Routing Modes

The existing routing model should remain conceptually stable:

```text
AUTO
 └── Choose the best eligible provider automatically

FREE-FIRST
 └── Prefer free providers and respect free-only policy

QUALITY
 └── Choose the best eligible provider according to configured quality policy

FALLBACK
 └── Retry another eligible provider after failure
```

Important invariant:

```text
Explicit provider selection
        ↓
Provider fails
        ↓
ERROR
```

and:

```text
Automatic routing
        ↓
Provider fails
        ↓
Next eligible FREE provider
        ↓
Retry
```

## 9. Future Workflows

ForgeFlow should eventually support composable media workflows such as:

```text
Prompt
  ↓
Image generation
  ↓
Image-to-video
  ↓
TTS
  ↓
Final media package
```

Potential high-level workflows include:

- `create_ad`
- `social_video`
- `full_media`
- custom user-defined workflows

Workflow execution should use normalized assets and should not require workflow code to understand every provider's response format.

## 10. Media Asset Standardization

A future common `MediaAsset` abstraction should normalize:

- binary data
- base64 data
- URLs
- MIME type
- dimensions
- duration
- metadata
- provider/model information
- job identifiers where applicable

This prevents each provider from inventing a different output contract.

## 11. Async Jobs

Many media providers are asynchronous. ForgeFlow should eventually provide a common job abstraction:

```text
submit
  ↓
job id
  ↓
status
  ↓
progress
  ↓
artifact
  ↓
completion/failure
```

Future requirements may include:

- cancellation
- timeouts
- retries
- artifact retrieval
- persistence
- webhook support where appropriate

Do not introduce a distributed job system prematurely. Start with a clean abstraction and add persistence when actual requirements justify it.

## 12. What ForgeFlow Is NOT

ForgeFlow should NOT become:

- a proprietary AI model itself;
- a mandatory cloud service;
- a platform that secretly routes users to paid APIs;
- a credential harvesting service;
- a vendor-specific SDK disguised as a universal server;
- a huge collection of hard-coded model names with no discovery strategy;
- an unnecessary frontend-heavy product before the core provider architecture is stable;
- an analytics platform that sends user prompts or credentials elsewhere;
- a replacement for every MCP client.

## 13. What Should Not Be Added Without a Strong Reason

Do not add:

- telemetry that transmits prompts or credentials by default;
- mandatory account registration;
- mandatory ForgeFlow cloud infrastructure;
- hidden paid fallback;
- provider-specific logic inside the core router;
- arbitrary dependencies that significantly increase installation complexity;
- a giant UI before the CLI/configuration architecture is stable;
- fake free-provider claims;
- features that make MCP interoperability worse just to optimize for one client.

## 14. AI Agent / Contributor Instructions

When another AI coding agent works on ForgeFlow, it should:

1. Read this document before implementing major architectural changes.
2. Preserve the provider-agnostic architecture.
3. Preserve the default free-only invariant.
4. Never silently introduce paid fallback.
5. Never expose or hard-code credentials.
6. Prefer normalized contracts over provider-specific branching in core code.
7. Add tests for routing, discovery, provider contracts, and failure behavior.
8. Keep MCP compatibility as a first-class requirement.
9. Avoid speculative complexity.
10. Update this roadmap when a major architectural decision changes.
11. Clearly distinguish implemented functionality from planned functionality.
12. Never document a provider/capability as free unless the implementation has evidence supporting that claim.

## 15. Definition of Success

ForgeFlow succeeds when a new user can install it, configure their own provider credentials, and immediately understand what AI capabilities are available without researching individual provider APIs.

The ideal experience is:

```text
Install once.
Configure once.
Discover automatically.
Route intelligently.
Fallback safely.
Use through MCP.
```

The end goal is not simply "more providers".

The end goal is **less complexity for the user while retaining control, transparency, and a strict free-first/free-only-by-default model.**

---

**ForgeFlow — Provider-agnostic. MCP-native. Free-first by design.**
