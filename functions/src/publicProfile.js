const MECHANIC_ROLES = new Set(["MECHANIC", "mechanic"]);

function toFirestoreRole(role) {
  const value = String(role || "").trim().toLowerCase();
  return value === "mechanic" ? "MECHANIC" : "DRIVER";
}

function isMechanicRole(role) {
  return MECHANIC_ROLES.has(String(role || "").trim());
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
    status: data.status || "PENDING",
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
    profile.latitude =
      typeof data.latitude === "number" && Number.isFinite(data.latitude) ? data.latitude : null;
    profile.longitude =
      typeof data.longitude === "number" && Number.isFinite(data.longitude) ? data.longitude : null;
    profile.address = String(data.address || "").trim().slice(0, 300);
    profile.garagePhotos = Array.isArray(data.garagePhotos) ? data.garagePhotos.slice(0, 5) : [];
    profile.rating = Number(data.rating) || 0;
    profile.reviewCount = Number(data.reviewCount) || 0;
  }

  return profile;
}

module.exports = { buildPublicProfileData };
