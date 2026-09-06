import { escapeHtml } from "./utils/html.js";
import { normalizeUserRole, formatUserRoleLabel } from "./utils/geo.js";
import { attachPlaceAutocomplete, refreshLandmarkChips } from "./utils/placePicker.js";
import { getJobIssueType, sortJobsNewestFirst } from "./utils/jobSync.js";
import { computeLoyalty } from "./utils/loyalty.js";
import { renderDriverVehicleSection, bindVehicleProfileUi } from "./vehicleProfileUi.js";
import { renderDriverProfileHub, bindDriverProfileHub } from "./driverProfileHubUi.js";

export function getProfileDisplayPhoto(profile) {
  const primary = String(profile?.profilePhotoUrl || "").trim();
  if (primary) return primary;

  const role = normalizeUserRole(profile?.role);
  if (role === "driver") {
    return String(profile?.vehiclePhotoUrl || "").trim();
  }
  if (role === "mechanic") {
    return (
      String(profile?.certificatePhotoUrl || "").trim() ||
      String(profile?.garagePhotos?.[0] || "").trim()
    );
  }
  if (role === "parts_dealer") {
    return (
      String(profile?.certificatePhotoUrl || "").trim() ||
      String(profile?.garagePhotos?.[0] || "").trim()
    );
  }
  return "";
}

export function getProfileInitial(name, email) {
  const source = String(name || email || "G").trim();
  return (source.charAt(0) || "G").toUpperCase();
}

function formatRoleLabel(role) {
  return formatUserRoleLabel(role).toUpperCase();
}

function formatJobDate(createdAtMillis) {
  if (!createdAtMillis) return "";
  return new Date(createdAtMillis).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function renderInfoCard(label, value, iconName) {
  return `
    <article class="profile-info-card">
      <span class="material-symbols-outlined profile-info-icon" aria-hidden="true">${escapeHtml(iconName)}</span>
      <div>
        <p class="profile-info-label">${escapeHtml(label)}</p>
        <p class="profile-info-value">${escapeHtml(value)}</p>
      </div>
    </article>
  `;
}

function renderServiceHistoryItems(jobs) {
  const completed = sortJobsNewestFirst(jobs).filter((job) => job.status === "COMPLETED");
  if (!completed.length) {
    return `<p class="profile-muted">No completed services yet.</p>`;
  }

  return completed
    .slice(0, 3)
    .map((job) => {
      const issueType = getJobIssueType(job);
      const date = formatJobDate(job.createdAtMillis);
      return `
        <div class="profile-history-item">
          <span class="material-symbols-outlined profile-history-check" aria-hidden="true">check_circle</span>
          <div class="profile-history-copy">
            <strong>${escapeHtml(issueType)}</strong>
            <span>${escapeHtml(date || "Date unavailable")} · MotoTap Service</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderDriverExtras(profile, jobs = [], hubOptions = {}) {
  return `
    ${renderDriverVehicleSection(profile)}
    ${renderDriverProfileHub(profile, jobs, hubOptions)}
  `;
}

function canEditGaragePhoto(profile) {
  const role = normalizeUserRole(profile?.role);
  if (role === "parts_dealer") return true;
  if (role !== "mechanic") return false;
  return String(profile?.garageRole || "").toLowerCase() !== "mechanic";
}

function renderGaragePhotoBlock(profile, { canEdit = false } = {}) {
  const photoUrl = String(profile?.garagePhotos?.[0] || "").trim();
  const preview = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="Garage profile photo" />`
    : `<span class="material-symbols-outlined" aria-hidden="true">storefront</span>`;
  const editMarkup = canEdit
    ? `
      <div>
        <button type="button" class="profile-link-btn" data-profile-action="garage-photo">
          ${photoUrl ? "Change garage photo" : "Add garage photo"}
        </button>
        <input type="file" id="profile-garage-photo-input" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" hidden />
        <p class="profile-muted" id="profile-garage-photo-status"></p>
      </div>`
    : "";

  return `
    <div class="profile-garage-photo">
      <div class="profile-garage-photo-preview">${preview}</div>
      ${editMarkup}
    </div>
  `;
}

function renderLocationNameBlock(profile, { canEdit = false } = {}) {
  const current = String(profile?.locationName || "").trim();
  if (!canEdit) {
    return renderInfoCard("Location", current || "Not provided", "location_on");
  }
  return `
    <div class="profile-location-editor">
      <p class="profile-muted">Location name (drivers see this)</p>
      <input type="text" id="profile-location-name-input" placeholder="Search or pick a popular place near you" maxlength="120" autocomplete="off" value="${escapeHtml(current)}" />
      <div class="location-chips hidden" id="profile-location-landmarks"></div>
      <button type="button" class="profile-link-btn" data-profile-action="location-save">Save location name</button>
      <p class="profile-muted" id="profile-location-status"></p>
    </div>
  `;
}

function renderMechanicExtras(profile, { canEditGaragePhoto: canEdit } = {}) {
  return `
    <section class="profile-block">
      <h4 class="profile-block-title">Garage Details</h4>
      ${renderGaragePhotoBlock(profile, { canEdit })}
      ${renderInfoCard("Institution", profile?.institutionName || "Not provided", "school")}
      ${renderInfoCard("Experience", profile?.experienceYears || "Not provided", "work_history")}
      ${renderLocationNameBlock(profile, { canEdit })}
      ${renderInfoCard(
        "Rating",
        profile?.reviewCount
          ? `${Number(profile.rating || 0).toFixed(1)} (${profile.reviewCount} reviews)`
          : "No reviews yet",
        "star"
      )}
    </section>
  `;
}

function renderPartsDealerExtras(profile, { canEditGaragePhoto: canEdit } = {}) {
  return `
    <section class="profile-block">
      <h4 class="profile-block-title">Shop Details</h4>
      ${renderGaragePhotoBlock(profile, { canEdit })}
      ${renderInfoCard("Shop Name", profile?.institutionName || "Not provided", "storefront")}
      ${renderInfoCard("Years in Business", profile?.experienceYears || "Not provided", "work_history")}
      ${renderLocationNameBlock(profile, { canEdit })}
      ${renderInfoCard(
        "Rating",
        profile?.reviewCount
          ? `${Number(profile.rating || 0).toFixed(1)} (${profile.reviewCount} reviews)`
          : "No reviews yet",
        "star"
      )}
    </section>
  `;
}

function renderProfileExtras(profile, jobs, role, hubOptions) {
  const photoOptions = { canEditGaragePhoto: canEditGaragePhoto(profile) };
  if (role === "driver") return renderDriverExtras(profile, jobs, hubOptions);
  if (role === "parts_dealer") return renderPartsDealerExtras(profile, photoOptions);
  return renderMechanicExtras(profile, photoOptions);
}

/**
 * Render the signed-in profile page (Android ProfileScreen parity — core overview).
 */
export function renderProfilePage(
  container,
  {
    profile,
    email,
    jobs = [],
    onViewAllRequests,
    onBookMaintenance,
    onLogout,
    onDeleteAccount,
    onSaveVehicles,
    onChangeGaragePhoto,
    onChangeGarageLocation,
    onRedeemReward,
    activeHubTab = "overview",
    loyaltyNotice = null,
  } = {}
) {
  if (!container) return;

  const role = normalizeUserRole(profile?.role);
  const driverLoyaltyPoints = computeLoyalty(profile, jobs).available;
  const name =
    String(profile?.name || "").trim() ||
    String(email || "").split("@")[0] ||
    "Account Owner";
  const photoUrl = getProfileDisplayPhoto(profile);
  const isDriver = role === "driver";

  const avatarMarkup = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="Profile photo" class="profile-hero-photo" />`
    : `<span class="material-symbols-outlined profile-hero-placeholder" aria-hidden="true">person</span>`;

  container.innerHTML = `
    <div class="profile-hero">
      <div class="profile-hero-left">
        <div class="profile-hero-avatar">${avatarMarkup}</div>
        <h4 class="profile-hero-name">${escapeHtml(name)}</h4>
      </div>
      <div class="profile-hero-details">
        <p class="profile-hero-role">${escapeHtml(formatRoleLabel(profile?.role))}</p>
        ${
          isDriver
            ? `<p class="profile-hero-points">Total Points: ${escapeHtml(String(driverLoyaltyPoints))}</p>`
            : ""
        }
        <div class="profile-info-grid profile-hero-info">
          ${renderInfoCard("Email Address", email || "Not available", "mail")}
          ${renderInfoCard("Phone Number", profile?.phone || "Not provided", "call")}
        </div>
      </div>
    </div>

    ${renderProfileExtras(profile, jobs, role, {
      activeTab: activeHubTab,
      loyaltyNotice,
    })}

    ${
      isDriver
        ? ""
        : `
    <section class="profile-block">
      <div class="profile-block-heading">
        <h4 class="profile-block-title">Service History</h4>
        <button type="button" class="profile-link-btn" data-profile-action="requests">View All Services</button>
      </div>
      <div class="profile-history-list">
        ${renderServiceHistoryItems(jobs)}
      </div>
    </section>
    `
    }

    <section class="profile-actions">
      <button type="button" class="btn-primary profile-action-btn" data-profile-action="logout">Log Out</button>
      <button type="button" class="btn-secondary profile-action-btn profile-delete-btn" data-profile-action="delete-toggle">
        DELETE ACCOUNT
      </button>
      <form class="profile-delete-form hidden" id="profile-delete-form">
        <p class="profile-muted">Enter your current password to permanently delete your account.</p>
        <input type="password" id="profile-delete-password" autocomplete="current-password" placeholder="Current password" />
        <div class="profile-delete-actions">
          <button type="button" class="btn-secondary" data-profile-action="delete-cancel">Cancel</button>
          <button type="submit" class="btn-primary profile-delete-submit">Delete Account</button>
        </div>
        <p class="profile-delete-error hidden" id="profile-delete-error" role="alert"></p>
      </form>
    </section>
  `;

  container.querySelector('[data-profile-action="requests"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    onViewAllRequests?.();
  });

  container.querySelector('[data-profile-action="logout"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    onLogout?.();
  });

  const deleteForm = container.querySelector("#profile-delete-form");
  const deleteToggle = container.querySelector('[data-profile-action="delete-toggle"]');
  const deleteCancel = container.querySelector('[data-profile-action="delete-cancel"]');
  const deleteError = container.querySelector("#profile-delete-error");

  deleteToggle?.addEventListener("click", () => {
    deleteForm?.classList.remove("hidden");
    deleteToggle.classList.add("hidden");
  });

  deleteCancel?.addEventListener("click", () => {
    deleteForm?.classList.add("hidden");
    deleteToggle?.classList.remove("hidden");
    if (deleteError) {
      deleteError.textContent = "";
      deleteError.classList.add("hidden");
    }
    const passwordInput = container.querySelector("#profile-delete-password");
    if (passwordInput) passwordInput.value = "";
  });

  deleteForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = container.querySelector("#profile-delete-password")?.value || "";
    if (!password.trim()) {
      if (deleteError) {
        deleteError.textContent = "Enter your current password.";
        deleteError.classList.remove("hidden");
      }
      return;
    }
    if (deleteError) deleteError.classList.add("hidden");
    await onDeleteAccount?.(password);
  });

  const garagePhotoBtn = container.querySelector('[data-profile-action="garage-photo"]');
  const garagePhotoInput = container.querySelector("#profile-garage-photo-input");
  const garagePhotoStatus = container.querySelector("#profile-garage-photo-status");
  garagePhotoBtn?.addEventListener("click", () => garagePhotoInput?.click());
  const locationInput = container.querySelector("#profile-location-name-input");
  const locationStatus = container.querySelector("#profile-location-status");
  const locationSaveBtn = container.querySelector('[data-profile-action="location-save"]');
  const locationChips = container.querySelector("#profile-location-landmarks");
  const saveLocationName = async (name) => {
    if (typeof onChangeGarageLocation !== "function") return;
    const value = String(name || locationInput?.value || "").trim();
    if (locationInput) locationInput.value = value;
    if (locationStatus) locationStatus.textContent = "Saving location name…";
    if (locationSaveBtn) locationSaveBtn.disabled = true;
    try {
      const result = await onChangeGarageLocation(value);
      if (locationStatus) {
        locationStatus.textContent = result?.success
          ? "Location name updated."
          : result?.error || "Could not update the location name.";
      }
    } catch (error) {
      if (locationStatus) {
        locationStatus.textContent = error.message || "Could not update the location name.";
      }
    } finally {
      if (locationSaveBtn) locationSaveBtn.disabled = false;
    }
  };
  locationSaveBtn?.addEventListener("click", () => saveLocationName());
  if (locationInput) {
    attachPlaceAutocomplete(locationInput, {
      onPlace: (place) => {
        if (place.name) locationInput.value = place.name;
        saveLocationName(place.name);
      },
    }).catch(() => {});
    const lat = Number(profile?.latitude);
    const lng = Number(profile?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      refreshLandmarkChips(locationChips, lat, lng, (name) => {
        locationInput.value = name;
        saveLocationName(name);
      }).catch(() => {});
    }
  }

  garagePhotoInput?.addEventListener("change", async () => {
    const file = garagePhotoInput.files?.[0];
    garagePhotoInput.value = "";
    if (!file || typeof onChangeGaragePhoto !== "function") return;
    if (garagePhotoStatus) garagePhotoStatus.textContent = "Uploading photo…";
    garagePhotoBtn.disabled = true;
    try {
      const result = await onChangeGaragePhoto(file);
      if (garagePhotoStatus) {
        garagePhotoStatus.textContent = result?.success
          ? "Garage photo updated."
          : result?.error || "Could not update the garage photo.";
      }
    } catch (error) {
      if (garagePhotoStatus) {
        garagePhotoStatus.textContent = error.message || "Could not update the garage photo.";
      }
    } finally {
      garagePhotoBtn.disabled = false;
    }
  });

  if (isDriver) {
    bindDriverProfileHub(container, {
      onViewAllRequests,
      onBookMaintenance,
      onRedeemReward,
    });
    if (typeof onSaveVehicles === "function") {
      bindVehicleProfileUi(container, { profile, onSaveVehicles });
    }
  }
}
