import { normalizeVehicleList } from "./VehicleProfile.js";

export const UserRole = {
  DRIVER: "DRIVER",
  MECHANIC: "MECHANIC",
};

export const ProfileStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/** Map UI / legacy role values to Android-style uppercase Firestore roles. */
export function toFirestoreRole(role) {
  const value = String(role || "").trim().toLowerCase();
  return value === "mechanic" ? UserRole.MECHANIC : UserRole.DRIVER;
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
    status: data.status || ProfileStatus.PENDING,
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
    vehicles: normalizeVehicleList(data.vehicles),
    rating: Number(data.rating) || 0,
    reviewCount: Number(data.reviewCount) || 0,
    skills: Array.isArray(data.skills) ? data.skills : [],
    servicePrices:
      data.servicePrices && typeof data.servicePrices === "object" && !Array.isArray(data.servicePrices)
        ? data.servicePrices
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
    vehicles: data.vehicles,
    rating: data.rating,
    reviewCount: data.reviewCount,
    skills: data.skills,
    servicePrices: data.servicePrices,
    onboardingStep: data.onboardingStep,
    onboardingComplete: data.onboardingComplete,
    isAdmin: data.isAdmin,
  });
}
