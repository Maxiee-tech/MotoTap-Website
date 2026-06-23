import { escapeHtml } from "./utils/html.js";
import { getActiveVehicle, vehicleDisplayName } from "./models/VehicleProfile.js";
import { getJobIssueType, sortJobsNewestFirst } from "./utils/jobSync.js";

const PROFILE_HUB_TABS = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "Service History" },
  { id: "reminders", label: "Reminders" },
  { id: "loyalty", label: "Loyalty Rewards" },
];

const LOYALTY_REWARDS = [
  { title: "Free Standard Car Wash", pointsRequired: 50 },
  { title: "10% Discount on Major Service", pointsRequired: 150 },
  { title: "Free Vehicle Diagnostic Scan", pointsRequired: 300 },
];

function getCompletedJobs(jobs = []) {
  return sortJobsNewestFirst(jobs).filter((job) => job.status === "COMPLETED");
}

function getVehicleName(profile) {
  const vehicle = getActiveVehicle(profile);
  return vehicle ? vehicleDisplayName(vehicle) : "Your vehicle";
}

function getNextServiceDate(jobs = []) {
  const completed = getCompletedJobs(jobs);
  const latest = completed[0];
  const date = new Date();

  if (latest?.createdAtMillis) {
    date.setTime(latest.createdAtMillis);
    date.setMonth(date.getMonth() + 4);
  } else {
    date.setMonth(date.getMonth() + 1);
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatJobDate(createdAtMillis) {
  if (!createdAtMillis) return "";
  return new Date(createdAtMillis).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatJobDateTime(createdAtMillis) {
  if (!createdAtMillis) return "";
  return new Date(createdAtMillis).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderHubSectionHeader(title) {
  return `<h5 class="profile-hub-section-title">${escapeHtml(title)}</h5>`;
}

function renderNotificationCard({ title, message, actionText, action }) {
  return `
    <article class="profile-hub-notice-card">
      <span class="material-symbols-outlined profile-hub-notice-icon" aria-hidden="true">event</span>
      <div class="profile-hub-notice-copy">
        <strong class="profile-hub-notice-title">${escapeHtml(title)}</strong>
        <p class="profile-hub-notice-message">${escapeHtml(message)}</p>
        ${
          actionText
            ? `<button type="button" class="profile-hub-notice-action" data-profile-hub-action="${escapeHtml(action)}">${escapeHtml(actionText)}</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderHubServiceItem(service, date, garage) {
  return `
    <div class="profile-hub-service-item">
      <span class="material-symbols-outlined profile-hub-service-check" aria-hidden="true">check</span>
      <strong class="profile-hub-service-name">${escapeHtml(service)}</strong>
      <div class="profile-hub-service-meta">
        <span>${escapeHtml(date)}</span>
        <span>${escapeHtml(garage)}</span>
      </div>
    </div>
  `;
}

function renderHubServiceList(
  jobs,
  { dateFormatter = formatJobDate, garageLabel = "MotoTap Service", limit = 3 } = {}
) {
  if (!jobs.length) {
    return `<p class="profile-muted profile-hub-empty">No history found</p>`;
  }

  const visibleJobs = limit == null ? jobs : jobs.slice(0, limit);

  return visibleJobs
    .map((job, index) => {
      const divider =
        index < visibleJobs.length - 1
          ? `<div class="profile-hub-service-divider" aria-hidden="true"></div>`
          : "";
      return `
        ${renderHubServiceItem(
          getJobIssueType(job),
          dateFormatter(job.createdAtMillis),
          garageLabel
        )}
        ${divider}
      `;
    })
    .join("");
}

function renderOverviewPanel(profile, jobs) {
  const completedJobs = getCompletedJobs(jobs);
  const latestJob = completedJobs[0];
  const vehicleName = getVehicleName(profile);
  const nextServiceDate = getNextServiceDate(jobs);
  const loyaltyPoints = Number(profile?.loyaltyPoints) || 0;

  return `
    <div class="profile-hub-panel" data-profile-panel="overview">
      ${renderNotificationCard({
        title: "Automated Service Reminders",
        message: `Reminder: ${vehicleName} is due for service on ${nextServiceDate}.`,
        actionText: "Book Now!",
        action: "book-maintenance",
      })}

      ${renderHubSectionHeader("Latest Service")}
      <article class="profile-hub-surface-card">
        ${
          latestJob
            ? `
              <strong class="profile-hub-latest-title">${escapeHtml(getJobIssueType(latestJob))}</strong>
              <p class="profile-muted">${escapeHtml(formatJobDate(latestJob.createdAtMillis))} at professional service</p>
            `
            : `<p class="profile-muted profile-hub-empty">No services yet</p>`
        }
      </article>

      ${renderHubSectionHeader("Service History")}
      <article class="profile-hub-surface-card profile-hub-surface-card--list">
        ${renderHubServiceList(completedJobs)}
        ${
          completedJobs.length > 3
            ? `<button type="button" class="profile-hub-more-btn" data-profile-hub-action="see-history">MORE...</button>`
            : ""
        }
      </article>

      <article class="profile-loyalty-card profile-hub-loyalty-inline">
        <h4 class="profile-block-title">Loyalty &amp; Rewards</h4>
        <p class="profile-loyalty-balance">Points Balance: ${escapeHtml(String(loyaltyPoints))}</p>
        <p class="profile-muted">Earn 10 points for every completed service!</p>
        ${
          loyaltyPoints >= 50
            ? `<p class="profile-hub-reward-available">✓ Reward Available: Free Car Wash</p>`
            : ""
        }
      </article>
    </div>
  `;
}

function renderHistoryPanel(jobs) {
  const completedJobs = getCompletedJobs(jobs);

  return `
    <div class="profile-hub-panel hidden" data-profile-panel="history">
      ${
        completedJobs.length
          ? `
            <article class="profile-hub-surface-card profile-hub-surface-card--list">
              ${renderHubServiceList(completedJobs, {
                dateFormatter: formatJobDateTime,
                garageLabel: "Professional Service",
                limit: null,
              })}
            </article>
            <button type="button" class="btn-primary profile-hub-view-all-btn" data-profile-hub-action="view-all-requests">
              View All Requests (More...)
            </button>
          `
          : `<p class="profile-muted profile-hub-empty profile-hub-empty--centered">No service history found</p>`
      }
    </div>
  `;
}

function renderRemindersPanel(profile, jobs) {
  const vehicleName = getVehicleName(profile);
  const nextServiceDate = getNextServiceDate(jobs);

  return `
    <div class="profile-hub-panel hidden" data-profile-panel="reminders">
      ${renderHubSectionHeader("Active Reminders")}
      ${renderNotificationCard({
        title: "Maintenance Due",
        message: `Reminder: ${vehicleName} is due for service on ${nextServiceDate}.`,
        actionText: "Book Now!",
        action: "book-maintenance",
      })}
      <article class="profile-hub-surface-card profile-hub-surface-card--list">
        <div class="profile-hub-reminder-item">
          <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span>Insurance Renewal: Pending</span>
        </div>
        <div class="profile-hub-reminder-item">
          <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span>Tire Rotation: Recommended</span>
        </div>
      </article>
    </div>
  `;
}

function renderLoyaltyPanel(profile) {
  const points = Number(profile?.loyaltyPoints) || 0;

  const rewardsMarkup = LOYALTY_REWARDS.map((reward) => {
    const isAvailable = points >= reward.pointsRequired;
    return `
      <article class="profile-hub-reward-item${isAvailable ? " profile-hub-reward-item--available" : ""}">
        <div class="profile-hub-reward-copy">
          <strong>${escapeHtml(reward.title)}</strong>
          <span>${escapeHtml(String(reward.pointsRequired))} pts</span>
        </div>
        <button type="button" class="profile-hub-reward-redeem" ${isAvailable ? "" : "disabled"}>
          Redeem
        </button>
      </article>
    `;
  }).join("");

  return `
    <div class="profile-hub-panel hidden" data-profile-panel="loyalty">
      <article class="profile-hub-loyalty-balance-card">
        <span class="profile-hub-loyalty-label">Current Balance</span>
        <strong class="profile-hub-loyalty-points">${escapeHtml(String(points))}</strong>
        <span class="profile-hub-loyalty-label">MotoTap Points</span>
      </article>
      ${renderHubSectionHeader("Available Rewards")}
      <div class="profile-hub-rewards-list">${rewardsMarkup}</div>
    </div>
  `;
}

export function renderDriverProfileHub(profile, jobs = []) {
  const tabsMarkup = PROFILE_HUB_TABS.map(
    (tab, index) => `
      <button
        type="button"
        class="profile-hub-tab${index === 0 ? " is-active" : ""}"
        role="tab"
        aria-selected="${index === 0 ? "true" : "false"}"
        data-profile-tab="${tab.id}"
      >
        ${escapeHtml(tab.label)}
      </button>
    `
  ).join("");

  return `
    <section class="profile-hub" id="profile-driver-hub">
      <div class="profile-hub-tabs" role="tablist" aria-label="Driver profile sections">
        ${tabsMarkup}
      </div>
      <div class="profile-hub-panels">
        ${renderOverviewPanel(profile, jobs)}
        ${renderHistoryPanel(jobs)}
        ${renderRemindersPanel(profile, jobs)}
        ${renderLoyaltyPanel(profile)}
      </div>
    </section>
  `;
}

function setActiveProfileHubTab(container, tabId) {
  container.querySelectorAll("[data-profile-tab]").forEach((button) => {
    const isActive = button.getAttribute("data-profile-tab") === tabId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  container.querySelectorAll("[data-profile-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.getAttribute("data-profile-panel") !== tabId);
  });
}

export function bindDriverProfileHub(
  container,
  { onViewAllRequests, onBookMaintenance } = {}
) {
  const hub = container.querySelector("#profile-driver-hub");
  if (!hub) return;

  hub.querySelectorAll("[data-profile-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-profile-tab");
      if (tabId) setActiveProfileHubTab(hub, tabId);
    });
  });

  hub.querySelectorAll("[data-profile-hub-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-profile-hub-action");
      if (action === "book-maintenance") {
        onBookMaintenance?.();
        return;
      }
      if (action === "see-history") {
        setActiveProfileHubTab(hub, "history");
        return;
      }
      if (action === "view-all-requests") {
        onViewAllRequests?.();
      }
    });
  });
}
