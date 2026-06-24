import { escapeHtml } from "./utils/html.js";
import {
  createVehicleId,
  ensureVehiclesArray,
  normalizeVehicle,
  vehicleDisplayName,
} from "./models/VehicleProfile.js";

function renderActiveVehicleCard(activeVehicle) {
  if (!activeVehicle) {
    return `
      <div class="profile-vehicle-active-card profile-vehicle-active-card--empty">
        <span class="material-symbols-outlined" aria-hidden="true">directions_car</span>
        <p>No active vehicle. Add one below to get started.</p>
      </div>
    `;
  }

  const name = vehicleDisplayName(activeVehicle);
  const year = activeVehicle.year || "—";
  const plate = activeVehicle.licensePlate || "—";
  const mileage = activeVehicle.mileage
    ? `${activeVehicle.mileage} km`
    : "—";

  return `
    <div class="profile-vehicle-active-card">
      <div class="profile-vehicle-active-main">
        <div class="profile-vehicle-active-body">
          <div class="profile-vehicle-active-icon" aria-hidden="true">
            <span class="material-symbols-outlined">directions_car</span>
          </div>
          <div class="profile-vehicle-active-copy">
            <strong class="profile-vehicle-active-name">${escapeHtml(name)}</strong>
            <span class="profile-vehicle-active-meta">Year: ${escapeHtml(year)}</span>
            <span class="profile-vehicle-active-meta">Plate: ${escapeHtml(plate)}</span>
            <span class="profile-vehicle-active-meta">Mileage: ${escapeHtml(mileage)}</span>
          </div>
        </div>
      </div>
      <button type="button" class="profile-vehicle-view-link" data-vehicle-action="edit-active" aria-label="Update vehicle">
        UPDATE
      </button>
    </div>
  `;
}

function renderVehicleRow(vehicle) {
  const name = vehicleDisplayName(vehicle);
  const plate = vehicle.licensePlate || "No plate";
  const mileage = vehicle.mileage ? `${vehicle.mileage} km` : "";

  return `
    <button
      type="button"
      class="profile-vehicle-row"
      data-vehicle-action="edit"
      data-vehicle-id="${escapeHtml(vehicle.id)}"
    >
      <span class="profile-vehicle-row-icon material-symbols-outlined" aria-hidden="true">directions_car</span>
      <span class="profile-vehicle-row-copy">
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(plate)}${mileage ? ` · ${escapeHtml(mileage)}` : ""}</span>
      </span>
      <span class="material-symbols-outlined profile-vehicle-row-chevron" aria-hidden="true">chevron_right</span>
    </button>
  `;
}

export function renderDriverVehicleSection(profile) {
  const vehicles = ensureVehiclesArray(profile);
  const activeVehicle = vehicles[0] || null;
  const otherVehicles = vehicles.slice(1);

  const listMarkup = otherVehicles.length
    ? otherVehicles.map((vehicle) => renderVehicleRow(vehicle)).join("")
    : "";

  return `
    <section class="profile-block profile-vehicles-block" id="profile-vehicles-block">
      <div class="profile-block-heading profile-vehicles-block-heading">
        <h4 class="profile-block-title">My Vehicles</h4>
        <button type="button" class="profile-vehicle-add-btn" data-vehicle-action="add">ADD VEHICLE</button>
      </div>
      ${renderActiveVehicleCard(activeVehicle)}
      ${listMarkup ? `<div class="profile-vehicles-list" id="profile-vehicles-list">${listMarkup}</div>` : ""}
      <p class="profile-vehicle-list-error hidden" id="profile-vehicle-list-error" role="alert"></p>
    </section>

    <dialog class="profile-vehicle-dialog" id="profile-vehicle-dialog" aria-labelledby="profile-vehicle-dialog-title">
      <form class="profile-vehicle-dialog-form" id="profile-vehicle-dialog-form">
        <div class="profile-vehicle-dialog-header">
          <p class="profile-vehicle-dialog-title" id="profile-vehicle-dialog-title">Add Vehicle</p>
          <button type="button" class="profile-vehicle-dialog-close" data-vehicle-action="close" aria-label="Close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <input type="hidden" id="profile-vehicle-id" value="" />
        <label class="profile-vehicle-field">
          <span>Make</span>
          <input type="text" id="profile-vehicle-make" placeholder="e.g. Toyota" required />
        </label>
        <label class="profile-vehicle-field">
          <span>Model</span>
          <input type="text" id="profile-vehicle-model" placeholder="e.g. Camry" required />
        </label>
        <label class="profile-vehicle-field">
          <span>Year</span>
          <input type="number" id="profile-vehicle-year" placeholder="e.g. 2020" min="1900" max="2100" />
        </label>
        <label class="profile-vehicle-field">
          <span>License Plate</span>
          <input type="text" id="profile-vehicle-plate" placeholder="e.g. KDA 123A" required />
        </label>
        <label class="profile-vehicle-field">
          <span>Current Mileage (km)</span>
          <input type="text" id="profile-vehicle-mileage" placeholder="e.g. 45000" inputmode="numeric" />
        </label>
        <p class="profile-vehicle-dialog-error hidden" id="profile-vehicle-dialog-error" role="alert"></p>
        <div class="profile-vehicle-dialog-actions" id="profile-vehicle-dialog-actions">
          <div class="profile-vehicle-dialog-actions-row" id="profile-vehicle-dialog-actions-row">
            <button
              type="button"
              class="btn-secondary profile-vehicle-dialog-btn profile-delete-btn profile-vehicle-delete-toggle hidden"
              id="profile-vehicle-delete-toggle"
              data-vehicle-action="delete-toggle"
            >
              DELETE
            </button>
            <div class="profile-vehicle-dialog-actions-main">
              <button type="button" class="btn-secondary profile-vehicle-dialog-btn" data-vehicle-action="close">Cancel</button>
              <button type="submit" class="btn-primary profile-vehicle-save-btn profile-vehicle-dialog-btn">Save</button>
            </div>
          </div>
          <div class="profile-vehicle-delete-form hidden" id="profile-vehicle-delete-form">
            <p class="profile-muted">Remove this vehicle from your profile?</p>
            <div class="profile-delete-actions">
              <button type="button" class="btn-secondary profile-vehicle-dialog-btn" data-vehicle-action="delete-cancel">Cancel</button>
              <button type="button" class="btn-primary profile-delete-submit profile-vehicle-dialog-btn" data-vehicle-action="delete-confirm">
                Delete Vehicle
              </button>
            </div>
          </div>
        </div>
      </form>
    </dialog>
  `;
}

function setDialogError(message) {
  const errorEl = document.getElementById("profile-vehicle-dialog-error");
  if (!errorEl) return;
  if (message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  } else {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }
}

function setListError(message) {
  const errorEl = document.getElementById("profile-vehicle-list-error");
  if (!errorEl) return;
  if (message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  } else {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }
}

function readDialogForm() {
  return normalizeVehicle({
    id: document.getElementById("profile-vehicle-id")?.value || "",
    make: document.getElementById("profile-vehicle-make")?.value || "",
    model: document.getElementById("profile-vehicle-model")?.value || "",
    year: document.getElementById("profile-vehicle-year")?.value || "",
    licensePlate: document.getElementById("profile-vehicle-plate")?.value || "",
    mileage: document.getElementById("profile-vehicle-mileage")?.value || "",
  });
}

function validateVehicleForm(vehicle) {
  if (!vehicle.make) return "Make is required.";
  if (!vehicle.model) return "Model is required.";
  if (!vehicle.licensePlate) return "License plate is required.";
  return "";
}

function resetVehicleDeleteConfirm({ showDelete = false } = {}) {
  const deleteToggle = document.getElementById("profile-vehicle-delete-toggle");
  const deleteForm = document.getElementById("profile-vehicle-delete-form");
  const actionsRow = document.getElementById("profile-vehicle-dialog-actions-row");

  deleteForm?.classList.add("hidden");
  actionsRow?.classList.remove("hidden");
  deleteToggle?.classList.toggle("hidden", !showDelete);
}

function openVehicleDialog(vehicle = null) {
  const dialog = document.getElementById("profile-vehicle-dialog");
  const title = document.getElementById("profile-vehicle-dialog-title");
  if (!dialog) return;

  const editing = Boolean(vehicle?.id);
  const normalized = vehicle ? normalizeVehicle(vehicle) : normalizeVehicle({ id: "" });

  document.getElementById("profile-vehicle-id").value = editing ? normalized.id : "";
  document.getElementById("profile-vehicle-make").value = normalized.make;
  document.getElementById("profile-vehicle-model").value = normalized.model;
  document.getElementById("profile-vehicle-year").value = normalized.year;
  document.getElementById("profile-vehicle-plate").value = normalized.licensePlate;
  document.getElementById("profile-vehicle-mileage").value = normalized.mileage;

  if (title) title.textContent = editing ? "Edit Vehicle" : "Add Vehicle";
  document
    .getElementById("profile-vehicle-dialog-actions-row")
    ?.classList.toggle("profile-vehicle-dialog-actions-row--add-only", !editing);
  resetVehicleDeleteConfirm({ showDelete: editing });
  setDialogError("");

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "open");
  }
}

function closeVehicleDialog() {
  const dialog = document.getElementById("profile-vehicle-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

/**
 * Wire vehicle list + modal actions inside the profile page.
 * @param {HTMLElement} container
 * @param {{ profile: object, onSaveVehicles: (vehicles: object[]) => Promise<{ success: boolean, error?: string }> }} options
 */
export function bindVehicleProfileUi(container, { profile, onSaveVehicles } = {}) {
  if (!container) return;

  const vehicles = ensureVehiclesArray(profile);

  const findVehicle = (vehicleId) =>
    vehicles.find((vehicle) => vehicle.id === vehicleId) || null;

  container.querySelector('[data-vehicle-action="add"]')?.addEventListener("click", () => {
    openVehicleDialog(null);
  });

  container.querySelector('[data-vehicle-action="edit-active"]')?.addEventListener("click", () => {
    if (vehicles[0]) openVehicleDialog(vehicles[0]);
  });

  container.querySelectorAll('[data-vehicle-action="edit"]').forEach((button) => {
    button.addEventListener("click", () => {
      const vehicleId = button.getAttribute("data-vehicle-id");
      const vehicle = findVehicle(vehicleId);
      if (vehicle) openVehicleDialog(vehicle);
    });
  });

  container.querySelectorAll('[data-vehicle-action="close"]').forEach((button) => {
    button.addEventListener("click", () => closeVehicleDialog());
  });

  const dialog = document.getElementById("profile-vehicle-dialog");
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closeVehicleDialog();
  });

  const form = document.getElementById("profile-vehicle-dialog-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const draft = readDialogForm();
    const validationError = validateVehicleForm(draft);
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    const editingId = document.getElementById("profile-vehicle-id")?.value || "";
    const nextVehicles = [...vehicles];
    const index = editingId ? nextVehicles.findIndex((v) => v.id === editingId) : -1;

    if (index >= 0) {
      nextVehicles[index] = { ...nextVehicles[index], ...draft, id: editingId };
    } else {
      nextVehicles.push({ ...draft, id: createVehicleId() });
    }

    setDialogError("");
    const saveBtn = form.querySelector(".profile-vehicle-save-btn");
    if (saveBtn) saveBtn.disabled = true;

    const result = await onSaveVehicles?.(nextVehicles);
    if (saveBtn) saveBtn.disabled = false;

    if (!result?.success) {
      setDialogError(result?.error || "Failed to save vehicle.");
      return;
    }

    closeVehicleDialog();
    setListError("");
  });

  document.getElementById("profile-vehicle-delete-toggle")?.addEventListener("click", () => {
    const deleteToggle = document.getElementById("profile-vehicle-delete-toggle");
    const deleteForm = document.getElementById("profile-vehicle-delete-form");
    const actionsRow = document.getElementById("profile-vehicle-dialog-actions-row");

    deleteForm?.classList.remove("hidden");
    actionsRow?.classList.add("hidden");
    deleteToggle?.classList.add("hidden");
    setDialogError("");
  });

  container.querySelector('[data-vehicle-action="delete-cancel"]')?.addEventListener("click", () => {
    const editingId = document.getElementById("profile-vehicle-id")?.value || "";
    resetVehicleDeleteConfirm({ showDelete: Boolean(editingId) });
    setDialogError("");
  });

  container.querySelector('[data-vehicle-action="delete-confirm"]')?.addEventListener("click", async () => {
    const editingId = document.getElementById("profile-vehicle-id")?.value || "";
    if (!editingId) return;

    const nextVehicles = vehicles.filter((vehicle) => vehicle.id !== editingId);
    const confirmBtn = container.querySelector('[data-vehicle-action="delete-confirm"]');
    if (confirmBtn) confirmBtn.disabled = true;

    const result = await onSaveVehicles?.(nextVehicles);
    if (confirmBtn) confirmBtn.disabled = false;

    if (!result?.success) {
      setDialogError(result?.error || "Failed to delete vehicle.");
      return;
    }

    closeVehicleDialog();
    setListError("");
  });
}
