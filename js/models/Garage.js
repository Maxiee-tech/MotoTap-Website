/**
 * Garage org model — keep field names aligned with Android when porting:
 * garages/{id}, members/{uid}, garageInvites/{code}, users.garageId / garageRole,
 * jobs.garageId, garages.skills / servicePrices.
 */
/** @typedef {'invited' | 'active' | 'removed'} GarageMemberStatus */
/** @typedef {'PENDING' | 'APPROVED' | 'REJECTED'} GarageStatus */

/** @typedef {Object} Garage
 * @property {string} id
 * @property {string} name
 * @property {string} address
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {string[]} garagePhotos
 * @property {string} ownerId
 * @property {GarageStatus} status
 * @property {string} inviteCode
 * @property {number} memberCount
 * @property {number} createdAtMillis
 * @property {number} updatedAtMillis
 */

/** @typedef {Object} GarageMember
 * @property {string} uid
 * @property {string} displayName
 * @property {GarageMemberRole} role
 * @property {GarageMemberStatus} status
 * @property {number} joinedAtMillis
 */

export const GarageMemberRole = {
  OWNER: "owner",
  MECHANIC: "mechanic",
};

export const GarageMemberStatus = {
  INVITED: "invited",
  ACTIVE: "active",
  REMOVED: "removed",
};

export const GarageStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const GARAGES_COLLECTION = "garages";
export const GARAGE_INVITES_COLLECTION = "garageInvites";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate a short shareable invite code (e.g. MT7K2Q). */
export function generateInviteCode(length = 6) {
  let code = "";
  const randomValues = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i += 1) {
      randomValues[i] = Math.floor(Math.random() * INVITE_ALPHABET.length);
    }
  }
  for (let i = 0; i < length; i += 1) {
    code += INVITE_ALPHABET[randomValues[i] % INVITE_ALPHABET.length];
  }
  return code;
}

export function normalizeInviteCode(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** @param {Partial<Garage> & Record<string, unknown>} data */
export function normalizeGarage(data = {}) {
  return {
    id: String(data.id || "").trim(),
    name: String(data.name || "").trim().slice(0, 120),
    address: String(data.address || "").trim().slice(0, 300),
    latitude:
      typeof data.latitude === "number" && Number.isFinite(data.latitude)
        ? data.latitude
        : null,
    longitude:
      typeof data.longitude === "number" && Number.isFinite(data.longitude)
        ? data.longitude
        : null,
    garagePhotos: Array.isArray(data.garagePhotos)
      ? data.garagePhotos.map((url) => String(url || "").trim()).filter(Boolean).slice(0, 5)
      : [],
    ownerId: String(data.ownerId || "").trim(),
    status: String(data.status || GarageStatus.PENDING).trim() || GarageStatus.PENDING,
    inviteCode: normalizeInviteCode(data.inviteCode),
    memberCount: Math.max(0, Number(data.memberCount) || 0),
    skills: Array.isArray(data.skills)
      ? data.skills.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 50)
      : [],
    servicePrices:
      data.servicePrices && typeof data.servicePrices === "object" && !Array.isArray(data.servicePrices)
        ? data.servicePrices
        : {},
    createdAtMillis: Number(data.createdAtMillis) || 0,
    updatedAtMillis: Number(data.updatedAtMillis) || 0,
  };
}

/** @param {Partial<GarageMember> & Record<string, unknown>} data */
export function normalizeGarageMember(data = {}) {
  return {
    uid: String(data.uid || data.id || "").trim(),
    displayName: String(data.displayName || "").trim().slice(0, 120),
    role:
      String(data.role || GarageMemberRole.MECHANIC).trim() === GarageMemberRole.OWNER
        ? GarageMemberRole.OWNER
        : GarageMemberRole.MECHANIC,
    status: String(data.status || GarageMemberStatus.ACTIVE).trim() || GarageMemberStatus.ACTIVE,
    joinedAtMillis: Number(data.joinedAtMillis) || 0,
  };
}
