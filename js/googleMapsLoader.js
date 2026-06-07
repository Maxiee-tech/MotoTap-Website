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

export function loadGoogleMapsScript() {
  if (typeof google !== "undefined" && google.maps) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  const key = getGoogleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error("MAPS_API_KEY_MISSING"));
  }

  registerMapsAuthFailureHandler();

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = "__mototapMapsReady";

    window[callbackName] = () => {
      delete window[callbackName];
      if (isMapsAuthFailed()) {
        reject(new Error("MAPS_AUTH_FAILURE"));
        return;
      }
      if (typeof google === "undefined" || !google.maps) {
        reject(new Error("MAPS_NOT_AVAILABLE"));
        return;
      }
      resolve();
    };

    const script = document.createElement("script");
    script.dataset.mototapMaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&loading=async&callback=${callbackName}`;
    script.onerror = () => reject(new Error("MAPS_SCRIPT_ERROR"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Wait until the map container is visible and has layout dimensions. */
export function waitForMapLayout(mapEl) {
  return new Promise((resolve) => {
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
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
