import { placesDensityPaletteBase } from "./placesDensityPalette.js";
import { TOUCH_SWIPE_GESTURE } from "../dock-constants.js";

function formatCount(n) {
  return n.toLocaleString("en-US");
}

/**
 * Labels for each `step` bin: matches MapLibre
 * `["step", input, default, t0, c0, t1, c1, ...]`
 */
export function buildDensityLegendBins(palette = placesDensityPaletteBase) {
  const { defaultFillColor, ranges } = palette;
  const sorted = [...ranges].sort((a, b) => a.threshold - b.threshold);
  if (sorted.length === 0) {
    return [{ fillColor: defaultFillColor, label: "No data" }];
  }

  const bins = [
    {
      fillColor: defaultFillColor,
      label: `< ${formatCount(sorted[0].threshold)}`,
    },
  ];

  for (let i = 0; i < sorted.length; i += 1) {
    const t = sorted[i].threshold;
    const fillColor = sorted[i].fillColor;
    if (i < sorted.length - 1) {
      const next = sorted[i + 1].threshold;
      bins.push({
        fillColor,
        label: `${formatCount(t)}–${formatCount(next - 1)}`,
      });
    } else {
      bins.push({
        fillColor,
        label: `≥ ${formatCount(t)}`,
      });
    }
  }

  return bins;
}

/** Collapsible region id (mirrors charts-dock-slide + aria-controls). */
const LEGEND_SLIDE_ID = "density-legend-panel";

function setLegendCollapsed(container, toggle, collapsed) {
  container.classList.toggle("density-legend--collapsed", collapsed);
  toggle.textContent = collapsed ? "Show legend" : "Hide legend";
  toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
}

/** Clear inline swipe styles so CSS transition on .density-legend__slide applies (charts-dock pattern). */
function clearLegendSlideInlineStyles(slide) {
  slide.style.transition = "";
  slide.style.transform = "";
}

/**
 * MapLibre IControl: population density ramp (bottom-left). DOM mirrors charts dock:
 * `.density-legend__slide` (transform + collapse) + `.density-legend__inner` (padding only) + toggle sibling.
 * Touch swipe uses `TOUCH_SWIPE_GESTURE` like charts-dock-drawer.
 */
export class DensityLegendControl {
  onAdd() {
    const {
      THRESHOLD_PX,
      THRESHOLD_RATIO,
      VELOCITY_MIN,
      DIRECTION_LOCK_PX,
    } = TOUCH_SWIPE_GESTURE;

    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group density-legend";
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", "Population density legend");

    const slide = document.createElement("div");
    slide.className = "density-legend__slide";
    slide.id = LEGEND_SLIDE_ID;

    const inner = document.createElement("div");
    inner.className = "density-legend__inner";

    const title = document.createElement("div");
    title.className = "density-legend__title";
    title.textContent = "Population density";

    const unit = document.createElement("div");
    unit.className = "density-legend__unit";
    unit.textContent = "people per mi²";

    const list = document.createElement("ul");
    list.className = "density-legend__list";

    for (const { fillColor, label } of buildDensityLegendBins()) {
      const li = document.createElement("li");
      li.className = "density-legend__row";

      const swatch = document.createElement("span");
      swatch.className = "density-legend__swatch";
      swatch.style.backgroundColor = fillColor;
      swatch.setAttribute("aria-hidden", "true");

      const text = document.createElement("span");
      text.className = "density-legend__label";
      text.textContent = label;

      li.append(swatch, text);
      list.appendChild(li);
    }

    inner.append(title, unit, list);
    slide.appendChild(inner);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "density-legend__toggle";
    toggle.textContent = "Hide legend";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-controls", LEGEND_SLIDE_ID);

    const onToggleClick = () => {
      const collapsed = container.classList.contains("density-legend--collapsed");
      setLegendCollapsed(container, toggle, !collapsed);
    };
    toggle.addEventListener("click", onToggleClick);

    container.append(slide, toggle);

    const reducedMotionMQ =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : { matches: false };

    // Swipe-to-close on slide (vertical analogue of charts-dock translateX on #charts-dock)
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let swiping = false;
    let directionLocked = false;
    let lastDeltaY = 0;

    container.addEventListener(
      "touchstart",
      (e) => {
        if (container.classList.contains("density-legend--collapsed")) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        swiping = false;
        directionLocked = false;
        lastDeltaY = 0;
      },
      { passive: true }
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        if (container.classList.contains("density-legend--collapsed")) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (!directionLocked) {
          if (
            Math.abs(deltaX) < DIRECTION_LOCK_PX &&
            Math.abs(deltaY) < DIRECTION_LOCK_PX
          ) {
            return;
          }
          directionLocked = true;
          if (Math.abs(deltaX) > Math.abs(deltaY)) return;
          swiping = true;
        }

        if (!swiping) return;

        lastDeltaY = Math.max(0, deltaY);
        if (reducedMotionMQ.matches) return;
        slide.style.transition = "none";
        slide.style.transform = `translate3d(0, ${lastDeltaY}px, 0)`;
      },
      { passive: true }
    );

    container.addEventListener(
      "touchend",
      () => {
        if (!swiping) return;
        swiping = false;
        directionLocked = false;

        const elapsed = Date.now() - startTime || 1;
        const finalDeltaY = lastDeltaY;
        const refHeight = slide.offsetHeight || 200;
        const threshold = Math.min(THRESHOLD_PX, refHeight * THRESHOLD_RATIO);
        const velocity = finalDeltaY / elapsed;

        const committed =
          finalDeltaY > threshold || velocity > VELOCITY_MIN;

        if (committed) {
          // Avoid CSS transform transition snapping back to 0 before max-height runs (double motion).
          slide.style.transition = "none";
          slide.style.transform = "translate3d(0, 0, 0)";
          setLegendCollapsed(container, toggle, true);
          requestAnimationFrame(() => {
            slide.style.transition = "";
            slide.style.transform = "";
          });
        } else {
          slide.style.transition = "";
          slide.style.transform = "";
        }

        lastDeltaY = 0;
      },
      { passive: true }
    );

    container.addEventListener(
      "touchcancel",
      () => {
        if (!swiping) return;
        swiping = false;
        directionLocked = false;
        lastDeltaY = 0;
        clearLegendSlideInlineStyles(slide);
      },
      { passive: true }
    );

    // Swipe-to-open when collapsed (upward); no live transform on slide (collapsed height ~0)
    let openStartX = 0;
    let openStartY = 0;
    let openStartTime = 0;
    let openSwiping = false;
    let openDirLocked = false;
    let lastOpenDeltaY = 0;

    container.addEventListener(
      "touchstart",
      (e) => {
        if (!container.classList.contains("density-legend--collapsed")) return;
        const touch = e.touches[0];
        openStartX = touch.clientX;
        openStartY = touch.clientY;
        openStartTime = Date.now();
        openSwiping = false;
        openDirLocked = false;
        lastOpenDeltaY = 0;
      },
      { passive: true }
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        if (!container.classList.contains("density-legend--collapsed")) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - openStartX;
        const deltaY = touch.clientY - openStartY;

        if (!openDirLocked) {
          if (
            Math.abs(deltaX) < DIRECTION_LOCK_PX &&
            Math.abs(deltaY) < DIRECTION_LOCK_PX
          ) {
            return;
          }
          openDirLocked = true;
          if (Math.abs(deltaX) > Math.abs(deltaY) || deltaY > 0) return;
          openSwiping = true;
        }

        if (!openSwiping) return;

        lastOpenDeltaY = Math.min(0, deltaY);
      },
      { passive: true }
    );

    container.addEventListener(
      "touchend",
      () => {
        if (!openSwiping) return;
        openSwiping = false;
        openDirLocked = false;

        const elapsed = Date.now() - openStartTime || 1;
        const dragPx = Math.abs(lastOpenDeltaY);
        const refHeight = container.offsetHeight || 48;
        const threshold = Math.min(THRESHOLD_PX, refHeight * THRESHOLD_RATIO);
        const velocity = dragPx / elapsed;

        const committed = dragPx > threshold || velocity > VELOCITY_MIN;

        if (committed) {
          clearLegendSlideInlineStyles(slide);
          setLegendCollapsed(container, toggle, false);
        }

        lastOpenDeltaY = 0;
      },
      { passive: true }
    );

    container.addEventListener(
      "touchcancel",
      () => {
        if (!openSwiping) return;
        openSwiping = false;
        openDirLocked = false;
        lastOpenDeltaY = 0;
      },
      { passive: true }
    );

    this._container = container;
    this._toggleEl = toggle;
    this._toggleHandler = onToggleClick;
    return container;
  }

  onRemove() {
    if (this._toggleEl && this._toggleHandler) {
      this._toggleEl.removeEventListener("click", this._toggleHandler);
      this._toggleEl = null;
      this._toggleHandler = null;
    }
    if (this._container) {
      this._container.remove();
      this._container = null;
    }
  }
}
