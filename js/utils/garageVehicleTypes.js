import { VEHICLE_CATEGORIES } from "../vehicleCatalogData.js";

const KNOWN_CATEGORY_IDS = new Set(VEHICLE_CATEGORIES.map((category) => category.id));

/** @param {unknown} raw */
export function normalizeVehicleTypes(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  raw.forEach((value) => {
    const id = String(value || "").trim();
    if (!id || !KNOWN_CATEGORY_IDS.has(id) || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  });
  return out;
}

/** Category IDs whose catalog includes this make (and model, when provided). */
export function getCategoryIdsForVehicle(make, model) {
  const makeKey = String(make || "").trim().toLowerCase();
  if (!makeKey) return [];

  const modelKey = String(model || "").trim().toLowerCase();
  const ids = [];

  VEHICLE_CATEGORIES.forEach((category) => {
    const matchesMake = category.makes.some((entry) => {
      if (String(entry.name || "").trim().toLowerCase() !== makeKey) return false;
      if (!modelKey) return true;
      return entry.models.some((name) => String(name || "").trim().toLowerCase() === modelKey);
    });
    if (matchesMake) ids.push(category.id);
  });

  return ids;
}

/**
 * Whether a garage’s selected types cover this vehicle.
 * Empty `vehicleTypes` (unset) or missing vehicle details stay compatible with all garages.
 */
export function garageServicesVehicle(vehicleTypes, vehicle) {
  const selected = normalizeVehicleTypes(vehicleTypes);
  if (!selected.length) return true;

  const make = vehicle?.make || vehicle?.vehicleType || "";
  const model = vehicle?.model || vehicle?.vehicleModel || "";
  if (!String(make || "").trim()) return true;

  const categoryIds = getCategoryIdsForVehicle(make, model);
  if (!categoryIds.length) return true;

  const selectedSet = new Set(selected);
  return categoryIds.some((id) => selectedSet.has(id));
}
