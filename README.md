# Protocol Radar

[![x402 Bazaar](https://img.shields.io/endpoint?url=https%3A%2F%2Faaron-protocol-radar.vercel.app%2Fbadge%2Fbazaar.json)](https://aaron-protocol-radar.vercel.app/bazaar/standing)

One of four small x402 data services I run alongside my Bitcoin research: [PreIPO Feed](https://preipo-feed.vercel.app/llms.txt) · [Bitcoin Technical Radar](https://btc-radar.vercel.app/llms.txt) · [Protocol Radar](https://aaron-protocol-radar.vercel.app/llms.txt) · [Data MCP](https://aaron-zhang-mcp.vercel.app/llms.txt).

Pay-per-call x402 API (USDC on Base): live, machine-read status of the protocols and software agents depend on.
Live: https://aaron-protocol-radar.vercel.app (start at /llms.txt). Built and maintained by Aaron Zhang.

- `/ethereum/client-releases` — 10 Ethereum execution and consensus clients
- `/agents/framework-releases` — OpenClaw, Model Context Protocol spec, LangGraph, CrewAI
- `/x402/protocol-updates` — x402 Foundation repository changes, tags, npm package versions

Data is read from public GitHub and npm APIs at request time, cached up to 6 hours, never rewritten by a model.
`lib/products.js` defines the routes; `scripts/validate.mjs` checks route metadata at build time.
