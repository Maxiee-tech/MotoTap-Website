/**
 * Loyalty points are derived so they can't drift or double-count:
 *   earned    = completed services × POINTS_PER_SERVICE
 *   redeemed  = sum of points spent on rewards (redeemedRewards[])
 *   available = earned − redeemed (never negative)
 *
 * This keeps web self-consistent on the Spark plan (no Cloud Functions):
 * earning recomputes from job history on every load, redemption only
 * appends to redeemedRewards.
 */
export const POINTS_PER_SERVICE = 10;

/** Terminal job states that count as a finished, points-earning service. */
const EARNING_JOB_STATUSES = ["COMPLETED", "PAID", "CLOSED"];

export function getEarningServiceCount(jobs = []) {
  return jobs.filter((job) => EARNING_JOB_STATUSES.includes(job?.status)).length;
}

export function getRedeemedRewards(profile) {
  return Array.isArray(profile?.redeemedRewards) ? profile.redeemedRewards : [];
}

export function getRedeemedPoints(profile) {
  return getRedeemedRewards(profile).reduce(
    (total, entry) => total + (Number(entry?.points) || 0),
    0
  );
}

export function computeLoyalty(profile, jobs = []) {
  const completedServices = getEarningServiceCount(jobs);
  const earned = completedServices * POINTS_PER_SERVICE;
  const redeemed = getRedeemedPoints(profile);
  const available = Math.max(0, earned - redeemed);

  return {
    completedServices,
    earned,
    redeemed,
    available,
  };
}
