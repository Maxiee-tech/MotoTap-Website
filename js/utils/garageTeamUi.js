import FirebaseGarageService from "../services/FirebaseGarageService.js";
import { GarageMemberRole, GarageMemberStatus } from "../models/Garage.js";
import { ProfileStatus } from "../models/UserProfile.js";
import { escapeHtml } from "./html.js";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";

const garageService = new FirebaseGarageService();

function withTimeout(promise, timeoutMs = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout. Please try again.")), timeoutMs)
    ),
  ]);
}

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

async function syncJoinerApprovalIfNeeded(profile, member) {
  if (!profile?.id || !member) return profile;
  if (member.status !== GarageMemberStatus.ACTIVE) return profile;
  if (profile.status === ProfileStatus.APPROVED && profile.garageMemberStatus === GarageMemberStatus.ACTIVE) {
    return profile;
  }

  try {
    await withTimeout(
      updateDoc(doc(db, "users", profile.id), {
        status: ProfileStatus.APPROVED,
        garageMemberStatus: GarageMemberStatus.ACTIVE,
      })
    );
    return {
      ...profile,
      status: ProfileStatus.APPROVED,
      garageMemberStatus: GarageMemberStatus.ACTIVE,
    };
  } catch (error) {
    console.warn("Could not sync joiner approval status:", error);
    return profile;
  }
}

async function clearRejectedMembership(profile) {
  if (!profile?.id) return profile;
  try {
    await withTimeout(
      updateDoc(doc(db, "users", profile.id), {
        garageId: "",
        garageRole: "",
        garageMemberStatus: GarageMemberStatus.REMOVED,
      })
    );
  } catch (error) {
    console.warn("Could not clear rejected garage link:", error);
  }
  return {
    ...profile,
    garageId: "",
    garageRole: "",
    garageMemberStatus: GarageMemberStatus.REMOVED,
  };
}

/**
 * Render garage team panel on the mechanic dashboard.
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
  const pendingSection = document.getElementById("garage-pending-section");
  const pendingList = document.getElementById("garage-pending-list");
  const pendingSelfHint = document.getElementById("garage-pending-self-hint");
  const catalogSection = document.getElementById("garage-catalog-section");
  const jobsSection = document.getElementById("garage-jobs-section");

  if (!statusEl || !profile) return;

  setError("");
  statusEl.textContent = "Loading garage…";
  show(detailsEl, false);
  show(joinBox, false);
  show(catalogSection, false);
  show(jobsSection, false);
  show(pendingSection, false);
  if (pendingSelfHint) pendingSelfHint.hidden = true;
  cachedGarage = null;

  let workingProfile = profile;
  const uid = String(workingProfile.id || "").trim();
  let garageId = String(workingProfile.garageId || "").trim();
  let garage = null;

  try {
    // Never auto-create a garage mid-signup — that blocks "join with invite" on step 3.
    if (!garageId && workingProfile.onboardingComplete !== true) {
      statusEl.textContent = "Finish sign up to register or join a garage.";
      show(joinBox, false);
      onGarageReady?.({ garage: null, isOwner: false, members: [] });
      return;
    }

    if (!garageId) {
      statusEl.textContent = "Setting up your garage…";
      const ensured = await garageService.ensureOwnerGarage(uid, {
        name: workingProfile.name,
        institutionName: workingProfile.institutionName || workingProfile.name,
        address: workingProfile.address,
        latitude: workingProfile.latitude,
        longitude: workingProfile.longitude,
        garagePhotos: workingProfile.garagePhotos,
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
      workingProfile = { ...workingProfile, garageId };
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
    const selfMember = members.find((m) => m.uid === uid);
    const isOwner =
      garage.ownerId === uid || workingProfile.garageRole === GarageMemberRole.OWNER;

    if (!isOwner && selfMember?.status === GarageMemberStatus.REMOVED) {
      workingProfile = await clearRejectedMembership(workingProfile);
      await onProfileRefresh?.();
      statusEl.textContent = "Your join request was declined.";
      show(joinBox, true);
      onGarageReady?.({ garage: null, isOwner: false, members: [] });
      return;
    }

    if (!isOwner && selfMember?.status === GarageMemberStatus.ACTIVE) {
      workingProfile = await syncJoinerApprovalIfNeeded(workingProfile, selfMember);
      if (workingProfile.status === ProfileStatus.APPROVED) {
        await onProfileRefresh?.();
      }
    }

    const activeMembers = members.filter((m) => m.status === GarageMemberStatus.ACTIVE);
    const pendingMembers = members.filter((m) => m.status === GarageMemberStatus.PENDING);

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
    show(pendingSection, isOwner && pendingMembers.length > 0);

    const sectionTitle = document.getElementById("garage-section-title");
    const sectionBlurb = document.getElementById("garage-section-blurb");
    const roleBadge = document.getElementById("garage-team-role-badge");
    if (isOwner) {
      if (sectionTitle) sectionTitle.textContent = "My Garage";
      if (sectionBlurb) {
        sectionBlurb.textContent =
          "Invite mechanics who work with you, approve join requests, set garage make/model prices, and assign jobs across your team.";
      }
      if (roleBadge) {
        roleBadge.textContent = "Your role: Owner";
        roleBadge.classList.remove("hidden");
      }
    } else if (selfMember?.status === GarageMemberStatus.PENDING) {
      if (sectionTitle) sectionTitle.textContent = "My Garage Team";
      if (sectionBlurb) {
        sectionBlurb.textContent =
          "Your join request is waiting for the garage owner to approve.";
      }
      if (roleBadge) {
        roleBadge.textContent = "Your role: Pending approval";
        roleBadge.classList.remove("hidden");
      }
      if (pendingSelfHint) pendingSelfHint.hidden = false;
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
      membersList.innerHTML = activeMembers.length
        ? activeMembers
            .map(
              (member) => `
            <li>
              <span>${escapeHtml(member.displayName || "Mechanic")}</span>
              <span class="garage-member-role">${escapeHtml(member.role)}</span>
            </li>`
            )
            .join("")
        : `<li><span>No active team members yet</span></li>`;
    }

    if (pendingList) {
      pendingList.innerHTML = pendingMembers.length
        ? pendingMembers
            .map(
              (member) => `
            <li class="garage-pending-item" data-member-id="${escapeHtml(member.uid)}">
              <span>${escapeHtml(member.displayName || "Mechanic")}</span>
              <span class="garage-pending-actions">
                <button type="button" class="btn-primary garage-approve-btn" data-member-id="${escapeHtml(member.uid)}">Approve</button>
                <button type="button" class="btn-secondary garage-reject-btn" data-member-id="${escapeHtml(member.uid)}">Reject</button>
              </span>
            </li>`
            )
            .join("")
        : "";
    }

    onGarageReady?.({ garage, isOwner, members: activeMembers, pendingMembers });
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
  const pendingList = document.getElementById("garage-pending-list");

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
      if (result.pendingApproval) {
        setText("garage-team-status", "Join request sent. Waiting for owner approval.");
      }
    } catch (error) {
      setError(error.message || "Could not join garage.");
    } finally {
      joinBtn.disabled = false;
    }
  });

  pendingList?.addEventListener("click", async (event) => {
    const approveBtn = event.target.closest(".garage-approve-btn");
    const rejectBtn = event.target.closest(".garage-reject-btn");
    const btn = approveBtn || rejectBtn;
    if (!btn) return;
    const profile = getProfile?.();
    const memberId = btn.getAttribute("data-member-id");
    if (!profile?.garageId || !profile?.id || !memberId) return;

    btn.disabled = true;
    setError("");
    try {
      const result = approveBtn
        ? await garageService.approveMember(profile.garageId, profile.id, memberId)
        : await garageService.rejectMember(profile.garageId, profile.id, memberId);
      if (!result.success) {
        setError(result.error || "Could not update join request.");
        return;
      }
      setText(
        "garage-team-status",
        approveBtn ? "Mechanic approved." : "Join request rejected."
      );
      await renderGarageTeamPanel({
        profile: getProfile?.(),
        onProfileRefresh,
        onGarageReady,
      });
    } catch (error) {
      setError(error.message || "Could not update join request.");
    } finally {
      btn.disabled = false;
    }
  });
}

export { garageService };
