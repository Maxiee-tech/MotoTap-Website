/** Additional services documented on a job card (web + Android). */

export const ADDITIONAL_SERVICE_NOTE_STATUSES = [
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAID",
];

export const MAX_ADDITIONAL_SERVICES = 30;
export const MAX_ADDITIONAL_SERVICE_TEXT = 500;

const AUTHOR_ROLES = new Set(["driver", "mechanic", "garage"]);

/** @param {unknown} raw */
export function normalizeAdditionalServices(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const text = String(item.text || "").trim();
      if (!text) return null;
      const role = String(item.authorRole || "").trim().toLowerCase();
      return {
        id: String(item.id || "").trim(),
        authorId: String(item.authorId || "").trim(),
        authorRole: AUTHOR_ROLES.has(role) ? role : "mechanic",
        authorName: String(item.authorName || "").trim().slice(0, 120),
        text: text.slice(0, MAX_ADDITIONAL_SERVICE_TEXT),
        createdAtMillis: Number(item.createdAtMillis) || 0,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_ADDITIONAL_SERVICES);
}

export function additionalServiceAuthorLabel(note) {
  const name = String(note?.authorName || "").trim();
  const role = String(note?.authorRole || "").trim();
  if (role === "driver") return name ? `${name} (client)` : "Client";
  if (role === "garage") return name ? `${name} (garage)` : "Garage";
  return name ? `${name} (mechanic)` : "Mechanic";
}

export function canAddAdditionalServiceNote(
  job,
  { userId, isGarageOwner = false, isGarageMember = false } = {}
) {
  const uid = String(userId || "").trim();
  if (!job?.id || !uid) return false;
  if (!ADDITIONAL_SERVICE_NOTE_STATUSES.includes(String(job.status || ""))) return false;
  if (normalizeAdditionalServices(job.additionalServices).length >= MAX_ADDITIONAL_SERVICES) {
    return false;
  }
  if (String(job.driverId || "") === uid) return true;
  if (String(job.mechanicId || "") === uid) return true;
  if (String(job.garageId || "").trim() && (isGarageOwner || isGarageMember)) return true;
  return false;
}

export function resolveAdditionalServiceAuthorRole(
  job,
  { userId, isGarageOwner = false, isGarageMember = false } = {}
) {
  const uid = String(userId || "").trim();
  if (String(job?.driverId || "") === uid) return "driver";
  if (isGarageOwner) return "garage";
  if (String(job?.mechanicId || "") === uid) return "mechanic";
  if (isGarageMember) return "garage";
  return "mechanic";
}

export function createAdditionalServiceNote({ userId, authorRole, authorName, text }) {
  const cleaned = String(text || "").trim().slice(0, MAX_ADDITIONAL_SERVICE_TEXT);
  const role = String(authorRole || "").trim().toLowerCase();
  return {
    id: `asn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    authorId: String(userId || "").trim(),
    authorRole: AUTHOR_ROLES.has(role) ? role : "mechanic",
    authorName: String(authorName || "").trim().slice(0, 120),
    text: cleaned,
    createdAtMillis: Date.now(),
  };
}
