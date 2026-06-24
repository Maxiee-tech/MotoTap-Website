import { escapeHtml } from "./utils/html.js";
import {
  getActiveVehicle,
  vehicleDisplayName,
} from "./models/VehicleProfile.js";

function formatMileageDisplay(mileage) {
  const raw = String(mileage || "0").replace(/,/g, "").trim();
  const digits = raw.replace(/[^\d.]/g, "");
  if (!digits) return "0";
  const value = Number(digits);
  if (!Number.isFinite(value)) return raw || "0";
  return value.toLocaleString();
}

function getActiveVehicleData(profile) {
  const activeVehicle = getActiveVehicle(profile);

  return {
    vehicleName: activeVehicle ? vehicleDisplayName(activeVehicle) : "No active vehicle",
    plate: activeVehicle?.licensePlate || "N/A",
    mileage: formatMileageDisplay(activeVehicle?.mileage || "0"),
  };
}

export function renderActiveVehicleCardSkeleton() {
  return `
    <article class="driver-active-vehicle-card driver-active-vehicle-card--skeleton" aria-hidden="true">
      <div class="driver-active-vehicle-body">
        <div class="driver-active-vehicle-icon profile-vehicle-active-icon" aria-hidden="true">
          <span class="material-symbols-outlined">directions_car</span>
        </div>
        <div class="driver-active-vehicle-copy">
          <span class="driver-active-vehicle-skeleton-line driver-active-vehicle-skeleton-line--label"></span>
          <span class="driver-active-vehicle-skeleton-line driver-active-vehicle-skeleton-line--title"></span>
          <span class="driver-active-vehicle-skeleton-line driver-active-vehicle-skeleton-line--stats"></span>
        </div>
      </div>
      <span class="driver-active-vehicle-skeleton-edit" aria-hidden="true"></span>
    </article>
  `;
}

export function paintDriverActiveVehicleSkeleton(container) {
  if (!container) return;
  container.innerHTML = renderActiveVehicleCardSkeleton();
}

export function renderActiveVehicleCard(profile) {
  const { vehicleName, plate, mileage } = getActiveVehicleData(profile);

  return `
    <article class="driver-active-vehicle-card">
      <div class="driver-active-vehicle-body">
        <div class="driver-active-vehicle-icon profile-vehicle-active-icon" aria-hidden="true">
          <span class="material-symbols-outlined">directions_car</span>
        </div>
        <div class="driver-active-vehicle-copy">
          <span class="driver-active-vehicle-label">ACTIVE VEHICLE PROFILE</span>
          <p class="driver-active-vehicle-title">${escapeHtml(vehicleName)}</p>
          <p class="driver-active-vehicle-stats">
            Plate: ${escapeHtml(plate)}&nbsp;-&nbsp;Mileage: ${escapeHtml(mileage)} km
          </p>
        </div>
      </div>
      <button
        type="button"
        class="driver-active-vehicle-edit"
        data-active-vehicle-action="edit"
        aria-label="Edit vehicle"
      >
        <span class="material-symbols-outlined" aria-hidden="true">edit</span>
      </button>
    </article>
  `;
}

/**
 * Render and wire the driver homepage active vehicle card.
 * @param {HTMLElement} container
 * @param {{ profile: object, onNavigateToVehicles?: () => void }} options
 */
export function paintDriverActiveVehicleCard(
  container,
  { profile, onNavigateToVehicles } = {}
) {
  if (!container) return;

  container.innerHTML = renderActiveVehicleCard(profile);

  container
    .querySelector('[data-active-vehicle-action="edit"]')
    ?.addEventListener("click", () => {
      onNavigateToVehicles?.();
    });
}
