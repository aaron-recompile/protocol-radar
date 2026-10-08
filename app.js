// Protocol Radar: live, deterministic status of protocols and software agents depend on
// (Ethereum clients, AI agent frameworks, x402). Paid via x402 (USDC on Base), listed in the x402 Bazaar.
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension, bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { facilitator } from "@coinbase/x402";
import { PRODUCTS } from "./lib/products.js";
import { RELATED } from "./lib/related.js";
const OTHERS = RELATED.filter((r) => !r.url.includes("protocol-radar"));

export const PAY_TO = "0x4b5887B6E399C2E104becd01f7c406229c15891d";
export const MAKER = { name: "Aaron Zhang", role: "independent developer", url: "https://farcaster.xyz/aaronzhang" };
export const SERVICE_NAME = "Protocol Radar - Aaron Zhang"; // Bazaar serviceName: printable ASCII, <= 32 chars
const NETWORKS = (process.env.X402_NETWORKS || "eip155:84532").split(",");
const SERVICE = {
  name: "Protocol Radar by Aaron Zhang",
  summary: "Live, machine-read status of the protocols and software agents depend on: Ethereum client releases, EIP status, AI agent framework releases, x402 protocol updates. Read directly from GitHub and npm, cached up to 6 hours, never rewritten by a model.",
  maker: `Built and maintained by ${MAKER.name}, an ${MAKER.role}.`,
};

const facilitatorConfig = process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET
  ? { ...facilitator, timeoutMs: 15_000 } : { url: "https://x402.org/facilitator", timeoutMs: 15_000 };
class RetryingFacilitatorClient extends HTTPFacilitatorClient {
  async getSupported() {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try { return await super.getSupported(); } catch (e) {
        lastError = e; console.warn(JSON.stringify({ event: "facilitator_supported_retry", attempt, error: String(e?.message || e).slice(0, 160) }));
      }
    }
    throw lastError;
  }
}
const server = new x402ResourceServer(new RetryingFacilitatorClient(facilitatorConfig));
for (const n of NETWORKS) server.register(n, new ExactEvmScheme());
server.registerExtension(bazaarResourceServerExtension);
server.onAfterSettle(async (ctx) => {
  console.log(JSON.stringify({ event: "sale", resource: ctx.paymentPayload?.resource?.url, network: ctx.requirements?.network,
    amount: ctx.requirements?.amount, payer: ctx.result?.payer, tx: ctx.result?.transaction, success: ctx.result?.success }));
});

const app = express();
app.set("trust proxy", true);
const PAID = new Set(PRODUCTS.map((p) => p.path));
app.use((req, res, next) => (req.method === "HEAD" && PAID.has(req.path) ? res.status(402).end() : next()));

app.use(paymentMiddleware(Object.fromEntries(PRODUCTS.map((p) => [`GET ${p.path}`, {
  accepts: NETWORKS.map((network) => ({ scheme: "exact", price: `$${p.price}`, network, payTo: PAY_TO })),
  description: p.description, mimeType: "application/json",
  serviceName: SERVICE_NAME, tags: p.tags, iconUrl: "https://aaron-protocol-radar.vercel.app/icon.svg",
  extensions: { ...declareDiscoveryExtension({ output: { example: { dataset: p.path.slice(1).replace("/", "-"), generated_at: "2026-10-08T00:00:00Z", sources: ["https://github.com/..."] } } }) },
}])), server));

for (const p of PRODUCTS) {
  app.get(p.path, async (req, res) => {
    try { res.send({ ...(await p.build()), publisher: { service: SERVICE.name, maker: MAKER } }); }
    catch (e) { res.status(503).send({ error: "upstream unavailable", detail: String(e.message).slice(0, 160) }); }
  });
}

const origin = (req) => `${req.protocol}://${req.get("host")}`;
const howToPay = "GET the endpoint; receive HTTP 402 with a PAYMENT-REQUIRED header; sign and retry with PAYMENT-SIGNATURE (x402 v2, scheme exact). No API key, no account.";
const catalog = () => PRODUCTS.map(({ path, price, tags, description }) => ({ path, price_usdc: price, tags, description }));

app.get("/", (req, res) => res.send({ service: SERVICE.name, maker: MAKER, what: SERVICE.summary,
  pay: { protocol: "x402", asset: "USDC", networks: NETWORKS }, paid: catalog(), free: ["/catalog"],
  discovery: ["/llms.txt", "/.well-known/x402", "/openapi.json", "/agents.json"], more_from_this_developer: OTHERS }));
app.get("/catalog", (req, res) => res.send(catalog()));

app.get("/.well-known/x402", (req, res) => {
  const o = origin(req);
  res.send({ x402Version: 2, service: SERVICE.name, serviceName: SERVICE_NAME, maker: MAKER, iconUrl: `${o}/icon.svg`,
    description: `${SERVICE.summary} ${SERVICE.maker}`, docs: `${o}/llms.txt`, openapi: `${o}/openapi.json`,
    rails: NETWORKS.map((network) => ({ rail: "x402", version: 2, scheme: "exact", network, asset: "USDC", how: howToPay })),
    payTo: PAY_TO,
    resources: [{ resource: `${o}/catalog`, method: "GET", description: "Free catalog of paid datasets.", priceUsd: 0, free: true },
      ...PRODUCTS.map((p) => ({ resource: `${o}${p.path}`, method: "GET", description: p.description, priceUsd: Number(p.price), free: false, networks: NETWORKS, tags: p.tags }))],
    related_services: OTHERS });
});
app.get("/openapi.json", (req, res) => {
  const o = origin(req);
  res.send({ openapi: "3.1.0",
    info: { title: SERVICE.name, version: "1.0.0", description: `${SERVICE.summary} ${SERVICE.maker}`, contact: { name: `${MAKER.name} (${MAKER.role})`, url: MAKER.url } },
    servers: [{ url: o }],
    paths: { "/catalog": { get: { summary: "Free catalog", responses: { 200: { description: "Paid datasets." } } } },
      ...Object.fromEntries(PRODUCTS.map((p) => [p.path, { get: { summary: p.path, description: p.description, tags: p.tags,
        "x-payment-info": { protocol: "x402", version: 2, scheme: "exact", priceUsd: Number(p.price), asset: "USDC", networks: NETWORKS, payTo: PAY_TO },
        responses: { 200: { description: "Dataset JSON with generated_at, method and sources." }, 402: { description: "Payment required (PAYMENT-REQUIRED header)." } } } }])) } });
});
app.get("/llms.txt", (req, res) => {
  const o = origin(req);
  res.type("text/plain").send(`# ${SERVICE.name}

> ${SERVICE.summary}

${SERVICE.maker} Contact: ${MAKER.url}

## Why use this
- One call instead of polling a dozen GitHub repos and npm packages.
- Machine-read and deterministic: values come straight from the upstream APIs with links; nothing is summarized or guessed.
- Each response says when it was generated and whether it is fresh, refreshed or a stale fallback.

## Endpoints (${PRODUCTS[0].price} USDC each)
${PRODUCTS.map((p) => `- [${p.path}](${o}${p.path}): ${p.description}`).join("\n")}
- [Catalog](${o}/catalog): free.

## How to pay
${howToPay}
Networks: ${NETWORKS.join(", ")} (USDC). Pay to ${PAY_TO}.

## More from this developer
${OTHERS.map((r) => `- [${r.name}](${r.url}/llms.txt): ${r.what}`).join("\n")}

## Machine-readable
- [x402 manifest](${o}/.well-known/x402)
- [OpenAPI](${o}/openapi.json)
- [agents.json](${o}/agents.json)
`);
});
app.get("/agents.json", (req, res) => {
  const o = origin(req);
  res.send({ name: SERVICE.name, description: SERVICE.summary, provider: MAKER, url: o,
    auth: { type: "x402", networks: NETWORKS, asset: "USDC", payTo: PAY_TO },
    capabilities: PRODUCTS.map((p) => ({ id: p.path.slice(1).replace(/\//g, "_"), description: p.description, method: "GET", url: `${o}${p.path}`, priceUsd: Number(p.price), tags: p.tags })),
    docs: { llms: `${o}/llms.txt`, openapi: `${o}/openapi.json`, x402: `${o}/.well-known/x402` }, related_services: OTHERS });
});
app.get("/icon.svg", (req, res) => res.type("image/svg+xml").send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0f2a2a"/><circle cx="32" cy="32" r="18" fill="none" stroke="#3ee0c0" stroke-width="4"/><circle cx="32" cy="32" r="6" fill="#3ee0c0"/></svg>`));
app.get("/robots.txt", (req, res) => res.type("text/plain").send(`User-agent: *\nAllow: /\n\n# Agents: start at ${origin(req)}/llms.txt\n`));

export default app;
if (!process.env.VERCEL) app.listen(4025, () => console.log("http://localhost:4025/"));
