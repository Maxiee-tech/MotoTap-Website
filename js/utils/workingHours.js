/** Weekly business hours — 24h "HH:mm", Africa/Nairobi by default. */

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEKDAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function defaultWorkingHours() {
  const weekday = { open: "08:00", close: "18:00", closed: false };
  const saturday = { open: "08:00", close: "13:00", closed: false };
  const sunday = { open: "00:00", close: "00:00", closed: true };
  return {
    timezone: "Africa/Nairobi",
    mon: { ...weekday },
    tue: { ...weekday },
    wed: { ...weekday },
    thu: { ...weekday },
    fri: { ...weekday },
    sat: { ...saturday },
    sun: { ...sunday },
  };
}

export function isValidTime24h(value) {
  return TIME_RE.test(String(value || "").trim());
}

function parseMinutes(value) {
  if (!isValidTime24h(value)) return null;
  const [h, m] = String(value).trim().split(":").map(Number);
  return h * 60 + m;
}

export function normalizeDayHours(raw) {
  if (!raw || typeof raw !== "object") {
    return { open: "08:00", close: "18:00", closed: true };
  }
  const closed = raw.closed === true;
  const open = isValidTime24h(raw.open) ? String(raw.open).trim() : "08:00";
  const close = isValidTime24h(raw.close) ? String(raw.close).trim() : "18:00";
  return { open, close, closed };
}

/** Normalize Firestore / form payload into a stable weekly map. */
export function normalizeWorkingHours(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {
    timezone: String(raw.timezone || "Africa/Nairobi").trim() || "Africa/Nairobi",
  };
  let anyOpen = false;
  for (const key of WEEKDAY_KEYS) {
    const day = normalizeDayHours(raw[key]);
    out[key] = day;
    if (!day.closed) anyOpen = true;
  }
  return anyOpen ? out : null;
}

/** True when at least one weekday is open with valid 24h times. */
export function hasValidWorkingHours(raw) {
  const hours = normalizeWorkingHours(raw);
  if (!hours) return false;
  return WEEKDAY_KEYS.some((key) => {
    const day = hours[key];
    if (!day || day.closed) return false;
    const openMin = parseMinutes(day.open);
    const closeMin = parseMinutes(day.close);
    return openMin != null && closeMin != null && closeMin > openMin;
  });
}

export function validateWorkingHours(raw) {
  const hours = normalizeWorkingHours(raw);
  if (!hours) return "Set working hours for at least one day.";
  for (const key of WEEKDAY_KEYS) {
    const day = hours[key];
    if (day.closed) continue;
    if (!isValidTime24h(day.open) || !isValidTime24h(day.close)) {
      return `${WEEKDAY_LABELS[key]}: use 24-hour times (e.g. 08:00).`;
    }
    const openMin = parseMinutes(day.open);
    const closeMin = parseMinutes(day.close);
    if (openMin == null || closeMin == null || closeMin <= openMin) {
      return `${WEEKDAY_LABELS[key]}: closing time must be after opening time.`;
    }
  }
  return "";
}

function weekdayKeyFromDate(date, timeZone) {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "Africa/Nairobi",
      weekday: "short",
    }).format(date);
    const map = {
      Mon: "mon",
      Tue: "tue",
      Wed: "wed",
      Thu: "thu",
      Fri: "fri",
      Sat: "sat",
      Sun: "sun",
    };
    return map[weekday] || null;
  } catch {
    const jsDay = date.getDay(); // 0=Sun
    return WEEKDAY_KEYS[(jsDay + 6) % 7];
  }
}

function minutesNowInZone(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone || "Africa/Nairobi",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return hour * 60 + minute;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

/**
 * @returns {{ isOpen: boolean, label: string, today: object|null }}
 */
export function getOpenClosedStatus(raw, now = new Date()) {
  const hours = normalizeWorkingHours(raw);
  if (!hours) {
    return { isOpen: false, label: "Hours not set", today: null };
  }
  const key = weekdayKeyFromDate(now, hours.timezone);
  const today = key ? hours[key] : null;
  if (!today || today.closed) {
    return { isOpen: false, label: "Closed", today };
  }
  const nowMin = minutesNowInZone(now, hours.timezone);
  const openMin = parseMinutes(today.open);
  const closeMin = parseMinutes(today.close);
  if (openMin == null || closeMin == null) {
    return { isOpen: false, label: "Closed", today };
  }
  if (nowMin >= openMin && nowMin < closeMin) {
    return { isOpen: true, label: `Open · closes ${today.close}`, today };
  }
  if (nowMin < openMin) {
    return { isOpen: false, label: `Closed · opens ${today.open}`, today };
  }
  return { isOpen: false, label: "Closed", today };
}

/** Read weekly hours from a form container with data-day rows. */
export function readWorkingHoursFromForm(root) {
  if (!root) return null;
  const out = { timezone: "Africa/Nairobi" };
  for (const key of WEEKDAY_KEYS) {
    const row = root.querySelector(`[data-day="${key}"]`);
    if (!row) {
      out[key] = { open: "08:00", close: "18:00", closed: true };
      continue;
    }
    const closed = Boolean(row.querySelector('[data-field="closed"]')?.checked);
    const open = String(row.querySelector('[data-field="open"]')?.value || "").trim();
    const close = String(row.querySelector('[data-field="close"]')?.value || "").trim();
    out[key] = { open, close, closed };
  }
  return out;
}

export function applyWorkingHoursToForm(root, raw) {
  if (!root) return;
  const hours = normalizeWorkingHours(raw) || defaultWorkingHours();
  for (const key of WEEKDAY_KEYS) {
    const row = root.querySelector(`[data-day="${key}"]`);
    if (!row) continue;
    const day = hours[key];
    const closedEl = row.querySelector('[data-field="closed"]');
    const openEl = row.querySelector('[data-field="open"]');
    const closeEl = row.querySelector('[data-field="close"]');
    if (closedEl) closedEl.checked = Boolean(day.closed);
    if (openEl) openEl.value = day.open;
    if (closeEl) closeEl.value = day.close;
    row.classList.toggle("is-closed", Boolean(day.closed));
    if (openEl) openEl.disabled = Boolean(day.closed);
    if (closeEl) closeEl.disabled = Boolean(day.closed);
  }
}

/** Build HTML for the weekly hours editor (24h time inputs). */
export function workingHoursFormHtml(idPrefix = "wh") {
  const rows = WEEKDAY_KEYS.map((key) => {
    const label = WEEKDAY_LABELS[key];
    return `
      <div class="working-hours-row" data-day="${key}">
        <span class="working-hours-day">${label}</span>
        <label class="working-hours-closed">
          <input type="checkbox" data-field="closed" />
          Closed
        </label>
        <input type="time" data-field="open" step="60" value="08:00" aria-label="${label} opens" />
        <span class="working-hours-sep">–</span>
        <input type="time" data-field="close" step="60" value="18:00" aria-label="${label} closes" />
      </div>`;
  }).join("");
  return `
    <div class="working-hours-editor" id="${idPrefix}-editor">
      <p class="signup-field-hint">Use 24-hour time (e.g. 08:00–18:00). Mark a day Closed if you do not open.</p>
      ${rows}
    </div>`;
}

export function bindWorkingHoursForm(root) {
  if (!root || root.dataset.whBound === "1") return;
  root.dataset.whBound = "1";
  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.field !== "closed") return;
    const row = target.closest("[data-day]");
    if (!row) return;
    const closed = target.checked;
    row.classList.toggle("is-closed", closed);
    row.querySelectorAll('[data-field="open"], [data-field="close"]').forEach((el) => {
      el.disabled = closed;
    });
  });
}
