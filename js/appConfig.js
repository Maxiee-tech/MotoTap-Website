/**
 * Build-time configuration from Vite env vars.
 * Firebase web API keys are not secret, but keeping them in .env avoids
 * scattering values and simplifies rotation per environment.
 */

const firebaseDefaults = {
  apiKey: "AIzaSyDpbfjsBQ8My221Yzw6hdKvERt9Dm7pc_4",
  authDomain: "mototap-447fe.firebaseapp.com",
  projectId: "mototap-447fe",
  storageBucket: "mototap-447fe.firebasestorage.app",
  messagingSenderId: "359527347402",
  appId: "1:359527347402:web:7e88776bde7e801269f033",
  measurementId: "G-KGPLZ5BB4Z",
};

function readEnv(key, fallback = "") {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const firebaseConfig = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY", firebaseDefaults.apiKey),
  authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN", firebaseDefaults.authDomain),
  projectId: readEnv("VITE_FIREBASE_PROJECT_ID", firebaseDefaults.projectId),
  storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET", firebaseDefaults.storageBucket),
  messagingSenderId: readEnv(
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    firebaseDefaults.messagingSenderId
  ),
  appId: readEnv("VITE_FIREBASE_APP_ID", firebaseDefaults.appId),
  measurementId: readEnv("VITE_FIREBASE_MEASUREMENT_ID", firebaseDefaults.measurementId),
};

export function getGoogleMapsApiKey() {
  return readEnv("VITE_GOOGLE_MAPS_API_KEY");
}

/** `unsigned` = Spark / no Cloud Functions. `signed` = Blaze + getCloudinaryUploadSignature. */
export function getCloudinaryUploadMode() {
  const mode = readEnv("VITE_CLOUDINARY_UPLOAD_MODE", "unsigned").toLowerCase();
  return mode === "signed" ? "signed" : "unsigned";
}

export function getCloudinaryConfig() {
  return {
    cloudName: readEnv("VITE_CLOUDINARY_CLOUD_NAME", "deoquaz6p"),
    presets: {
      profile_photos: readEnv("VITE_CLOUDINARY_PRESET_PROFILE_PHOTOS", "profile_photos"),
      signup_documents: readEnv(
        "VITE_CLOUDINARY_PRESET_SIGNUP_DOCUMENTS",
        "signup_documents"
      ),
      vehicles: readEnv("VITE_CLOUDINARY_PRESET_VEHICLES", "vehicles"),
      user_uploads: readEnv("VITE_CLOUDINARY_PRESET_USER_UPLOADS", "user_uploads"),
    },
    fallbackPreset: readEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "profile_photos"),
  };
}

export function getCloudinaryPresetForCategory(category) {
  const { presets, fallbackPreset } = getCloudinaryConfig();
  const categoryPreset = presets[category];
  if (categoryPreset) return categoryPreset;
  return fallbackPreset || "";
}

export const MAX_CHAT_MESSAGE_LENGTH = 200;
