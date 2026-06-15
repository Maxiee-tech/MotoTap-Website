import { mechanicOffersService } from "./geo.js";

/** Same open-job statuses as Android FirestoreJobRepository.observeOpenJobs */
export const OPEN_JOB_STATUSES = ["REQUESTED", "MATCHING", "ASSIGNED"];

/** Mechanic request history (Android ongoing + completed jobs) */
export const MECHANIC_HISTORY_STATUSES = [
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAID",
  "CLOSED",
];

export function getJobIssueType(job) {
  return String(job?.issueType || job?.serviceName || "").trim();
}

export function normalizeJob(raw) {
  const issueType = getJobIssueType(raw);
  const createdAtMillis =
    raw?.createdAtMillis ??
    (typeof raw?.createdAt?.toMillis === "function"
      ? raw.createdAt.toMillis()
      : 0);

  return {
    ...raw,
    issueType,
    serviceName: raw?.serviceName || issueType,
    price: raw?.price ?? raw?.suggestedPrice ?? 0,
    createdAtMillis,
  };
}

export function isValidJobDocument(job) {
  return Boolean(job?.driverId && getJobIssueType(job));
}

export function normalizeJobList(docs) {
  return docs.map(normalizeJob).filter(isValidJobDocument);
}

/** Android MechanicDashboardViewModel newRequests + direct web bookings */
export function filterMechanicAvailableJobs(jobs, mechanicProfile) {
  const mechanicId = mechanicProfile?.id;
  const skills = mechanicProfile?.skills || [];

  return normalizeJobList(jobs).filter((job) => {
    if (job.status !== "REQUESTED") return false;

    if (job.mechanicId && job.mechanicId === mechanicId) {
      return true;
    }

    if (job.mechanicId) {
      return false;
    }

    if (!skills.length) {
      return true;
    }

    return mechanicOffersService(mechanicProfile, getJobIssueType(job));
  });
}

/** Android MechanicDashboardViewModel ongoing + later completed states */
export function filterMechanicHistoryJobs(jobs, mechanicId) {
  return normalizeJobList(jobs).filter(
    (job) =>
      job.mechanicId === mechanicId &&
      MECHANIC_HISTORY_STATUSES.includes(job.status)
  );
}

export function filterDriverHistoryJobs(jobs) {
  return normalizeJobList(jobs);
}

export function sortJobsNewestFirst(jobs) {
  return [...jobs].sort(
    (a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0)
  );
}
