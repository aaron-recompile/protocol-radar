// Build-time check of route metadata (the data itself is read live and cannot be pre-validated).
import { PRODUCTS } from "../lib/products.js";
const errors = [];
const ascii = (s) => /^[\x20-\x7E]+$/.test(s);
const seen = new Set();
for (const p of PRODUCTS) {
  if (!/^\/[a-z0-9/-]+$/.test(p.path)) errors.push(`${p.path}: bad path`);
  if (seen.has(p.path)) errors.push(`${p.path}: duplicate`); seen.add(p.path);
  if (!p.description || p.description.length > 500) errors.push(`${p.path}: description must be 1-500 chars (${p.description?.length})`);
  if (!Array.isArray(p.tags) || p.tags.length < 1 || p.tags.length > 5 || !p.tags.every((t) => ascii(t) && t.length <= 32)) errors.push(`${p.path}: 1-5 ASCII tags <= 32 chars`);
  if (!(Number(p.price) > 0)) errors.push(`${p.path}: price`);
  if (typeof p.build !== "function") errors.push(`${p.path}: no build()`);
}
const name = "Protocol Radar - Aaron Zhang";
if (name.length > 32 || !ascii(name)) errors.push("serviceName too long or not ASCII");
if (errors.length) { console.error("✗ " + errors.join("\n✗ ")); process.exit(1); }
console.log(`✓ ${PRODUCTS.length} routes valid`);
