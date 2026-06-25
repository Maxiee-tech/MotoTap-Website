/** Parse a price field value; empty input is null (not zero). Strips commas (e.g. 5,000). */
export function parsePriceInput(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/,/g, "");
  if (!cleaned) return null;
  const price = Number(cleaned);
  if (!Number.isFinite(price) || price < 0) return null;
  return Math.round(price);
}

function coercePriceValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? Math.round(value) : null;
  }
  if (typeof value === "string") {
    return parsePriceInput(value);
  }
  return null;
}

/** Normalize Firestore `servicePrices` map (service name → KSh amount). */
export function normalizeServicePrices(raw) {
  if (!raw || typeof raw !== "object") return {};

  if (Array.isArray(raw)) {
    const out = {};
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const name = String(
        entry.serviceName || entry.name || entry.skill || entry.service || ""
      ).trim();
      const price = coercePriceValue(entry.price ?? entry.amount ?? entry.value);
      if (name && price != null) {
        out[name] = price;
      }
    }
    return out;
  }

  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const name = String(key || "").trim();
    const price = coercePriceValue(value);
    if (name && price != null) {
      out[name] = price;
    }
  }
  return out;
}

/** Case-insensitive lookup of a mechanic's listed price for a service. */
export function getMechanicServicePrice(mechanic, serviceName) {
  const target = String(serviceName || "").trim();
  if (!target) return null;

  const prices = normalizeServicePrices(mechanic?.servicePrices);
  if (Object.prototype.hasOwnProperty.call(prices, target)) {
    return prices[target];
  }

  const targetLower = target.toLowerCase();
  for (const [name, price] of Object.entries(prices)) {
    if (name.toLowerCase() === targetLower) return price;
  }
  return null;
}

export function formatKsh(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return "0";
  return Math.round(value).toLocaleString("en-KE");
}

/** Keep only prices for selected skills; omit unset or invalid values. */
export function buildServicePricesPayload(selectedSkills, pricesByName = {}) {
  const out = {};
  selectedSkills.forEach((skill) => {
    const name = String(skill || "").trim();
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
