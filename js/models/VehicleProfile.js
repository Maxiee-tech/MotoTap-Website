/** @typedef {Object} VehicleProfile
 * @property {string} id
 * @property {string} make
 * @property {string} model
 * @property {string} year
 * @property {string} licensePlate
 * @property {string} mileage
 * @property {string} photoUrl
 */

export function createVehicleId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `vehicle_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** @param {Partial<VehicleProfile> & Record<string, unknown>} vehicle */
export function normalizeVehicle(vehicle = {}) {
  return {
    id: String(vehicle.id || "").trim() || createVehicleId(),
    make: String(vehicle.make || vehicle.vehicleType || "").trim(),
    model: String(vehicle.model || vehicle.vehicleModel || "").trim(),
    year: String(vehicle.year || "").trim(),
    licensePlate: String(vehicle.licensePlate || vehicle.numberPlate || "").trim(),
    mileage: String(vehicle.mileage || "").trim(),
    photoUrl: String(vehicle.photoUrl || vehicle.vehiclePhotoUrl || "").trim(),
  };
}

/** @param {unknown} vehicles */
export function normalizeVehicleList(vehicles) {
  if (!Array.isArray(vehicles)) return [];
  return vehicles
    .filter((item) => item && typeof item === "object")
    .map((item) => normalizeVehicle(item));
}

/** @param {Partial<VehicleProfile>} vehicle */
export function isVehicleMeaningful(vehicle) {
  if (!vehicle) return false;
  return Boolean(
    String(vehicle.make || "").trim() ||
      String(vehicle.model || "").trim() ||
      String(vehicle.licensePlate || "").trim() ||
      String(vehicle.mileage || "").trim() ||
      String(vehicle.year || "").trim() ||
      String(vehicle.photoUrl || "").trim()
  );
}

/** @param {object | null | undefined} profile */
function buildLegacyVehicle(profile) {
  const make = String(profile?.vehicleType || "").trim();
  const model = String(profile?.vehicleModel || "").trim();
  const plate = String(profile?.numberPlate || "").trim();
  const photoUrl = String(profile?.vehiclePhotoUrl || "").trim();

  if (!make && !model && !plate && !photoUrl) return null;

  return normalizeVehicle({
    make,
    model,
    licensePlate: plate,
    photoUrl,
  });
}

/** Merge sparse vehicle rows with legacy signup fields. */
export function mergeVehicleFields(primary, fallback) {
  if (!primary && !fallback) return null;
  if (!primary) return normalizeVehicle(fallback);
  if (!fallback) return normalizeVehicle(primary);

  const a = normalizeVehicle(primary);
  const b = normalizeVehicle(fallback);
  const id = String(a.id || b.id || "").trim();

  return {
    id: id || createVehicleId(),
    make: a.make || b.make,
    model: a.model || b.model,
    year: a.year || b.year,
    licensePlate: a.licensePlate || b.licensePlate,
    mileage: a.mileage || b.mileage,
    photoUrl: a.photoUrl || b.photoUrl,
  };
}

/** Active vehicle = vehicles[0], merged with legacy signup fields when needed. */
export function getActiveVehicle(profile) {
  const legacy = buildLegacyVehicle(profile);
  const vehicles = normalizeVehicleList(profile?.vehicles).filter(isVehicleMeaningful);

  if (vehicles.length) {
    return mergeVehicleFields(vehicles[0], legacy);
  }

  return legacy;
}

/** Build vehicles[] from Firestore + legacy signup fields. */
export function ensureVehiclesArray(profile) {
  const legacy = buildLegacyVehicle(profile);
  const vehicles = normalizeVehicleList(profile?.vehicles).filter(isVehicleMeaningful);

  if (!vehicles.length) {
    return legacy ? [legacy] : [];
  }

  if (legacy) {
    return [mergeVehicleFields(vehicles[0], legacy), ...vehicles.slice(1)];
  }

  return vehicles;
}

/** @param {VehicleProfile} vehicle */
export function vehicleDisplayName(vehicle) {
  const make = String(vehicle?.make || "").trim();
  const model = String(vehicle?.model || "").trim();
  if (make && model) return `${make}: ${model}`;
  return make || model || "Unnamed vehicle";
}

/** @param {VehicleProfile[]} vehicles */
export function vehiclesForFirestore(vehicles) {
  return normalizeVehicleList(vehicles)
    .filter(isVehicleMeaningful)
    .map((vehicle) => ({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.licensePlate,
      mileage: vehicle.mileage,
      photoUrl: vehicle.photoUrl || "",
    }));
}
