// Free shields.io endpoint: how the Aaron Zhang x402 services show up in the Coinbase x402 Bazaar.
// Live from the public Bazaar search API, cached 6h.
import { cached } from "./sources.js";
const API = "https://api.cdp.coinbase.com/platform/v2/x402/discovery";
const MINE = ["preipo-feed.vercel.app", "btc-radar.vercel.app", "aaron-protocol-radar.vercel.app", "aaron-zhang-mcp.vercel.app"];
export const NICHES = ["Anthropic IPO", "Anthropic revenue", "Anthropic valuation", "OpenAI IPO", "OpenAI valuation", "OpenAI revenue", "pre-IPO",
  "AI IPO pipeline", "public company exposure to OpenAI", "AI lab funding rounds", "bitcoin protocol changes", "BIP status",
  "bitcoin core release version", "lightning implementation release", "bitcoin improvement proposals", "Ethereum client release",
  "EIP status", "AI agent framework release", "x402 protocol updates", "agent payments protocol"];
const search = async (q) => (await (await fetch(`${API}/search?limit=20&query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(15_000) })).json()).resources || [];
export const bazaarStanding = () => cached("badge", async () => {
  const listed = new Set((await search("Aaron Zhang")).map((r) => r.resource).filter((u) => MINE.some((m) => u.includes(m))));
  let firsts = 0;
  const ranks = {};
  for (const q of NICHES) {
    const rs = await search(q);
    const i = rs.findIndex((r) => MINE.some((m) => (r.resource || "").includes(m)));
    ranks[q] = i >= 0 ? i + 1 : null;
    if (i === 0) firsts++;
  }
  return { listed: listed.size, firsts, niches: NICHES.length, ranks, checked_at: new Date().toISOString() };
});
