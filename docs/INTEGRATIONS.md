# Integrations

## Generic MCP client

Any MCP host supporting the server transport can launch the package as a local process:

```json
{
  "mcpServers": {
    "forgeflow": {
      "command": "npx",
      "args": ["forgeflow-mcp"]
    }
  }
}
```

The exact configuration shape depends on the host. Do not assume OpenCode-specific configuration in the core package.

## OpenCode

OpenCode is supported as an example MCP host. Its configuration belongs in documentation/examples and must not become a runtime dependency.

## Remote deployment

The planned remote mode will expose a Streamable HTTP endpoint. Authentication and origin validation will be mandatory before exposing provider operations publicly.
