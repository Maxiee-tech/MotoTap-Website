import FirebaseGarageService from "../services/FirebaseGarageService.js";
import { GarageMemberRole } from "../models/Garage.js";
import { escapeHtml } from "./html.js";

const garageService = new FirebaseGarageService();

/** @type {object | null} */
let cachedGarage = null;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

function setError(message) {
  const el = document.getElementById("garage-team-error");
  if (!el) return;
  el.textContent = message || "";
}

function show(el, visible) {
  el?.classList.toggle("hidden", !visible);
}

export function getCachedGarage() {
  return cachedGarage;
}

/**
 * Render garage team panel on the mechanic dashboard.
 * @param {{
 *   profile: object,
 *   onProfileRefresh?: () => Promise<void>,
 *   onGarageReady?: (payload: { garage: object, isOwner: boolean, members: object[] }) => void
 * }} options
 */
export async function renderGarageTeamPanel({
  profile,
  onProfileRefresh,
  onGarageReady,
} = {}) {
  const statusEl = document.getElementById("garage-team-status");
  const detailsEl = document.getElementById("garage-team-details");
  const joinBox = document.getElementById("garage-join-box");
  const inviteRow = document.getElementById("garage-invite-row");
  const inviteHint = document.getElementById("garage-invite-hint");
  const membersList = document.getElementById("garage-members-list");
  const catalogSection = document.getElementById("garage-catalog-section");
  const jobsSection = document.getElementById("garage-jobs-section");

  if (!statusEl || !profile) return;

  setError("");
  statusEl.textContent = "Loading garage…";
  show(detailsEl, false);
  show(joinBox, false);
  show(catalogSection, false);
  show(jobsSection, false);
  cachedGarage = null;

  const uid = String(profile.id || "").trim();
  let garageId = String(profile.garageId || "").trim();
  let garage = null;

  try {
    // Never auto-create a garage mid-signup — that blocks "join with invite" on step 3.
    if (!garageId && profile.onboardingComplete !== true) {
      statusEl.textContent = "Finish sign up to register or join a garage.";
      show(joinBox, false);
      onGarageReady?.({ garage: null, isOwner: false, members: [] });
      return;
    }

    if (!garageId) {
      statusEl.textContent = "Setting up your garage…";
      const ensured = await garageService.ensureOwnerGarage(uid, {
        name: profile.name,
        institutionName: profile.institutionName || profile.name,
        address: profile.address,
        latitude: profile.latitude,
        longitude: profile.longitude,
        garagePhotos: profile.garagePhotos,
      });
      if (!ensured.success) {
        statusEl.textContent = "Could not set up garage.";
        setError(ensured.error || "Garage setup failed.");
        show(joinBox, true);
        onGarageReady?.({ garage: null, isOwner: false, members: [] });
        return;
      }
      garage = ensured.garage;
      garageId = garage?.id || "";
      await onProfileRefresh?.();
    } else {
      garage = await garageService.getGarage(garageId);
    }

    if (!garage) {
      statusEl.textContent = "Garage not found.";
      show(joinBox, true);
      onGarageReady?.({ garage: null, isOwner: false, members: [] });
      return;
    }

    const members = await garageService.listMembers(garage.id);
    const isOwner =
      garage.ownerId === uid || profile.garageRole === GarageMemberRole.OWNER;

    cachedGarage = garage;
    statusEl.textContent = "";
    show(detailsEl, true);
    setText("garage-team-name", garage.name || "Garage");
    setText("garage-team-address", garage.address || "Location on file");
    setText("garage-invite-code", garage.inviteCode || "—");
    show(inviteRow, isOwner);
    show(inviteHint, isOwner);
    show(catalogSection, isOwner);
    show(jobsSection, isOwner);
    show(joinBox, false);

    const sectionTitle = document.getElementById("garage-section-title");
    const sectionBlurb = document.getElementById("garage-section-blurb");
    const roleBadge = document.getElementById("garage-team-role-badge");
    if (isOwner) {
      if (sectionTitle) sectionTitle.textContent = "My Garage";
      if (sectionBlurb) {
        sectionBlurb.textContent =
          "Invite mechanics who work with you, set garage make/model prices, and assign jobs across your team.";
      }
      if (roleBadge) {
        roleBadge.textContent = "Your role: Owner";
        roleBadge.classList.remove("hidden");
      }
    } else {
      if (sectionTitle) sectionTitle.textContent = "My Garage Team";
      if (sectionBlurb) {
        sectionBlurb.textContent =
          "You joined this garage with an invite code. Tick the services you deliver below. Prices come from the garage owner.";
      }
      if (roleBadge) {
        roleBadge.textContent = "Your role: Mechanic (team member)";
        roleBadge.classList.remove("hidden");
      }
    }

    if (membersList) {
      membersList.innerHTML = members.length
        ? members
            .map(
              (member) => `
            <li>
              <span>${escapeHtml(member.displayName || "Mechanic")}</span>
              <span class="garage-member-role">${escapeHtml(member.role)}</span>
            </li>`
            )
            .join("")
        : `<li><span>No team members yet</span></li>`;
    }

    onGarageReady?.({ garage, isOwner, members });
  } catch (error) {
    console.error("renderGarageTeamPanel error:", error);
    statusEl.textContent = "Unable to load garage.";
    setError(error.message || "Unable to load garage.");
    show(joinBox, true);
    onGarageReady?.({ garage: null, isOwner: false, members: [] });
  }
}

export function bindGarageTeamPanel({ getProfile, onProfileRefresh, onGarageReady } = {}) {
  const copyBtn = document.getElementById("garage-copy-invite-btn");
  const refreshBtn = document.getElementById("garage-refresh-invite-btn");
  const joinBtn = document.getElementById("garage-join-btn");

  copyBtn?.addEventListener("click", async () => {
    const code = document.getElementById("garage-invite-code")?.textContent?.trim();
    if (!code || code === "—") return;
    try {
      await navigator.clipboard.writeText(code);
      setError("");
      setText("garage-team-status", "Invite code copied.");
    } catch {
      setError("Could not copy invite code.");
    }
  });

  refreshBtn?.addEventListener("click", async () => {
    const profile = getProfile?.();
    if (!profile?.garageId || !profile?.id) return;
    refreshBtn.disabled = true;
    try {
      const result = await garageService.regenerateInviteCode(profile.garageId, profile.id);
      if (!result.success) {
        setError(result.error || "Could not refresh invite code.");
        return;
      }
      setText("garage-invite-code", result.inviteCode);
      setText("garage-team-status", "New invite code ready.");
      setError("");
      if (cachedGarage) {
        cachedGarage = { ...cachedGarage, inviteCode: result.inviteCode };
      }
    } catch (error) {
      setError(error.message || "Could not refresh invite code.");
    } finally {
      refreshBtn.disabled = false;
    }
  });

  joinBtn?.addEventListener("click", async () => {
    const profile = getProfile?.();
    const code = document.getElementById("garage-join-code-input")?.value || "";
    if (!profile?.id) return;
    joinBtn.disabled = true;
    setError("");
    try {
      const result = await garageService.joinGarageWithInvite(profile.id, code, {
        name: profile.name,
      });
      if (!result.success) {
        setError(result.error || "Could not join garage.");
        return;
      }
      await onProfileRefresh?.();
      await renderGarageTeamPanel({
        profile: getProfile?.(),
        onProfileRefresh,
        onGarageReady,
      });
    } catch (error) {
      setError(error.message || "Could not join garage.");
    } finally {
      joinBtn.disabled = false;
    }
  });
}

export { garageService };
