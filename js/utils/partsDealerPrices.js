/** Normalize Firestore `partPrices` map (part name → KSh amount). */
export function normalizePartPrices(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const name = String(key || "").trim();
    const price = Number(value);
    if (name && Number.isFinite(price) && price >= 0) {
      out[name] = Math.round(price);
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
    const price = Number(pricesByName[name]);
    if (Number.isFinite(price) && price >= 0) {
      out[name] = Math.round(price);
    }
  });
  return out;
}
