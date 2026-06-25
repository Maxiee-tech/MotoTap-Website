import { parsePriceInput } from "./mechanicServicePrices.js";

/** Normalize Firestore `partPrices` map (part name → KSh amount). */
export function normalizePartPrices(raw) {
  if (!raw || typeof raw !== "object") return {};

  if (Array.isArray(raw)) {
    const out = {};
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const name = String(entry.partName || entry.name || entry.part || "").trim();
      const price = parsePriceInput(entry.price ?? entry.amount ?? entry.value);
      if (name && price != null) {
        out[name] = price;
      }
    }
    return out;
  }

  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const name = String(key || "").trim();
    const price =
      typeof value === "number" && Number.isFinite(value)
        ? Math.round(value)
        : parsePriceInput(value);
    if (name && price != null) {
      out[name] = price;
    }
  }
  return out;
}

export function getPartsDealerPartPrice(dealer, partName) {
  const target = String(partName || "").trim();
  if (!target) return null;

  const prices = normalizePartPrices(dealer?.partPrices);
  if (Object.prototype.hasOwnProperty.call(prices, target)) {
    return prices[target];
  }

  const targetLower = target.toLowerCase();
  for (const [name, price] of Object.entries(prices)) {
    if (name.toLowerCase() === targetLower) return price;
  }
  return null;
}

export function buildPartPricesPayload(selectedParts, pricesByName = {}) {
  const out = {};
  selectedParts.forEach((part) => {
    const name = String(part || "").trim();
    if (!name) return;
    const raw = pricesByName[name];
    const price =
      typeof raw === "number" && Number.isFinite(raw)
        ? Math.round(raw)
        : parsePriceInput(raw);
    if (price != null) {
      out[name] = price;
    }
  });
  return out;
}
