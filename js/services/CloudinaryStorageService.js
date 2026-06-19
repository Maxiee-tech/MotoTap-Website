import { getFunctions, httpsCallable } from "firebase/functions";
import app, { auth } from "../../firebase.js";
import {
  getCloudinaryUploadMode,
  getCloudinaryConfig,
  getCloudinaryPresetForCategory,
} from "../appConfig.js";
import {
  getAllowedFormatsForCategory,
  getCloudinaryResourceType,
  getFolderPath,
  getPresetForFolder,
  validateUploadRequest,
} from "../utils/uploadValidation.js";

const ALLOWED_FOLDERS = new Set([
  "profile",
  "id_front",
  "vehicle",
  "certificate",
  "garage",
]);

const FOLDER_LABELS = {
  profile: "Profile photo",
  id_front: "ID front photo",
  vehicle: "Vehicle photo",
  certificate: "Certification photo",
  garage: "Garage front photo",
};

let signedUploadCallable = null;

function getSignedUploadCallable() {
  if (!signedUploadCallable) {
    signedUploadCallable = httpsCallable(
      getFunctions(app),
      "getCloudinaryUploadSignature"
    );
  }
  return signedUploadCallable;
}

async function requestSignedUpload({ folder, file }) {
  const { data } = await getSignedUploadCallable()({
    folder,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  });
  return data;
}

async function postToCloudinary(formData, cloudName, resourceType) {
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = payload?.error?.message || "Upload failed. Please try again.";
    if (/preset not found/i.test(message)) {
      const preset = formData.get("upload_preset");
      message =
        `Cloudinary upload preset "${preset}" was not found. ` +
        "Create an Unsigned preset with that exact name in Cloudinary Dashboard → Settings → Upload presets, " +
        "or set VITE_CLOUDINARY_UPLOAD_PRESET in .env to your existing preset name and redeploy.";
    }
    throw new Error(message);
  }

  if (!payload.secure_url) {
    throw new Error("Upload succeeded but no file URL was returned.");
  }

  return payload.secure_url;
}

/**
 * Option B — unsigned preset (Spark plan, no Cloud Functions).
 * Client validation only; preset must be Unsigned in Cloudinary Dashboard.
 */
async function uploadUnsigned(userId, folder, file, category) {
  const { cloudName } = getCloudinaryConfig();
  const uploadPreset = getCloudinaryPresetForCategory(category);

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Photo uploads are not configured. Set VITE_CLOUDINARY_CLOUD_NAME and preset names in .env."
    );
  }

  const folderPath = getFolderPath(userId, folder);
  const allowedFormats = getAllowedFormatsForCategory(category);
  const resourceType = getCloudinaryResourceType(category);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folderPath);
  formData.append(
    "tags",
    `uid:${userId},stage:signup,doc_type:${folder},preset:${category}`
  );
  if (allowedFormats) {
    formData.append("allowed_formats", allowedFormats);
  }

  return postToCloudinary(formData, cloudName, resourceType);
}

/**
 * Signed upload via Firebase Cloud Function (Blaze plan).
 */
async function uploadSigned(userId, folder, file) {
  const signed = await requestSignedUpload({ folder, file });

  if (!signed?.signature || !signed?.cloudName || !signed?.apiKey) {
    throw new Error("Upload authorization failed.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("signature", signed.signature);
  formData.append("upload_preset", signed.uploadPreset);
  formData.append("folder", signed.folder);
  if (signed.tags) formData.append("tags", signed.tags);
  if (signed.allowedFormats) formData.append("allowed_formats", signed.allowedFormats);

  return postToCloudinary(
    formData,
    signed.cloudName,
    signed.resourceType || "image"
  );
}

/**
 * Upload a user-owned file to Cloudinary.
 * Mode controlled by VITE_CLOUDINARY_UPLOAD_MODE (default: unsigned).
 * @returns {Promise<string>} HTTPS URL for Firestore
 */
export async function uploadUserImage(userId, folder, file, { role } = {}) {
  if (!userId || !folder || !file) {
    throw new Error("Missing upload parameters.");
  }
  if (!role) {
    throw new Error("User role is required for upload validation.");
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    throw new Error("Invalid upload folder.");
  }

  const authUser = auth.currentUser;
  const validation = await validateUploadRequest({
    file,
    folder,
    userId,
    role,
    authUser,
    label: FOLDER_LABELS[folder] || "File",
  });

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const category = validation.preset || getPresetForFolder(folder);
  const mode = getCloudinaryUploadMode();

  if (mode === "signed") {
    try {
      return await uploadSigned(userId, folder, file);
    } catch (error) {
      const message =
        error?.message ||
        error?.details ||
        "Unable to authorize upload. Please sign in and try again.";
      throw new Error(
        typeof message === "string" ? message : "Upload authorization failed."
      );
    }
  }

  return uploadUnsigned(userId, folder, file, category);
}

export { getPresetForFolder };
