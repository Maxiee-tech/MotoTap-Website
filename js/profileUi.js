import { escapeHtml } from "./utils/html.js";
import { normalizeUserRole } from "./utils/geo.js";
import { getJobIssueType, sortJobsNewestFirst } from "./utils/jobSync.js";
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
  return "";
}

export function getProfileInitial(name, email) {
  const source = String(name || email || "G").trim();
  return (source.charAt(0) || "G").toUpperCase();
}

function formatRoleLabel(role) {
  const normalized = normalizeUserRole(role);
  if (normalized === "mechanic") return "MECHANIC";
  if (normalized === "driver") return "DRIVER";
  return String(role || "USER").toUpperCase();
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

function getRewardProgressData(profile) {
  const loyaltyPoints = Number(profile?.loyaltyPoints) || 0;
  const membershipStatus = loyaltyPoints >= 100 ? "Gold Member" : "Silver Member";
  const pointsToNextReward = 50 - (loyaltyPoints % 50);

  return {
    loyaltyPoints,
    membershipStatus,
    pointsToNextReward,
  };
}

function renderRewardProgressCard(profile) {
  const { membershipStatus, pointsToNextReward } = getRewardProgressData(profile);

  return `
    <article class="profile-reward-progress-card">
      <span class="material-symbols-outlined profile-reward-progress-icon" aria-hidden="true">star</span>
      <div class="profile-reward-progress-copy">
        <strong class="profile-reward-progress-title">Reward Progress</strong>
        <span class="profile-reward-progress-status">${escapeHtml(membershipStatus)}</span>
      </div>
      <span class="profile-reward-progress-remaining">${escapeHtml(String(pointsToNextReward))} pts to next reward</span>
    </article>
  `;
}

function renderDriverExtras(profile, jobs = []) {
  return `
    ${renderDriverVehicleSection(profile)}
    ${renderRewardProgressCard(profile)}
    ${renderDriverProfileHub(profile, jobs)}
  `;
}

function renderMechanicExtras(profile) {
  return `
    <section class="profile-block">
      <h4 class="profile-block-title">Garage Details</h4>
      ${renderInfoCard("Institution", profile?.institutionName || "Not provided", "school")}
      ${renderInfoCard("Experience", profile?.experienceYears || "Not provided", "work_history")}
      ${renderInfoCard("Address", profile?.address || "Not provided", "location_on")}
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
  } = {}
) {
  if (!container) return;

  const role = normalizeUserRole(profile?.role);
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
            ? `<p class="profile-hero-points">Total Points: ${escapeHtml(String(profile?.loyaltyPoints || 0))}</p>`
            : ""
        }
        <div class="profile-info-grid profile-hero-info">
          ${renderInfoCard("Email Address", email || "Not available", "mail")}
          ${renderInfoCard("Phone Number", profile?.phone || "Not provided", "call")}
        </div>
      </div>
    </div>

    ${isDriver ? renderDriverExtras(profile, jobs) : renderMechanicExtras(profile)}

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

  if (isDriver) {
    bindDriverProfileHub(container, { onViewAllRequests, onBookMaintenance });
    if (typeof onSaveVehicles === "function") {
      bindVehicleProfileUi(container, { profile, onSaveVehicles });
    }
  }
}
