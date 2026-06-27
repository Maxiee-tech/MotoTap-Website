import { isBusinessRole, normalizeUserRole } from "./geo.js";

/**
 * Legacy accounts predate the multi-step signup and email-verification feature.
 * They carry no onboarding metadata (no numeric onboardingStep, onboardingComplete
 * not true). They must not be locked out of an account they already use, so they
 * are exempt from the email-verification gate — same heuristic as legacy login.
 */
function isLegacyAccount(profile) {
  if (!profile) return false;
  if (profile.onboardingComplete === true) return false;
  const step = Number(profile.onboardingStep);
  if (Number.isFinite(step) && step >= 1) return false;
  return true;
}

/** True when a signed-in driver must verify email before using the app. */
export function driverNeedsEmailVerification(user, profile) {
  if (!user?.email || user.emailVerified) return false;
  if (normalizeUserRole(profile?.role) !== "driver") return false;
  // Don't block accounts created before email verification was introduced.
  if (isLegacyAccount(profile)) return false;
  return true;
}

/** Business accounts are not gated by email verification on the web app. */
export function accountRequiresEmailVerification(user, profile) {
  if (!user || isBusinessRole(profile?.role)) return false;
  return driverNeedsEmailVerification(user, profile);
}
