/**
 * Shared utility functions for chart modules.
 */

const TICK_COLOR_DARK = "#c9d1d9";
const TICK_COLOR_LIGHT = "#444444";

export function safeNumber(value) {
  if (value == null || value === undefined || Number.isNaN(Number(value))) {
    return 0;
  }
  return Number(value);
}

export function formatPercent(num) {
  if (num == null || num === undefined) return "N/A";
  return `${Number(num).toFixed(1)}%`;
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function tickColor() {
  const dock = document.getElementById("charts-dock");
  return dock?.classList.contains("charts-dock-light") ? TICK_COLOR_LIGHT : TICK_COLOR_DARK;
}
