import { UserRole, toFirestoreRole, defaultProfileStatusForRole, ProfileStatus } from "../models/UserProfile.js";
import { isBusinessRole, isPartsDealerRole } from "./geo.js";

export const PUBLIC_PROFILES_COLLECTION = "publicProfiles";

const MECHANIC_ROLES = new Set([UserRole.MECHANIC, "mechanic", "MECHANIC"]);

function isMechanicRole(role) {
  return MECHANIC_ROLES.has(String(role || "").trim());
}

/**
 * Build a Firestore-safe public profile from a full user profile or partial update.
 * Excludes PII: email, phone, idNumber, idPhotoUrl, certificateNumber, vehicles, etc.
 *
 * @param {object} profile
 * @param {{ forCreate?: boolean }} options - Spark plan: client writes publicProfiles directly.
 */
export function buildPublicProfileData(profile = {}, { forCreate = false } = {}) {
  const userId = String(profile.id || profile.uid || "").trim();
  const role = toFirestoreRole(profile.role);
  const data = {
    userId,
    name: String(profile.name || "").trim().slice(0, 120),
    profilePhotoUrl: String(profile.profilePhotoUrl || "").trim().slice(0, 2048),
    role,
    updatedAtMillis: Date.now(),
  };

  if (forCreate) {
    data.status = defaultProfileStatusForRole(role);
    data.rating = 0;
    data.reviewCount = 0;
  } else if (!isBusinessRole(role)) {
    data.status = ProfileStatus.APPROVED;
  }

  if (isMechanicRole(role)) {
    data.skills = Array.isArray(profile.skills) ? profile.skills.slice(0, 50) : [];
    data.availableServices = Array.isArray(profile.availableServices)
      ? profile.availableServices.slice(0, 50)
      : data.skills;
    data.servicePrices =
      profile.servicePrices &&
      typeof profile.servicePrices === "object" &&
      !Array.isArray(profile.servicePrices)
        ? profile.servicePrices
        : {};
  }

  if (isPartsDealerRole(profile.role)) {
    data.parts = Array.isArray(profile.parts) ? profile.parts.slice(0, 80) : [];
    data.availableParts = Array.isArray(profile.availableParts)
      ? profile.availableParts.slice(0, 80)
      : data.parts;
    data.partPrices =
      profile.partPrices &&
      typeof profile.partPrices === "object" &&
      !Array.isArray(profile.partPrices)
        ? profile.partPrices
        : {};
  }

  if (isBusinessRole(profile.role)) {
    data.latitude =
      typeof profile.latitude === "number" && Number.isFinite(profile.latitude)
        ? profile.latitude
        : null;
    data.longitude =
      typeof profile.longitude === "number" && Number.isFinite(profile.longitude)
        ? profile.longitude
        : null;
    data.address = String(profile.address || "").trim().slice(0, 300);
    data.garagePhotos = Array.isArray(profile.garagePhotos)
      ? profile.garagePhotos.slice(0, 5)
      : [];
  }

  return data;
}
