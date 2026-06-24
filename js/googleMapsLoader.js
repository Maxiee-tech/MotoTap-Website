import { getGoogleMapsApiKey } from "./appConfig.js";

let loadPromise = null;

function onMapsAuthFailure() {
  window.__mototapMapsAuthFailed = true;
  window.dispatchEvent(new CustomEvent("mototap-maps-auth-failure"));
}

/** Register before the Maps script loads (Google calls this on key/referrer errors). */
export function registerMapsAuthFailureHandler() {
  window.gm_authFailure = onMapsAuthFailure;
}

export function isMapsAuthFailed() {
  return window.__mototapMapsAuthFailed === true;
}

async function bootstrapGoogleMapsLibraries() {
  if (typeof google === "undefined" || !google.maps) {
    throw new Error("MAPS_NOT_AVAILABLE");
  }

  if (typeof google.maps.Map === "function") {
    return;
  }

  if (typeof google.maps.importLibrary === "function") {
    await Promise.all([
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("marker"),
    ]);
  }

  if (typeof google.maps.Map !== "function") {
    throw new Error("MAPS_NOT_AVAILABLE");
  }
}

function injectMapsScript(key) {
  return new Promise((resolve, reject) => {
    const callbackName = "__mototapMapsReady";

    window[callbackName] = () => {
      delete window[callbackName];
      if (isMapsAuthFailed()) {
        reject(new Error("MAPS_AUTH_FAILURE"));
        return;
      }
      bootstrapGoogleMapsLibraries().then(resolve).catch(reject);
    };

    const script = document.createElement("script");
    script.dataset.mototapMaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&v=weekly&callback=${callbackName}`;
    script.onerror = () => reject(new Error("MAPS_SCRIPT_ERROR"));
    document.head.appendChild(script);
  });
}

export function loadGoogleMapsScript() {
  if (typeof google !== "undefined" && google.maps?.Map) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  const key = getGoogleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error("MAPS_API_KEY_MISSING"));
  }

  registerMapsAuthFailureHandler();

  const existing = document.querySelector("script[data-mototap-maps]");
  if (existing && typeof google !== "undefined" && google.maps) {
    loadPromise = bootstrapGoogleMapsLibraries();
    return loadPromise;
  }

  loadPromise = injectMapsScript(key);
  return loadPromise;
}

/** Wait until the map container is visible and has layout dimensions. */
export function waitForMapLayout(mapEl, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    const started = performance.now();

    const tick = () => {
      if (!mapEl) {
        resolve();
        return;
      }
      const rect = mapEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        resolve();
        return;
      }
      if (performance.now() - started > timeoutMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
