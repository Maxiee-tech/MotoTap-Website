/**
 * Maps validation category → Cloudinary signed preset name (from functions/.env).
 * Keep preset names in sync with Cloudinary Dashboard → Upload presets.
 */

const PRESET_ENV_KEYS = {
  profile_photos: "CLOUDINARY_PRESET_PROFILE_PHOTOS",
  signup_documents: "CLOUDINARY_PRESET_SIGNUP_DOCUMENTS",
  vehicles: "CLOUDINARY_PRESET_VEHICLES",
  user_uploads: "CLOUDINARY_PRESET_USER_UPLOADS",
};

/**
 * @param {string} category - profile_photos | signup_documents | vehicles | user_uploads
 * @param {Record<string, string>} env - preset name per category
 */
function resolveCloudinaryPresetName(category, env) {
  const key = PRESET_ENV_KEYS[category];
  if (!key) return null;
  return String(env[category] || "").trim() || null;
}

function getPresetEnvSnapshot(getters) {
  return {
    profile_photos: getters.profilePhotos(),
    signup_documents: getters.signupDocuments(),
    vehicles: getters.vehicles(),
    user_uploads: getters.userUploads(),
  };
}

module.exports = {
  PRESET_ENV_KEYS,
  resolveCloudinaryPresetName,
  getPresetEnvSnapshot,
};
