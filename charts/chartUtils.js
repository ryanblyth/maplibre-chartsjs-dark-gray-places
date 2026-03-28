/**
 * Shared utility functions for chart modules.
 */
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

const TICK_COLOR_DARK = "#c9d1d9";
const TICK_COLOR_LIGHT = "#444444";

export const CHART_COLORS = {
  cyan:   { bg: "rgba(0, 190, 255, 0.82)",   border: "rgba(0, 190, 255, 1)" },
  purple: { bg: "rgba(183, 74, 255, 0.82)",  border: "rgba(183, 74, 255, 1)" },
  pink:   { bg: "rgba(255, 45, 120, 0.82)",  border: "rgba(255, 45, 120, 1)" },
  green:  { bg: "rgba(0, 235, 155, 0.82)",   border: "rgba(0, 235, 155, 1)" },
  orange: { bg: "rgba(255, 149, 0, 0.82)",   border: "rgba(255, 149, 0, 1)" },
};

export const DOUGHNUT_BORDER = "rgba(43, 57, 66, 1.00)";

export const GRID_COLOR = "rgba(255,255,255,0.06)";

let barComponentsRegistered = false;

export function ensureBarComponentsRegistered() {
  if (barComponentsRegistered) return;
  Chart.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);
  barComponentsRegistered = true;
}

export function safeNumber(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return 0;
  }
  return Number(value);
}

export function formatPercent(num) {
  if (num == null) return "N/A";
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

export function buildDemographicsShares(attrs) {
  const pctNonhispWhite = safeNumber(attrs.pct_nonhisp_white);
  const pctHispanic = safeNumber(attrs.pct_hispanic);
  const pctNonhispBlack = safeNumber(attrs.pct_nonhisp_black);
  const pctNonhispAsian = safeNumber(attrs.pct_nonhisp_asian);
  const otherNonHispanic = Math.max(
    0,
    100 - (pctNonhispWhite + pctHispanic + pctNonhispBlack + pctNonhispAsian)
  );
  return {
    labels: ["Non-Hispanic White", "Hispanic", "Black", "Asian", "Other Non-Hispanic"],
    data: [pctNonhispWhite, pctHispanic, pctNonhispBlack, pctNonhispAsian, otherNonHispanic],
  };
}

export function buildCommuteShares(attrs) {
  const pctDriveAlone = safeNumber(attrs.pct_drive_alone);
  const pctCarpool = safeNumber(attrs.pct_carpool);
  const pctTransit = safeNumber(attrs.pct_transit);
  const pctWfh = safeNumber(attrs.pct_wfh);
  const otherCommuteModes = Math.max(
    0,
    100 - (pctDriveAlone + pctCarpool + pctTransit + pctWfh)
  );
  return {
    labels: ["Drive Alone", "Carpool", "Transit", "Work From Home", "Other commute modes"],
    data: [pctDriveAlone, pctCarpool, pctTransit, pctWfh, otherCommuteModes],
  };
}
