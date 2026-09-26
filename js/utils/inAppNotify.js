const TOAST_ID = "in-app-notify";
const DISPLAY_MS = 6000;

let audioCtx = null;
let audioUnlocked = false;

function ensureToast() {
  let el = document.getElementById(TOAST_ID);
  if (el) return el;
  el = document.createElement("button");
  el.id = TOAST_ID;
  el.type = "button";
  el.className = "in-app-notify hidden";
  el.setAttribute("role", "status");
  el.innerHTML =
    '<span class="in-app-notify-title"></span><span class="in-app-notify-body"></span>';
  document.body.appendChild(el);
  return el;
}

let permissionAsked = false;

function trySystemNotification(title, body, onClick) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const n = new Notification(title || "MotoTap", {
      body: body || "",
      icon: "/favicon.ico",
      silent: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
      onClick?.();
    };
  } catch {
    /* ignore */
  }
}

export function unlockNotificationAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    audioUnlocked = true;
  } catch {
    /* ignore */
  }
  if (
    !permissionAsked &&
    typeof Notification !== "undefined" &&
    Notification.permission === "default"
  ) {
    permissionAsked = true;
    Notification.requestPermission().catch(() => {});
  }
}

export function playNotificationSound() {
  unlockNotificationAudio();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const beep = (start, freq, duration) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };
    beep(now, 880, 0.12);
    beep(now + 0.14, 1175, 0.16);
  } catch {
    /* ignore */
  }
}

export function showInAppNotification({ title, body, onClick } = {}) {
  const el = ensureToast();
  const titleEl = el.querySelector(".in-app-notify-title");
  const bodyEl = el.querySelector(".in-app-notify-body");
  if (titleEl) titleEl.textContent = title || "MotoTap";
  if (bodyEl) bodyEl.textContent = body || "";
  el.classList.remove("hidden");
  el.onclick = () => {
    el.classList.add("hidden");
    onClick?.();
  };
  playNotificationSound();
  trySystemNotification(title, body, onClick);
  window.clearTimeout(el._hideTimer);
  el._hideTimer = window.setTimeout(() => {
    el.classList.add("hidden");
  }, DISPLAY_MS);
}
