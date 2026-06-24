import { isBusinessRole, normalizeUserRole } from "./geo.js";

/** True when a signed-in driver must verify email before using the app. */
export function driverNeedsEmailVerification(user, profile) {
  if (!user?.email || user.emailVerified) return false;
  return normalizeUserRole(profile?.role) === "driver";
}

/** Business accounts are not gated by email verification on the web app. */
export function accountRequiresEmailVerification(user, profile) {
  if (!user || isBusinessRole(profile?.role)) return false;
  return driverNeedsEmailVerification(user, profile);
}
