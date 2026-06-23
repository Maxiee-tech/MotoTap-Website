/** Normalize Firestore `servicePrices` map (service name → KSh amount). */
export function normalizeServicePrices(raw) {
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
    const price = Number(pricesByName[name]);
    if (Number.isFinite(price) && price >= 0) {
      out[name] = Math.round(price);
    }
  });
  return out;
}
