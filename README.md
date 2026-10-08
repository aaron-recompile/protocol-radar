# Protocol Radar

Pay-per-call x402 API (USDC on Base): live, machine-read status of the protocols and software agents depend on.
Live: https://aaron-protocol-radar.vercel.app (start at /llms.txt). Built and maintained by Aaron Zhang.

- `/ethereum/client-releases` — 10 Ethereum execution and consensus clients
- `/agents/framework-releases` — OpenClaw, Model Context Protocol spec, LangGraph, CrewAI
- `/x402/protocol-updates` — x402 Foundation repository changes, tags, npm package versions

Data is read from public GitHub and npm APIs at request time, cached up to 6 hours, never rewritten by a model.
`lib/products.js` defines the routes; `scripts/validate.mjs` checks route metadata at build time.
