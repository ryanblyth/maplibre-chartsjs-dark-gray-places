/**
 * Charts dock slide-in drawer: edge tab toggles panel; compact scrim; localStorage; map resize event.
 * Default: open on wide viewports, closed on compact when no stored preference.
 */
import { STORAGE_KEYS, COMPACT_BREAKPOINT, TOUCH_SWIPE_GESTURE } from "./dock-constants.js";

const STORAGE_KEY = STORAGE_KEYS.DRAWER_OPEN;
const COMPACT_MQ = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT}px)`);

const dock = document.getElementById("charts-dock");
const slideEl = document.getElementById("charts-dock-slide");
const tabBtn = document.getElementById("charts-dock-drawer-tab");
const scrim = document.getElementById("charts-dock-scrim");
const valuesToggle = document.getElementById("charts-dock-values-toggle");

function readStoredOpen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    /* ignore */
  }
  return null;
}

function persistOpen(open) {
  try {
    localStorage.setItem(STORAGE_KEY, open ? "true" : "false");
  } catch {
    /* ignore */
  }
}

function isCompact() {
  return COMPACT_MQ.matches;
}

function updateScrim(open) {
  if (!scrim) return;
  const show = open && isCompact();
  scrim.hidden = !show;
  scrim.setAttribute("aria-hidden", show ? "false" : "true");
}

function updateTabUi(open) {
  if (!tabBtn) return;
  const label = open ? "Hide charts" : "Show charts";
  tabBtn.textContent = label;
  tabBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function applyDrawerOpen(open, focusTarget = null) {
  if (!dock) return;
  const closed = !open;
  dock.classList.toggle("charts-dock--closed", closed);
  if (slideEl) {
    slideEl.setAttribute("aria-hidden", closed ? "true" : "false");
  }

  updateTabUi(open);
  updateScrim(open);
  persistOpen(open);

  window.dispatchEvent(
    new CustomEvent("charts-dock-drawer-toggle", { detail: { open } })
  );

  if (focusTarget && typeof focusTarget.focus === "function") {
    requestAnimationFrame(() => focusTarget.focus());
  }
}

function isDrawerOpen() {
  return dock ? !dock.classList.contains("charts-dock--closed") : true;
}

function openDrawer() {
  applyDrawerOpen(true, valuesToggle ?? null);
}

function closeDrawer() {
  applyDrawerOpen(false, tabBtn);
}

function onTabClick() {
  if (isDrawerOpen()) closeDrawer();
  else openDrawer();
}

function onCompactChange() {
  const open = isDrawerOpen();
  updateScrim(open);
}

function init() {
  if (!dock) return;

  const stored = readStoredOpen();
  const desiredOpen = stored === null ? !isCompact() : stored;
  const actualOpen = !dock.classList.contains("charts-dock--closed");

  if (desiredOpen !== actualOpen) {
    applyDrawerOpen(desiredOpen, null);
  } else {
    updateScrim(actualOpen);
    if (slideEl) {
      slideEl.setAttribute("aria-hidden", actualOpen ? "false" : "true");
    }
    updateTabUi(actualOpen);
  }

  tabBtn?.addEventListener("click", onTabClick);
  scrim?.addEventListener("click", () => closeDrawer());

  if (typeof COMPACT_MQ.addEventListener === "function") {
    COMPACT_MQ.addEventListener("change", onCompactChange);
  } else if (typeof COMPACT_MQ.addListener === "function") {
    COMPACT_MQ.addListener(onCompactChange);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!dock || dock.classList.contains("charts-dock--closed")) return;
    closeDrawer();
  });

  // Swipe-to-close gesture (touch devices)
  const {
    THRESHOLD_PX: SWIPE_THRESHOLD_PX,
    THRESHOLD_RATIO: SWIPE_THRESHOLD_RATIO,
    VELOCITY_MIN: SWIPE_VELOCITY_MIN,
    DIRECTION_LOCK_PX,
  } = TOUCH_SWIPE_GESTURE;
  const reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const resizeHandle = document.getElementById("charts-dock-resize-handle");

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let swiping = false;
  let directionLocked = false;

  dock.addEventListener("touchstart", (e) => {
    if (!isDrawerOpen()) return;
    if (resizeHandle && resizeHandle.contains(e.target)) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    swiping = false;
    directionLocked = false;
  }, { passive: true });

  dock.addEventListener("touchmove", (e) => {
    if (!isDrawerOpen()) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (!directionLocked) {
      if (Math.abs(deltaX) < DIRECTION_LOCK_PX && Math.abs(deltaY) < DIRECTION_LOCK_PX) return;
      directionLocked = true;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return; // vertical scroll
      swiping = true;
    }

    if (!swiping) return;

    const clamped = Math.max(0, deltaX);
    if (reducedMotionMQ.matches) return;
    dock.style.transition = "none";
    dock.style.transform = `translateX(${clamped}px)`;
  }, { passive: true });

  dock.addEventListener("touchend", () => {
    if (!swiping) return;
    swiping = false;
    directionLocked = false;

    const elapsed = Date.now() - startTime || 1;
    const finalDeltaX = (parseFloat(dock.style.transform.replace(/[^0-9.-]/g, "")) || 0);
    const dockWidth = dock.offsetWidth || 300;
    const threshold = Math.min(SWIPE_THRESHOLD_PX, dockWidth * SWIPE_THRESHOLD_RATIO);
    const velocity = finalDeltaX / elapsed;

    dock.style.transition = "";
    dock.style.transform = "";

    if (finalDeltaX > threshold || velocity > SWIPE_VELOCITY_MIN) {
      closeDrawer();
    }
  }, { passive: true });

  dock.addEventListener("touchcancel", () => {
    if (!swiping) return;
    swiping = false;
    directionLocked = false;
    dock.style.transition = "";
    dock.style.transform = "";
  }, { passive: true });

  // Swipe-to-open gesture on the tab button (touch devices)
  if (tabBtn) {
    let openStartX = 0;
    let openStartY = 0;
    let openStartTime = 0;
    let lastOpenDeltaX = 0;
    let swipingOpen = false;
    let directionLockedOpen = false;

    tabBtn.addEventListener("touchstart", (e) => {
      if (isDrawerOpen()) return;
      const touch = e.touches[0];
      openStartX = touch.clientX;
      openStartY = touch.clientY;
      openStartTime = Date.now();
      lastOpenDeltaX = 0;
      swipingOpen = false;
      directionLockedOpen = false;
    }, { passive: true });

    tabBtn.addEventListener("touchmove", (e) => {
      if (isDrawerOpen()) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - openStartX;
      const deltaY = touch.clientY - openStartY;

      if (!directionLockedOpen) {
        if (Math.abs(deltaX) < DIRECTION_LOCK_PX && Math.abs(deltaY) < DIRECTION_LOCK_PX) return;
        directionLockedOpen = true;
        if (Math.abs(deltaY) > Math.abs(deltaX) || deltaX > 0) return;
        swipingOpen = true;
      }

      if (!swipingOpen) return;

      lastOpenDeltaX = Math.min(0, deltaX);
      if (reducedMotionMQ.matches) return;
      dock.style.transition = "none";
      dock.style.transform = `translateX(calc(100% + ${lastOpenDeltaX}px))`;
    }, { passive: true });

    tabBtn.addEventListener("touchend", () => {
      if (!swipingOpen) return;
      swipingOpen = false;
      directionLockedOpen = false;

      const elapsed = Date.now() - openStartTime || 1;
      const dragPx = Math.abs(lastOpenDeltaX);
      const dockWidth = dock.offsetWidth || 300;
      const threshold = Math.min(SWIPE_THRESHOLD_PX, dockWidth * SWIPE_THRESHOLD_RATIO);
      const velocity = dragPx / elapsed;

      dock.style.transition = "";
      dock.style.transform = "";

      if (dragPx > threshold || velocity > SWIPE_VELOCITY_MIN) {
        openDrawer();
      }
    }, { passive: true });

    tabBtn.addEventListener("touchcancel", () => {
      if (!swipingOpen) return;
      swipingOpen = false;
      directionLockedOpen = false;
      lastOpenDeltaX = 0;
      dock.style.transition = "";
      dock.style.transform = "";
    }, { passive: true });
  }
}

init();
