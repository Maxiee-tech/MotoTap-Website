/** Default price key inside a per-service vehicle price map. */
export const DEFAULT_PRICE_KEY = "_default";

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

function isVehiclePriceMap(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function lookupCaseInsensitive(map, target) {
  const key = String(target || "").trim();
  if (!key || !map || typeof map !== "object") return undefined;

  if (Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key];
  }

  const keyLower = key.toLowerCase();
  for (const [name, value] of Object.entries(map)) {
    if (name.toLowerCase() === keyLower) return value;
  }
  return undefined;
}

function normalizeVehiclePriceMap(raw) {
  if (!isVehiclePriceMap(raw)) return {};

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

/** Build a vehicle price map key from make and optional model. */
export function buildVehiclePriceKey(make, model) {
  const makeStr = String(make || "").trim();
  const modelStr = String(model || "").trim();
  if (makeStr && modelStr) return `${makeStr}:${modelStr}`;
  return makeStr;
}

/** Default (flat) price for a stored service price entry. */
export function getDefaultServicePrice(entry) {
  if (entry == null) return null;
  if (typeof entry === "number") return entry;

  if (isVehiclePriceMap(entry)) {
    const directDefault = coercePriceValue(entry[DEFAULT_PRICE_KEY] ?? entry.default);
    if (directDefault != null) return directDefault;
  }

  return coercePriceValue(entry);
}

/** Vehicle-specific overrides from a stored service price entry. */
export function getVehiclePriceOverrides(entry) {
  if (!isVehiclePriceMap(entry)) return [];

  const overrides = [];
  for (const [key, value] of Object.entries(entry)) {
    if (key === DEFAULT_PRICE_KEY || key === "default") continue;
    const price = coercePriceValue(value);
    if (price == null) continue;

    const separator = key.indexOf(":");
    const make = separator >= 0 ? key.slice(0, separator).trim() : key.trim();
    const model = separator >= 0 ? key.slice(separator + 1).trim() : "";
    if (!make) continue;

    overrides.push({ make, model, price });
  }
  return overrides;
}

/** Convert a stored entry to mechanic form state. */
export function toFormPriceEntry(entry) {
  return {
    default: getDefaultServicePrice(entry),
    overrides: getVehiclePriceOverrides(entry),
  };
}

/**
 * Normalize Firestore `servicePrices`.
 * Values may be a flat KSh amount or a vehicle-keyed map with `_default`.
 */
export function normalizeServicePrices(raw) {
  if (!raw || typeof raw !== "object") return {};

  if (Array.isArray(raw)) {
    const out = {};
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const name = String(
        entry.serviceName || entry.name || entry.skill || entry.service || ""
      ).trim();
      if (!name) continue;

      const defaultPrice = coercePriceValue(entry.price ?? entry.amount ?? entry.value);
      const overrides = Array.isArray(entry.overrides) ? entry.overrides : [];
      const stored = buildStoredPriceEntry({ default: defaultPrice, overrides });
      if (stored != null) {
        out[name] = stored;
      }
    }
    return out;
  }

  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const name = String(key || "").trim();
    if (!name) continue;

    if (typeof value === "number" || typeof value === "string") {
      const price = coercePriceValue(value);
      if (price != null) out[name] = price;
      continue;
    }

    if (isVehiclePriceMap(value)) {
      const normalized = normalizeVehiclePriceMap(value);
      if (Object.keys(normalized).length) {
        out[name] = normalized;
      }
    }
  }
  return out;
}

function lookupServicePriceEntry(servicePrices, serviceName) {
  const prices = normalizeServicePrices(servicePrices);
  return lookupCaseInsensitive(prices, serviceName);
}

function resolveVehiclePrice(entry, vehicle) {
  if (!isVehiclePriceMap(entry)) {
    return getDefaultServicePrice(entry);
  }

  const make = String(vehicle?.make || "").trim();
  const model = String(vehicle?.model || "").trim();

  if (make && model) {
    const makeModelPrice = coercePriceValue(
      lookupCaseInsensitive(entry, buildVehiclePriceKey(make, model))
    );
    if (makeModelPrice != null) return makeModelPrice;
  }

  if (make) {
    const makePrice = coercePriceValue(lookupCaseInsensitive(entry, make));
    if (makePrice != null) return makePrice;
  }

  return getDefaultServicePrice(entry);
}

/**
 * Resolve a mechanic's listed price for a service.
 * Prefers the mechanic's own price; falls back to garage prices on `garageServicePrices`.
 * When `vehicle` is provided, prefers make+model, then make, then `_default` (legacy flat).
 */
export function getMechanicServicePrice(mechanic, serviceName, vehicle = null) {
  const personalEntry = lookupServicePriceEntry(mechanic?.servicePrices, serviceName);
  if (personalEntry != null) {
    return vehicle ? resolveVehiclePrice(personalEntry, vehicle) : getDefaultServicePrice(personalEntry);
  }

  const garageEntry = lookupServicePriceEntry(mechanic?.garageServicePrices, serviceName);
  if (garageEntry == null) return null;

  return vehicle ? resolveVehiclePrice(garageEntry, vehicle) : getDefaultServicePrice(garageEntry);
}

export function formatKsh(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return "0";
  return Math.round(value).toLocaleString("en-KE");
}

function buildStoredPriceEntry(raw) {
  if (raw == null) return null;

  if (typeof raw === "number" || typeof raw === "string") {
    return coercePriceValue(raw);
  }

  if (!isVehiclePriceMap(raw)) return null;

  if ("default" in raw || "overrides" in raw) {
    const defaultPrice = coercePriceValue(raw.default);
    const overrides = Array.isArray(raw.overrides) ? raw.overrides : [];
    const hasOverrides = overrides.some((override) => {
      if (!override) return false;
      const make = String(override.make || "").trim();
      const price = coercePriceValue(override.price);
      return Boolean(make && price != null);
    });

    if (!hasOverrides) {
      return defaultPrice;
    }

    const map = {};
    if (defaultPrice != null) {
      map[DEFAULT_PRICE_KEY] = defaultPrice;
    }

    overrides.forEach((override) => {
      if (!override) return;
      const make = String(override.make || "").trim();
      const model = String(override.model || "").trim();
      const price = coercePriceValue(override.price);
      if (!make || price == null) return;
      map[buildVehiclePriceKey(make, model)] = price;
    });

    return Object.keys(map).length ? map : null;
  }

  const normalized = normalizeVehiclePriceMap(raw);
  return Object.keys(normalized).length ? normalized : null;
}

/** Keep only prices for selected skills; omit unset or invalid values. */
export function buildServicePricesPayload(selectedSkills, pricesByName = {}) {
  const out = {};
  selectedSkills.forEach((skill) => {
    const name = String(skill || "").trim();
    if (!name) return;
    const entry = buildStoredPriceEntry(pricesByName[name]);
    if (entry != null) {
      out[name] = entry;
    }
  });
  return out;
}
