/**
 * Charts dock: selection summary, URL sync, Chart.js blocks (Phase 3–4).
 */
import { loadPlacesAttributesByState } from "./shared/utils/placesData.js";
import { getTopCitiesByState } from "./data/stateTopCities.js";
import {
  setDemographicsPercentChart,
  destroyDemographicsPercentChart,
  refreshDemographicsDockTicks,
  redrawDemographicsPercentChart,
} from "./charts/demographicsPercentDock.js";
import {
  setCommutePercentChart,
  destroyCommutePercentChart,
  refreshCommutePercentDockTicks,
  redrawCommutePercentChart,
} from "./charts/commutePercentDock.js";
import {
  setDemographicDoughnutDockChart,
  destroyDemographicDoughnutDockChart,
  redrawDemographicDoughnutDockChart,
} from "./charts/demographicDoughnutDock.js";
import {
  setCommuteDoughnutDockChart,
  destroyCommuteDoughnutDockChart,
  redrawCommuteDoughnutDockChart,
} from "./charts/commuteDoughnutDock.js";
import {
  setStateTopCitiesDockChart,
  destroyStateTopCitiesDockChart,
  refreshStateTopCitiesDockTicks,
  redrawStateTopCitiesChart,
} from "./charts/stateTopCitiesDock.js";
import { loadManifest } from "./data/manifestLoader.js";
import { formatNumber } from "./charts/chartUtils.js";
import { STORAGE_KEYS } from "./dock-constants.js";

export const EVENT_NAME = "place-selected";

const placeholder = document.querySelector(".charts-dock-placeholder");
const selectionEl = document.getElementById("charts-dock-selection");
const nameEl = document.getElementById("charts-dock-place-name");
const geoidEl = document.getElementById("charts-dock-geoid");
const summaryEl = document.getElementById("charts-dock-summary");

const chartsArea = document.getElementById("charts-dock-charts-area");
const chartsMsg = document.getElementById("charts-dock-charts-msg");
const demographicsBlock = document.getElementById("charts-dock-demographics-block");
const commuteBlock = document.getElementById("charts-dock-commute-block");
const doughnutsRow = document.getElementById("charts-dock-doughnuts-row");
const topCitiesBlock = document.getElementById("charts-dock-top-cities-block");

const demographicsCanvas = document.getElementById("dock-demographics-percent-chart");
const commuteCanvas = document.getElementById("dock-commute-percent-chart");
const demographicDoughnutCanvas = document.getElementById("dock-demographic-doughnut-chart");
const commuteDoughnutCanvas = document.getElementById("dock-commute-doughnut-chart");
const stateTopCitiesCanvas = document.getElementById("dock-state-top-cities-chart");
const dock = document.getElementById("charts-dock");

function formatDockCurrency(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString("en-US")}`;
}

function appendSummaryRows(dl, rows) {
  for (const [label, val] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = val;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
}

if (selectionEl) {
  selectionEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".charts-dock-see-more");
    if (!btn || !selectionEl.contains(btn)) return;
    const panel = document.getElementById("charts-dock-summary-extra");
    if (!panel) return;
    const expanded = btn.getAttribute("aria-expanded") === "true";
    if (expanded) {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      btn.textContent = "See more";
    } else {
      panel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      btn.textContent = "See less";
    }
  });
}

function destroyAllCharts() {
  destroyDemographicsPercentChart();
  destroyCommutePercentChart();
  destroyDemographicDoughnutDockChart();
  destroyCommuteDoughnutDockChart();
  destroyStateTopCitiesDockChart();
}

function hideAllChartBlocks() {
  if (demographicsBlock) demographicsBlock.hidden = true;
  if (commuteBlock) commuteBlock.hidden = true;
  if (doughnutsRow) doughnutsRow.hidden = true;
  if (topCitiesBlock) topCitiesBlock.hidden = true;
}

function showAllChartBlocks() {
  if (demographicsBlock) demographicsBlock.hidden = false;
  if (commuteBlock) commuteBlock.hidden = false;
  if (doughnutsRow) doughnutsRow.hidden = false;
  if (topCitiesBlock) topCitiesBlock.hidden = false;
}

async function updateChartsPanel(attrs, geoid) {
  if (!chartsArea) return;

  if (!attrs) {
    destroyAllCharts();
    hideAllChartBlocks();
    if (chartsMsg) {
      chartsMsg.hidden = false;
      chartsMsg.textContent =
        "Charts need census attributes for this place.";
    }
    chartsArea.hidden = false;
    return;
  }

  if (chartsMsg) {
    chartsMsg.hidden = true;
    chartsMsg.textContent = "";
  }
  showAllChartBlocks();
  chartsArea.hidden = false;

  setDemographicsPercentChart(demographicsCanvas, attrs);
  setCommutePercentChart(commuteCanvas, attrs);
  setDemographicDoughnutDockChart(demographicDoughnutCanvas, attrs);
  setCommuteDoughnutDockChart(commuteDoughnutCanvas, attrs);

  const statefp = geoid.slice(0, 2);
  try {
    const rows = await getTopCitiesByState(statefp, 10);
    const abbr = rows[0]?.stusps || "";
    setStateTopCitiesDockChart(stateTopCitiesCanvas, rows, abbr);
  } catch (err) {
    console.error("charts-dock-panel: top cities chart failed", err);
    destroyStateTopCitiesDockChart();
  }
}

function hideChartsPanel() {
  destroyAllCharts();
  hideAllChartBlocks();
  if (chartsArea) chartsArea.hidden = true;
  if (chartsMsg) {
    chartsMsg.hidden = true;
    chartsMsg.textContent = "";
  }
}

function render(detail) {
  const { geoid, attrs, displayName } = detail;
  const title = displayName || `Place ${geoid}`;

  if (placeholder) placeholder.hidden = true;
  if (selectionEl) selectionEl.hidden = false;
  if (nameEl) nameEl.textContent = title;
  if (geoidEl) geoidEl.textContent = `GEOID: ${geoid}`;
  if (!summaryEl) return;
  summaryEl.innerHTML = "";

  if (!attrs) {
    const p = document.createElement("p");
    p.className = "charts-dock-no-attrs";
    p.textContent = "No attribute data available for this place.";
    summaryEl.appendChild(p);
    void updateChartsPanel(null, geoid);
    return;
  }

  const densityRaw = attrs.pop_density_sqmi;
  const densityDisplay =
    densityRaw != null && Number.isFinite(Number(densityRaw))
      ? formatNumber(Math.round(Number(densityRaw)))
      : "—";

  const leadRows = [
    ["Population", formatNumber(attrs.pop_total)],
    ["Pop Density Sq Mile", densityDisplay],
    ["Median household income", formatNumber(attrs.median_hh_income)],
    ["Median age", attrs.median_age != null ? String(attrs.median_age) : "—"],
  ];

  const leadDl = document.createElement("dl");
  leadDl.className = "charts-dock-summary";
  appendSummaryRows(leadDl, leadRows);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "charts-dock-see-more";
  toggleBtn.setAttribute("aria-expanded", "false");
  toggleBtn.setAttribute("aria-controls", "charts-dock-summary-extra");
  toggleBtn.textContent = "See more";

  const moreRows = [
    ["Households", formatNumber(attrs.households)],
    ["Housing Units", formatNumber(attrs.housing_units)],
    ["Avg Household Size", formatNumber(attrs.avg_household_size)],
    ["Median Home Value", formatDockCurrency(attrs.median_home_value)],
    ["Median Owner Cost Mortgage", formatDockCurrency(attrs.median_owner_cost_mortgage)],
    ["Median Gross Rent", formatDockCurrency(attrs.median_gross_rent)],
    ["Per Capita Income", formatDockCurrency(attrs.per_capita_income)],
  ];

  const extraWrap = document.createElement("div");
  extraWrap.id = "charts-dock-summary-extra";
  extraWrap.hidden = true;
  const restDl = document.createElement("dl");
  restDl.className = "charts-dock-summary";
  appendSummaryRows(restDl, moreRows);
  extraWrap.appendChild(restDl);

  summaryEl.appendChild(leadDl);
  summaryEl.appendChild(extraWrap);
  summaryEl.appendChild(toggleBtn);

  void updateChartsPanel(attrs, geoid);
}

function clearSelection() {
  if (placeholder) placeholder.hidden = false;
  if (selectionEl) selectionEl.hidden = true;
  if (nameEl) nameEl.textContent = "";
  if (geoidEl) geoidEl.textContent = "";
  if (summaryEl) summaryEl.innerHTML = "";
  hideChartsPanel();
}

window.addEventListener(EVENT_NAME, (e) => {
  if (e.detail?.geoid) {
    render(e.detail);
  }
});

window.addEventListener("popstate", () => {
  const params = new URLSearchParams(window.location.search);
  const geoidFromUrl = params.get("geoid");
  const geoidFromState = window.history.state?.geoid;
  const geoid = geoidFromState || geoidFromUrl;
  if (geoid) {
    loadFromGeoid(geoid);
  } else {
    clearSelection();
  }
});

async function loadAttrsForGeoid(geoid) {
  const statefp = geoid.slice(0, 2);
  const data = await loadPlacesAttributesByState(statefp);
  return data[geoid] ?? null;
}

async function loadFromGeoid(geoid, replaceHistoryState = false) {
  try {
    const attrs = await loadAttrsForGeoid(geoid);
    render({ geoid, attrs, displayName: `Place ${geoid}` });
    if (replaceHistoryState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("q");
        url.searchParams.set("geoid", geoid);
        window.history.replaceState({ geoid }, "", url);
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.error("charts-dock-panel: failed to load attrs", err);
    render({ geoid, attrs: null, displayName: `Place ${geoid}` });
  }
}

/**
 * Search / deep-link path: load attrs, update dock + charts, URL, then map may fly via event.
 * @param {{ geoid: string; displayName?: string }} opts
 */
export async function selectPlaceFromSearch({ geoid, displayName }) {
  if (!geoid) return;
  const fallbackName = displayName || `Place ${geoid}`;

  let attrs = null;
  try {
    attrs = await loadAttrsForGeoid(geoid);
  } catch (err) {
    console.error("charts-dock-panel: selectPlaceFromSearch failed", err);
  }

  render({ geoid, attrs, displayName: fallbackName });

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    url.searchParams.set("geoid", geoid);
    window.history.pushState({ geoid }, "", url);
  } catch {
    /* non-browser */
  }

  window.dispatchEvent(
    new CustomEvent("charts-dock-focus-place", { detail: { geoid } })
  );
}

function syncToggleButton(btnId, className, labelWhenActive, labelWhenInactive) {
  const active = dock?.classList.contains(className) ?? false;
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.textContent = active ? labelWhenActive : labelWhenInactive;
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function refreshAfterValuesChange() {
  redrawDemographicsPercentChart();
  redrawCommutePercentChart();
  redrawStateTopCitiesChart();
  redrawDemographicDoughnutDockChart();
  redrawCommuteDoughnutDockChart();
}

function syncValues() {
  syncToggleButton("charts-dock-values-toggle", "charts-dock-values-hidden", "Show values", "Hide values");
}

function syncTheme() {
  syncToggleButton("charts-dock-theme-toggle", "charts-dock-light", "Dark panel", "Light panel");
}

function initDockToggles() {
  if (!dock) return;
  const valuesBtn = document.getElementById("charts-dock-values-toggle");
  const themeBtn = document.getElementById("charts-dock-theme-toggle");

  const savedValues = localStorage.getItem(STORAGE_KEYS.SHOW_VALUES);
  if (savedValues === "false") {
    dock.classList.add("charts-dock-values-hidden");
  }
  syncValues();

  valuesBtn?.addEventListener("click", () => {
    dock.classList.toggle("charts-dock-values-hidden");
    localStorage.setItem(
      STORAGE_KEYS.SHOW_VALUES,
      (!dock.classList.contains("charts-dock-values-hidden")).toString()
    );
    syncValues();
    refreshAfterValuesChange();
  });

  if (localStorage.getItem(STORAGE_KEYS.LIGHT_THEME) === "true") {
    dock.classList.add("charts-dock-light");
  }
  syncTheme();

  themeBtn?.addEventListener("click", () => {
    dock.classList.toggle("charts-dock-light");
    localStorage.setItem(
      STORAGE_KEYS.LIGHT_THEME,
      dock.classList.contains("charts-dock-light").toString()
    );
    syncTheme();
    refreshDemographicsDockTicks();
    refreshCommutePercentDockTicks();
    refreshStateTopCitiesDockTicks();
  });
}

initDockToggles();

function formatVintageLabel(vintage) {
  if (vintage == null) return null;
  if (typeof vintage === "string") return vintage;
  if (typeof vintage === "object" && vintage.acs_year != null) {
    const prod =
      vintage.acs_product === "acs5"
        ? "ACS 5-year"
        : String(vintage.acs_product ?? "ACS");
    return `${prod} ${vintage.acs_year}`;
  }
  return null;
}

async function displayVintage() {
  const el = document.getElementById("charts-dock-vintage");
  if (!el) return;
  const manifest = await loadManifest();
  const label = formatVintageLabel(manifest?.vintage);
  if (label) {
    el.textContent = `Data vintage: ${label}`;
    el.hidden = false;
  }
}

void displayVintage();

const initialGeoid = new URLSearchParams(window.location.search).get("geoid");
if (initialGeoid) {
  loadFromGeoid(initialGeoid, true);
}
