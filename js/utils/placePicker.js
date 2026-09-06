import { loadGoogleMapsScript } from "../googleMapsLoader.js";

export async function ensurePlacesLibrary() {
  await loadGoogleMapsScript();
  if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") {
    await google.maps.importLibrary("places");
  }
}

export async function attachPlaceAutocomplete(input, { onPlace } = {}) {
  if (!input) return null;
  await ensurePlacesLibrary();
  if (typeof google === "undefined" || !google.maps?.places?.Autocomplete) {
    return null;
  }

  if (input.__mototapPlaceAc) {
    input.__mototapOnPlace = onPlace;
    return input.__mototapPlaceAc;
  }

  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["name", "formatted_address", "geometry"],
    types: ["establishment"],
    componentRestrictions: { country: "ke" },
  });
  input.__mototapOnPlace = onPlace;
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    const loc = place?.geometry?.location;
    const name = String(place?.name || place?.formatted_address || "")
      .trim()
      .slice(0, 120);
    input.__mototapOnPlace?.({
      name,
      address: String(place?.formatted_address || "").trim(),
      lat: loc ? loc.lat() : null,
      lng: loc ? loc.lng() : null,
    });
  });
  input.__mototapPlaceAc = autocomplete;
  return autocomplete;
}

export async function fetchNearbyLandmarks(lat, lng, { limit = 3, radius = 900 } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  await ensurePlacesLibrary();
  if (typeof google === "undefined" || !google.maps?.places?.PlacesService) {
    return [];
  }

  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    service.nearbySearch(
      {
        location: { lat, lng },
        radius,
        type: "point_of_interest",
      },
      (results, status) => {
        if (status !== "OK" || !Array.isArray(results)) {
          resolve([]);
          return;
        }
        const names = [];
        for (const place of results) {
          const name = String(place.name || "").trim();
          if (!name || names.includes(name)) continue;
          names.push(name);
          if (names.length >= limit) break;
        }
        resolve(names);
      }
    );
  });
}

export function renderLandmarkChips(container, names, onSelect) {
  if (!container) return;
  container.innerHTML = "";
  const list = Array.isArray(names) ? names.filter(Boolean) : [];
  container.classList.toggle("hidden", list.length === 0);
  list.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "location-chip";
    button.textContent = name;
    button.addEventListener("click", () => onSelect?.(name));
    container.appendChild(button);
  });
}

export async function refreshLandmarkChips(container, lat, lng, onSelect) {
  const names = await fetchNearbyLandmarks(lat, lng);
  renderLandmarkChips(container, names, onSelect);
}
