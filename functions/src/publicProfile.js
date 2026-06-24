const MECHANIC_ROLES = new Set(["MECHANIC", "mechanic"]);
const PARTS_DEALER_ROLES = new Set(["PARTS_DEALER", "parts_dealer"]);
const BUSINESS_ROLES = new Set([...MECHANIC_ROLES, ...PARTS_DEALER_ROLES]);

function toFirestoreRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "mechanic") return "MECHANIC";
  if (value === "parts_dealer" || value === "parts dealer") return "PARTS_DEALER";
  return "DRIVER";
}

function isMechanicRole(role) {
  return MECHANIC_ROLES.has(String(role || "").trim());
}

function isPartsDealerRole(role) {
  return PARTS_DEALER_ROLES.has(String(role || "").trim());
}

function isBusinessRole(role) {
  return BUSINESS_ROLES.has(String(role || "").trim());
}

function defaultProfileStatusForRole(role) {
  const normalized = toFirestoreRole(role);
  if (normalized === "MECHANIC" || normalized === "PARTS_DEALER") {
    return "PENDING";
  }
  return "APPROVED";
}

/**
 * Strip PII from a users/{uid} document for publicProfiles/{uid}.
 */
function buildPublicProfileData(userId, data = {}) {
  const role = toFirestoreRole(data.role);
  const profile = {
    userId,
    name: String(data.name || "").trim().slice(0, 120),
    profilePhotoUrl: String(data.profilePhotoUrl || "").trim().slice(0, 2048),
    role,
    status: data.status || defaultProfileStatusForRole(role),
    updatedAtMillis: Date.now(),
  };

  if (isMechanicRole(role)) {
    profile.skills = Array.isArray(data.skills) ? data.skills.slice(0, 50) : [];
    profile.availableServices = Array.isArray(data.availableServices)
      ? data.availableServices.slice(0, 50)
      : profile.skills;
    profile.servicePrices =
      data.servicePrices && typeof data.servicePrices === "object" && !Array.isArray(data.servicePrices)
        ? data.servicePrices
        : {};
    profile.rating = Number(data.rating) || 0;
    profile.reviewCount = Number(data.reviewCount) || 0;
  }

  if (isPartsDealerRole(role)) {
    profile.parts = Array.isArray(data.parts) ? data.parts.slice(0, 80) : [];
    profile.availableParts = Array.isArray(data.availableParts)
      ? data.availableParts.slice(0, 80)
      : profile.parts;
    profile.partPrices =
      data.partPrices && typeof data.partPrices === "object" && !Array.isArray(data.partPrices)
        ? data.partPrices
        : {};
    profile.rating = Number(data.rating) || 0;
    profile.reviewCount = Number(data.reviewCount) || 0;
  }

  if (isBusinessRole(role)) {
    profile.latitude =
      typeof data.latitude === "number" && Number.isFinite(data.latitude) ? data.latitude : null;
    profile.longitude =
      typeof data.longitude === "number" && Number.isFinite(data.longitude) ? data.longitude : null;
    profile.address = String(data.address || "").trim().slice(0, 300);
    profile.garagePhotos = Array.isArray(data.garagePhotos) ? data.garagePhotos.slice(0, 5) : [];
  }

  return profile;
}

module.exports = { buildPublicProfileData };
