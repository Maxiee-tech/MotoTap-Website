/**
 * Upload validation rules — keep in sync with js/utils/uploadValidation.js (client).
 * Server is authoritative for MIME, size, extension, role, and ownership.
 */

const uploadRules = {
  profile_photos: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxSize: 5 * 1024 * 1024,
  },
  signup_documents: {
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"],
    allowedFormats: ["jpg", "jpeg", "png", "pdf"],
    maxSize: 10 * 1024 * 1024,
  },
  vehicles: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxSize: 8 * 1024 * 1024,
  },
  user_uploads: {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf", ".docx"],
    allowedFormats: ["jpg", "jpeg", "png", "pdf", "docx"],
    maxSize: 15 * 1024 * 1024,
  },
};

const folderToPreset = {
  profile: "profile_photos",
  id_front: "signup_documents",
  vehicle: "vehicles",
  certificate: "signup_documents",
  garage: "signup_documents",
};

const folderRoleAccess = {
  profile: ["driver", "mechanic", "parts_dealer"],
  id_front: ["driver", "mechanic", "parts_dealer"],
  vehicle: ["driver"],
  certificate: ["mechanic", "parts_dealer"],
  garage: ["mechanic", "parts_dealer"],
};

const FOLDER_PATHS = {
  profile: (uid) => `firebase-backend/profile_photos/${uid}`,
  id_front: (uid) => `firebase-backend/signup_documents/${uid}/id_front`,
  vehicle: (uid) => `firebase-backend/vehicles/${uid}`,
  certificate: (uid) => `firebase-backend/signup_documents/${uid}/certificate`,
  garage: (uid) => `firebase-backend/signup_documents/${uid}/garage`,
};

function normalizeUserRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "mechanic") return "mechanic";
  if (value === "parts_dealer" || value === "parts dealer") return "parts_dealer";
  return "driver";
}

function getFileExtension(fileName) {
  const name = String(fileName || "").trim().toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "";
  return name.slice(dot);
}

function validateUploadMetadata({ fileName, mimeType, fileSize, preset }) {
  const rules = uploadRules[preset];
  if (!rules) {
    return { valid: false, message: "Invalid upload preset." };
  }

  const normalizedMime = String(mimeType || "").trim().toLowerCase();
  if (!normalizedMime || !rules.allowedMimeTypes.includes(normalizedMime)) {
    return { valid: false, message: "Invalid file type." };
  }

  const extension = getFileExtension(fileName);
  if (!extension || !rules.allowedExtensions.includes(extension)) {
    return { valid: false, message: "Invalid file extension." };
  }

  const size = Number(fileSize);
  if (!Number.isFinite(size) || size <= 0) {
    return { valid: false, message: "Invalid file size." };
  }
  if (size > rules.maxSize) {
    return {
      valid: false,
      message: `File size exceeds ${rules.maxSize / (1024 * 1024)} MB limit.`,
    };
  }

  return { valid: true, rules };
}

function validateUploadRole(folder, role) {
  const allowed = folderRoleAccess[folder];
  if (!allowed) {
    return { valid: false, message: "Invalid upload folder." };
  }
  const normalized = normalizeUserRole(role);
  if (!allowed.includes(normalized)) {
    return { valid: false, message: "Your account role cannot upload this file type." };
  }
  return { valid: true };
}

function getCloudinaryResourceType(preset) {
  if (preset === "signup_documents" || preset === "user_uploads") {
    return "auto";
  }
  return "image";
}

function validateServerUploadRequest({ folder, fileName, mimeType, fileSize, uid, role }) {
  if (!uid) {
    return { valid: false, message: "Missing user id." };
  }
  if (!folder || !folderToPreset[folder]) {
    return { valid: false, message: "Invalid upload folder." };
  }

  const preset = folderToPreset[folder];
  const fileResult = validateUploadMetadata({ fileName, mimeType, fileSize, preset });
  if (!fileResult.valid) {
    return fileResult;
  }

  const roleResult = validateUploadRole(folder, role);
  if (!roleResult.valid) {
    return roleResult;
  }

  return {
    valid: true,
    preset,
    folderPath: FOLDER_PATHS[folder](uid),
    resourceType: getCloudinaryResourceType(preset),
    allowedFormats: fileResult.rules.allowedFormats.join(","),
    maxBytes: fileResult.rules.maxSize,
  };
}

module.exports = {
  uploadRules,
  folderToPreset,
  validateServerUploadRequest,
  normalizeUserRole,
};
