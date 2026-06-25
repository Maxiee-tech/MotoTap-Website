import { normalizeVehicleList } from "./VehicleProfile.js";

export const UserRole = {
  DRIVER: "DRIVER",
  MECHANIC: "MECHANIC",
  PARTS_DEALER: "PARTS_DEALER",
};

export const ProfileStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/** Drivers are auto-approved; business accounts start pending admin review. */
export function defaultProfileStatusForRole(role) {
  const normalized = toFirestoreRole(role);
  if (normalized === UserRole.MECHANIC || normalized === UserRole.PARTS_DEALER) {
    return ProfileStatus.PENDING;
  }
  return ProfileStatus.APPROVED;
}

/** Map UI / legacy role values to Android-style uppercase Firestore roles. */
export function toFirestoreRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "mechanic") return UserRole.MECHANIC;
  if (value === "parts_dealer" || value === "parts dealer") return UserRole.PARTS_DEALER;
  return UserRole.DRIVER;
}

/** True when the user finished the 3-step onboarding wizard. Legacy accounts without onboarding fields pass through. */
export function isProfileOnboardingComplete(profile) {
  if (!profile) return false;
  if (profile.onboardingComplete === true) return true;
  if (profile.onboardingComplete === false) return false;
  return profile.onboardingStep === undefined;
}

export function createUserProfile(data = {}) {
  return {
    id: data.id || "",
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || data.phoneNumber || "",
    role: data.role || UserRole.DRIVER,
    profilePhotoUrl: data.profilePhotoUrl || "",
    idNumber: data.idNumber || "",
    idPhotoUrl: data.idPhotoUrl || "",
    status: data.status || defaultProfileStatusForRole(data.role),
    vehicleType: data.vehicleType || "",
    vehicleModel: data.vehicleModel || "",
    numberPlate: data.numberPlate || "",
    vehiclePhotoUrl: data.vehiclePhotoUrl || "",
    certificateNumber: data.certificateNumber || "",
    certificatePhotoUrl: data.certificatePhotoUrl || "",
    institutionName: data.institutionName || "",
    experienceYears: data.experienceYears || "",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    address: data.address || "",
    garagePhotos: Array.isArray(data.garagePhotos) ? data.garagePhotos : [],
    loyaltyPoints: Number(data.loyaltyPoints) || 0,
    redeemedRewards: Array.isArray(data.redeemedRewards) ? data.redeemedRewards : [],
    vehicles: normalizeVehicleList(data.vehicles),
    rating: Number(data.rating) || 0,
    reviewCount: Number(data.reviewCount) || 0,
    skills: Array.isArray(data.skills) ? data.skills : [],
    servicePrices:
      data.servicePrices && typeof data.servicePrices === "object" && !Array.isArray(data.servicePrices)
        ? data.servicePrices
        : {},
    parts: Array.isArray(data.parts) ? data.parts : [],
    partPrices:
      data.partPrices && typeof data.partPrices === "object" && !Array.isArray(data.partPrices)
        ? data.partPrices
        : {},
    onboardingStep: data.onboardingStep ?? null,
    onboardingComplete: data.onboardingComplete === true,
    isAdmin: data.isAdmin === true,
  };
}

export function mapFirestoreUserDoc(userId, data) {
  if (!data || typeof data !== "object") {
    return createUserProfile({ id: userId });
  }
  return createUserProfile({
    id: userId,
    name: data.name,
    email: data.email,
    phone: data.phone || data.phoneNumber,
    role: data.role,
    profilePhotoUrl: data.profilePhotoUrl,
    idNumber: data.idNumber,
    idPhotoUrl: data.idPhotoUrl,
    status: data.status,
    vehicleType: data.vehicleType,
    vehicleModel: data.vehicleModel,
    numberPlate: data.numberPlate,
    vehiclePhotoUrl: data.vehiclePhotoUrl,
    certificateNumber: data.certificateNumber,
    certificatePhotoUrl: data.certificatePhotoUrl,
    institutionName: data.institutionName,
    experienceYears: data.experienceYears,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address,
    garagePhotos: data.garagePhotos,
    loyaltyPoints: data.loyaltyPoints,
    redeemedRewards: data.redeemedRewards,
    vehicles: data.vehicles,
    rating: data.rating,
    reviewCount: data.reviewCount,
    skills: data.skills,
    servicePrices: data.servicePrices,
    parts: data.parts,
    partPrices: data.partPrices,
    onboardingStep: data.onboardingStep,
    onboardingComplete: data.onboardingComplete,
    isAdmin: data.isAdmin,
  });
}
