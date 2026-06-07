/** Haversine distance in meters (same idea as Android Location.distanceBetween). */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceMeters(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

/** Shared room ID — sorted UIDs so app and web use the same Firestore chat doc. */
export function getChatRoomId(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();
  return `chat_${sortedIds[0]}_${sortedIds[1]}`;
}

/** Legacy Android room ID — driver UID always comes first. */
export function getLegacyDriverMechanicRoomId(driverId, mechanicId) {
  return `chat_${driverId}_${mechanicId}`;
}

/** All room IDs that may hold the same conversation (sorted + legacy). */
export function getAllChatRoomIds(driverId, mechanicId) {
  const sorted = getChatRoomId(driverId, mechanicId);
  const legacy = getLegacyDriverMechanicRoomId(driverId, mechanicId);
  return sorted === legacy ? [sorted] : [sorted, legacy];
}

/** Every conversation ID variant used by web/Android (order-independent). */
export function getAllConversationIdsForParticipants(userIdA, userIdB) {
  const sorted = getChatRoomId(userIdA, userIdB);
  const forward = `chat_${userIdA}_${userIdB}`;
  const reverse = `chat_${userIdB}_${userIdA}`;
  return [...new Set([sorted, forward, reverse])];
}

export function buildDriverMechanicConversationId(userIdA, userIdB) {
  return getChatRoomId(userIdA, userIdB);
}

function readLatLng(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    return { lat: latNum, lng: lngNum };
  }
  return null;
}

/** Read mechanic coordinates from fields used by web and Android. */
export function getMechanicPosition(mechanic) {
  if (!mechanic || typeof mechanic !== "object") return null;

  const candidates = [
    [mechanic.latitude, mechanic.longitude],
    [mechanic.lat, mechanic.lng],
    [mechanic.location?.latitude, mechanic.location?.longitude],
    [mechanic.lastKnownLocation?.latitude, mechanic.lastKnownLocation?.longitude],
    [mechanic.currentLocation?.latitude, mechanic.currentLocation?.longitude],
    [mechanic.geoLocation?.latitude, mechanic.geoLocation?.longitude],
  ];

  for (const [lat, lng] of candidates) {
    const position = readLatLng(lat, lng);
    if (position) return position;
  }
  return null;
}

export function isMechanicRole(role) {
  return String(role || "").trim().toLowerCase() === "mechanic";
}

/** Match mechanic skills to catalog service names (exact or case-insensitive). */
export function mechanicOffersService(mechanic, serviceName) {
  const target = String(serviceName || "").trim();
  if (!target) return false;
  const skills = Array.isArray(mechanic?.skills) ? mechanic.skills : [];
  const targetLower = target.toLowerCase();
  return skills.some((skill) => {
    const value = String(skill || "").trim();
    return value === target || value.toLowerCase() === targetLower;
  });
}
