import { normalizeUserRole } from "./geo.js";

/** Validation rules for each Cloudinary upload category. */
export const uploadRules = {
  profile_photos: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxSize: 5 * 1024 * 1024,
  },
  signup_documents: {
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"],
    maxSize: 10 * 1024 * 1024,
  },
  vehicles: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
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
    maxSize: 15 * 1024 * 1024,
  },
};

/** Sign-up / profile folder keys → upload preset category. */
export const folderToPreset = {
  profile: "profile_photos",
  id_front: "signup_documents",
  vehicle: "vehicles",
  certificate: "signup_documents",
  garage: "signup_documents",
};

/** Which roles may upload to each folder during sign-up / profile updates. */
export const folderRoleAccess = {
  profile: ["driver", "mechanic"],
  id_front: ["driver", "mechanic"],
  vehicle: ["driver"],
  certificate: ["mechanic"],
  garage: ["mechanic"],
};

export function getFileExtension(fileName) {
  const name = String(fileName || "").trim().toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "";
  return name.slice(dot);
}

/**
 * Core file validation: preset rules, MIME type, size, and extension.
 * @param {File|Blob} file - Browser File (uses file.type, not mimetype).
 * @param {keyof typeof uploadRules} preset
 */
export function validateUpload(file, preset) {
  const rules = uploadRules[preset];
  if (!rules) {
    return { valid: false, message: "Invalid upload preset." };
  }
  if (!file) {
    return { valid: false, message: "No file selected." };
  }

  const mimeType = String(file.type || "").trim().toLowerCase();
  if (!mimeType || !rules.allowedMimeTypes.includes(mimeType)) {
    return { valid: false, message: "Invalid file type." };
  }

  const extension = getFileExtension(file.name);
  if (!extension || !rules.allowedExtensions.includes(extension)) {
    return { valid: false, message: "Invalid file extension." };
  }

  if (file.size > rules.maxSize) {
    return {
      valid: false,
      message: `File size exceeds ${rules.maxSize / (1024 * 1024)} MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Ensure the signed-in Firebase user owns the target upload path.
 * @param {{ userId: string, authUser?: import("firebase/auth").User | null }} params
 */
export function validateUploadOwnership({ userId, authUser }) {
  if (!userId) {
    return { valid: false, message: "Missing user id for upload." };
  }
  if (!authUser?.uid) {
    return { valid: false, message: "You must be signed in to upload files." };
  }
  if (authUser.uid !== userId) {
    return { valid: false, message: "You can only upload to your own account." };
  }
  return { valid: true };
}

/**
 * Verify Firebase session is still valid (ID token refreshable).
 * @param {import("firebase/auth").User | null | undefined} authUser
 */
export async function validateAuthToken(authUser) {
  if (!authUser?.uid) {
    return { valid: false, message: "You must be signed in to upload files." };
  }
  try {
    await authUser.getIdToken(false);
    return { valid: true };
  } catch {
    return { valid: false, message: "Session expired. Please sign in again." };
  }
}

/**
 * Role gate — e.g. only drivers upload vehicle photos.
 * @param {string} folder - profile | id_front | vehicle | certificate | garage
 * @param {string} role - driver | mechanic | DRIVER | MECHANIC
 */
export function validateUploadRole(folder, role) {
  const allowed = folderRoleAccess[folder];
  if (!allowed) {
    return { valid: false, message: "Invalid upload folder." };
  }
  const normalized = normalizeUserRole(role);
  if (!allowed.includes(normalized)) {
    return {
      valid: false,
      message: `Your account role cannot upload this file type.`,
    };
  }
  return { valid: true };
}

/**
 * Full client-side upload validation pipeline.
 * @param {{
 *   file: File | null | undefined,
 *   folder: keyof typeof folderToPreset,
 *   userId: string,
 *   role: string,
 *   authUser?: import("firebase/auth").User | null,
 *   label?: string,
 *   requireAuthToken?: boolean,
 * }} params
 */
export async function validateUploadRequest({
  file,
  folder,
  userId,
  role,
  authUser,
  label = "File",
  requireAuthToken = true,
}) {
  if (!file) {
    return { valid: false, message: `${label} is required.` };
  }

  const preset = folderToPreset[folder];
  if (!preset) {
    return { valid: false, message: "Invalid upload folder." };
  }

  const fileResult = validateUpload(file, preset);
  if (!fileResult.valid) {
    return { valid: false, message: `${label}: ${fileResult.message}` };
  }

  const roleResult = validateUploadRole(folder, role);
  if (!roleResult.valid) {
    return roleResult;
  }

  const ownershipResult = validateUploadOwnership({ userId, authUser });
  if (!ownershipResult.valid) {
    return ownershipResult;
  }

  if (requireAuthToken) {
    const tokenResult = await validateAuthToken(authUser);
    if (!tokenResult.valid) {
      return tokenResult;
    }
  }

  return { valid: true, preset };
}

/** Cloudinary resource_type for each preset (PDF/DOCX need auto/raw). */
export function getCloudinaryResourceType(preset) {
  if (preset === "signup_documents" || preset === "user_uploads") {
    return "auto";
  }
  return "image";
}

export function getPresetForFolder(folder) {
  return folderToPreset[folder] || null;
}

/** Cloudinary storage paths — keep in sync with functions/src/uploadValidation.js */
export const folderPaths = {
  profile: (uid) => `firebase-backend/profile_photos/${uid}`,
  id_front: (uid) => `firebase-backend/signup_documents/${uid}/id_front`,
  vehicle: (uid) => `firebase-backend/vehicles/${uid}`,
  certificate: (uid) => `firebase-backend/signup_documents/${uid}/certificate`,
  garage: (uid) => `firebase-backend/signup_documents/${uid}/garage`,
};

export function getFolderPath(uid, folder) {
  const build = folderPaths[folder];
  return build ? build(uid) : "";
}

export function getAllowedFormatsForCategory(category) {
  const rules = uploadRules[category];
  if (!rules?.allowedFormats) return "";
  return rules.allowedFormats.join(",");
}
