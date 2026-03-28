/**
 * Resizable charts dock: updates --charts-panel-width, persists to localStorage.
 */
import { STORAGE_KEYS } from "./dock-constants.js";

const STORAGE_KEY = STORAGE_KEYS.PANEL_WIDTH;
const MIN_WIDTH = 280;
const KEYBOARD_STEP = 16;
function maxPanelWidth() {
  return Math.min(720, Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.9)));
}

function clampWidth(w) {
  const maxW = maxPanelWidth();
  return Math.min(maxW, Math.max(MIN_WIDTH, Math.round(w)));
}

function readStoredWidth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function applyWidthPx(w) {
  document.documentElement.style.setProperty(
    "--charts-panel-width",
    `${clampWidth(w)}px`
  );
}

function persistWidth(w) {
  try {
    localStorage.setItem(STORAGE_KEY, String(clampWidth(w)));
  } catch {
    /* ignore */
  }
}

function clearStoredWidth() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  document.documentElement.style.removeProperty("--charts-panel-width");
}

function initSavedWidth() {
  const stored = readStoredWidth();
  if (stored != null) {
    applyWidthPx(stored);
  }
}

function widthFromPointerClientX(clientX) {
  return window.innerWidth - clientX;
}

function initResizeHandle() {
  const dock = document.getElementById("charts-dock");
  const handle = document.getElementById("charts-dock-resize-handle");
  if (!dock || !handle) return;

  let dragging = false;

  function setDragging(on) {
    dragging = on;
    dock.classList.toggle("charts-dock--resizing", on);
    document.body.classList.toggle("charts-dock-resize-active", on);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    applyWidthPx(widthFromPointerClientX(e.clientX));
  }

  function endDrag(e) {
    if (!dragging) return;
    setDragging(false);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    const w = dock.getBoundingClientRect().width;
    persistWidth(w);
    window.dispatchEvent(
      new CustomEvent("charts-dock-drawer-toggle", { detail: { open: true } })
    );
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch {
      /* not capturing */
    }
  }

  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    handle.setPointerCapture(e.pointerId);
    applyWidthPx(widthFromPointerClientX(e.clientX));
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  });

  handle.addEventListener("dblclick", (e) => {
    e.preventDefault();
    clearStoredWidth();
  });

  handle.addEventListener("keydown", (e) => {
    const current = dock.getBoundingClientRect().width;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      applyWidthPx(current + KEYBOARD_STEP);
      persistWidth(dock.getBoundingClientRect().width);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      applyWidthPx(current - KEYBOARD_STEP);
      persistWidth(dock.getBoundingClientRect().width);
    }
  });
}

initSavedWidth();
initResizeHandle();

window.addEventListener("resize", () => {
  const stored = readStoredWidth();
  if (stored != null) applyWidthPx(stored);
});
