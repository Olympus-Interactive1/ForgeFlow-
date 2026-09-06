# Security Policy

## Reporting a vulnerability

Do not disclose exploitable vulnerabilities in public issues. Use GitHub's private security reporting mechanism for this repository when available, or contact the repository maintainers privately.

Never include API keys, tokens, personal data, or production credentials in issues or pull requests.

## Secrets

ForgeFlow reads provider credentials from environment variables. Credentials must remain outside source control and logs.

## Public HTTP deployments

Before exposing the Streamable HTTP endpoint to the internet:

- Set a strong, randomly generated `FORGEFLOW_API_KEY`.
- Put ForgeFlow behind TLS termination/reverse proxy infrastructure.
- Keep the rate limit enabled and tune it for the expected workload.
- Keep the request body limit enabled; raise it only when required by the deployment.
- Restrict upstream access where possible with network policy/firewall rules.
- Do not expose provider credentials to clients.
- Monitor `/health` and provider failure/latency metrics without publishing secrets.

The built-in rate limiter and API-key authentication are intentionally lightweight in-memory controls. For multi-instance production deployments, enforce authentication and distributed rate limiting at the gateway/load-balancer layer as well.
