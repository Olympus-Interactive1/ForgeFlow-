# Architecture

```text
MCP Client / Host
        |
        v
+---------------------+
|      MCP Layer      |
| tools/resources/etc |
+----------+----------+
           |
           v
+---------------------+
|    Model Router     |
| auto/free/quality/  |
| fallback policies   |
+----------+----------+
           |
           v
+---------------------+
| Provider Registry   |
+----------+----------+
           |
     +-----+-----+----------------+
     |           |                |
  Google     OpenRouter       NVIDIA/fal
     |           |                |
     +-----------+----------------+
                 |
             Local / future
```

## Core principle

The MCP layer knows capabilities and request contracts, not provider SDK details. Provider adapters implement the `Provider` interface and translate generic requests into provider-specific API calls.

## Routing

`auto` selects an available provider using the registry. `free-first` prioritizes providers explicitly configured as free. `quality` prioritizes providers configured as quality-preferred. `fallback` attempts candidates sequentially.

## Media model

Image, video, audio, STT, and TTS are capabilities rather than hard-coded vendors. This allows providers to expose one or many capabilities and permits new providers without changing the core protocol surface.

## Transports

The first runtime target is local stdio. Remote Streamable HTTP is a planned transport using the MCP v2 server APIs. OpenCode is one optional host integration, not an architectural dependency.
