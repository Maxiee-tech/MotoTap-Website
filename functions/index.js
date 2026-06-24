const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { validateServerUploadRequest } = require("./src/uploadValidation");
const { signCloudinaryParams } = require("./src/cloudinarySign");
const { resolveCloudinaryPresetName } = require("./src/cloudinaryPresets");
const { buildPublicProfileData } = require("./src/publicProfile");

admin.initializeApp();

const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");
const cloudinaryApiKey = defineString("CLOUDINARY_API_KEY");
const cloudinaryCloudName = defineString("CLOUDINARY_CLOUD_NAME");
const cloudinaryPresetProfilePhotos = defineString("CLOUDINARY_PRESET_PROFILE_PHOTOS");
const cloudinaryPresetSignupDocuments = defineString("CLOUDINARY_PRESET_SIGNUP_DOCUMENTS");
const cloudinaryPresetVehicles = defineString("CLOUDINARY_PRESET_VEHICLES");
const cloudinaryPresetUserUploads = defineString("CLOUDINARY_PRESET_USER_UPLOADS");

function getPresetNameForCategory(category) {
  return resolveCloudinaryPresetName(category, {
    profile_photos: cloudinaryPresetProfilePhotos.value(),
    signup_documents: cloudinaryPresetSignupDocuments.value(),
    vehicles: cloudinaryPresetVehicles.value(),
    user_uploads: cloudinaryPresetUserUploads.value(),
  });
}

const ALLOWED_FOLDERS = new Set([
  "profile",
  "id_front",
  "vehicle",
  "certificate",
  "garage",
]);

/**
 * Callable: returns a short-lived Cloudinary signed upload payload.
 * Requires Firebase Auth. Validates file metadata, role (from Firestore), and uid ownership.
 * API secret never leaves the server.
 */
exports.getCloudinaryUploadSignature = onCall(
  {
    cors: true,
    secrets: [cloudinaryApiSecret],
    invoker: "public",
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in to upload files.");
    }

    const uid = request.auth.uid;
    const folder = String(request.data?.folder || "").trim();
    const fileName = String(request.data?.fileName || "").trim();
    const mimeType = String(request.data?.mimeType || "").trim();
    const fileSize = Number(request.data?.fileSize);

    if (!ALLOWED_FOLDERS.has(folder)) {
      throw new HttpsError("invalid-argument", "Invalid upload folder.");
    }
    if (!fileName || !mimeType || !Number.isFinite(fileSize)) {
      throw new HttpsError("invalid-argument", "Missing file metadata.");
    }

    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "User profile not found.");
    }

    const role = userSnap.data()?.role;
    const validation = validateServerUploadRequest({
      folder,
      fileName,
      mimeType,
      fileSize,
      uid,
      role,
    });

    if (!validation.valid) {
      throw new HttpsError("invalid-argument", validation.message);
    }

    const apiKey = cloudinaryApiKey.value();
    const cloudName = cloudinaryCloudName.value();
    const uploadPreset = getPresetNameForCategory(validation.preset);
    const apiSecret = cloudinaryApiSecret.value();

    if (!apiKey || !cloudName || !uploadPreset || !apiSecret) {
      throw new HttpsError(
        "failed-precondition",
        `Cloudinary preset not configured for category: ${validation.preset}`
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const tags = `uid:${uid},stage:signup,doc_type:${folder},preset:${validation.preset}`;

    const paramsToSign = {
      allowed_formats: validation.allowedFormats,
      folder: validation.folderPath,
      timestamp,
      upload_preset: uploadPreset,
      tags,
    };

    const signature = signCloudinaryParams(paramsToSign, apiSecret);

    return {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: validation.folderPath,
      uploadPreset,
      resourceType: validation.resourceType,
      tags,
      allowedFormats: validation.allowedFormats,
      maxBytes: validation.maxBytes,
    };
  }
);

/**
 * Keep publicProfiles in sync whenever users/{uid} changes (web + Android).
 * Requires Blaze plan — skip deploying functions on Spark; the web client syncs publicProfiles instead.
 */
exports.syncPublicProfile = onDocumentWritten("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const db = admin.firestore();
  const publicRef = db.collection("publicProfiles").doc(userId);

  if (!event.data?.after?.exists) {
    await publicRef.delete().catch(() => {});
    return;
  }

  const data = event.data.after.data();
  const payload = buildPublicProfileData(userId, data);
  if (!payload.name) return;

  await publicRef.set(payload, { merge: true });
});
