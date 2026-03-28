/**
 * Charts dock slide-in drawer: edge tab toggles panel; compact scrim; localStorage; map resize event.
 * Default: open on wide viewports, closed on compact when no stored preference.
 */
const STORAGE_KEY = "charts-dock-drawer-open";
const COMPACT_MQ = window.matchMedia("(max-width: 768px)");

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
  tabBtn.setAttribute("aria-label", label);
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
}

init();
