/**
 * Group mechanic map entries by garage so drivers see one pin per shop.
 * Solo mechanics (no garageId) stay as individual pins.
 *
 * @param {Array<{ id: string, mechanic: object, position: object|null, distanceMeters?: number|null }>} entries
 */
export function groupMechanicEntriesForMap(entries) {
  const solo = [];
  /** @type {Map<string, object>} */
  const byGarage = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (!entry?.position) return;

    const garageId = String(entry.mechanic?.garageId || "").trim();
    if (!garageId) {
      solo.push({
        type: "mechanic",
        id: entry.id,
        garageId: "",
        label: entry.mechanic?.name || "Mechanic",
        position: entry.position,
        entries: [entry],
        distanceMeters: entry.distanceMeters ?? null,
      });
      return;
    }

    if (!byGarage.has(garageId)) {
      byGarage.set(garageId, {
        type: "garage",
        id: `garage:${garageId}`,
        garageId,
        label:
          String(entry.mechanic?.institutionName || "").trim() ||
          entry.mechanic?.name ||
          "Garage",
        position: entry.position,
        entries: [],
        distanceMeters: entry.distanceMeters ?? null,
      });
    }

    const group = byGarage.get(garageId);
    group.entries.push(entry);

    const dist = entry.distanceMeters;
    if (
      typeof dist === "number" &&
      Number.isFinite(dist) &&
      (group.distanceMeters == null || dist < group.distanceMeters)
    ) {
      group.distanceMeters = dist;
      group.position = entry.position;
    }
  });

  const garageGroups = Array.from(byGarage.values()).map((group) => {
    // Prefer the closest member as the default bookable mechanic.
    const sorted = [...group.entries].sort((a, b) => {
      const da = a.distanceMeters;
      const db = b.distanceMeters;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
    return { ...group, entries: sorted };
  });

  return [...garageGroups, ...solo];
}

/** Pick the best member entry from a garage group for a given service (already filtered). */
export function pickDefaultMemberFromGroup(group) {
  if (!group?.entries?.length) return null;
  return group.entries[0];
}
