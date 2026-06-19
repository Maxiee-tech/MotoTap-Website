import { folderToPreset, validateUpload } from "./uploadValidation.js";

/** Full name must contain at least two non-empty name parts. */
export function validateFullName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "Full name is required.";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return "Please enter at least two names (first and last).";
  }
  if (trimmed.length > 120) return "Name is too long.";
  return "";
}

export function validateEmail(email) {
  const trimmed = String(email || "").trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Please enter a valid email address.";
  }
  return "";
}

export function validatePhone(phone) {
  const trimmed = String(phone || "").trim();
  if (!trimmed) return "Phone number is required.";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    return "Please enter a valid phone number.";
  }
  return "";
}

export function validateRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value !== "driver" && value !== "mechanic") {
    return "Please select Driver or Mechanic.";
  }
  return "";
}

export function validateSignupFile(folder, file, label = "Photo") {
  if (!file) return `${label} is required.`;
  const preset = folderToPreset[folder];
  if (!preset) return `${label}: invalid upload type.`;
  const result = validateUpload(file, preset);
  if (!result.valid) return `${label}: ${result.message}`;
  return "";
}

/** @deprecated Use validateSignupFile(folder, file, label) */
export function validateImageFile(file, label = "Photo") {
  return validateSignupFile("profile", file, label);
}

export function validateIdNumber(idNumber, role) {
  const trimmed = String(idNumber || "").trim();
  if (!trimmed) {
    const label =
      String(role || "").toLowerCase() === "mechanic"
        ? "Mechanic certification number"
        : "Driving license number";
    return `${label} is required.`;
  }
  if (trimmed.length > 64) return "ID number is too long.";
  return "";
}

export function validateDriverStep3({ vehicleType, vehicleModel, numberPlate, vehiclePhotoFile }) {
  if (!String(vehicleType || "").trim()) return "Vehicle type is required.";
  if (!String(vehicleModel || "").trim()) return "Vehicle model is required.";
  if (!String(numberPlate || "").trim()) return "Number plate is required.";
  return validateSignupFile("vehicle", vehiclePhotoFile, "Vehicle photo");
}

export function validateMechanicStep3({
  institutionName,
  experienceYears,
  certificatePhotoFile,
  garagePhotoFile,
  latitude,
  longitude,
  address,
}) {
  if (!String(institutionName || "").trim()) return "Institution name is required.";
  if (!String(experienceYears || "").trim()) return "Experience years is required.";
  const certErr = validateSignupFile("certificate", certificatePhotoFile, "Certification photo");
  if (certErr) return certErr;
  const garageErr = validateSignupFile("garage", garagePhotoFile, "Garage front photo");
  if (garageErr) return garageErr;
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return "Please pin your garage location on the map.";
  }
  if (!String(address || "").trim()) return "Garage address is required.";
  return "";
}
