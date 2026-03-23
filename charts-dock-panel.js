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

const EVENT_NAME = "place-selected";

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

  const rows = [
    ["Population", formatNumber(attrs.pop_total)],
    ["Median household income", formatNumber(attrs.median_hh_income)],
    ["Median age", attrs.median_age != null ? String(attrs.median_age) : "—"],
  ];

  for (const [label, val] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = val;
    summaryEl.appendChild(dt);
    summaryEl.appendChild(dd);
  }

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

async function loadFromGeoid(geoid, replaceHistoryState = false) {
  try {
    const statefp = geoid.slice(0, 2);
    const data = await loadPlacesAttributesByState(statefp);
    const attrs = data[geoid] ?? null;
    render({
      geoid,
      attrs,
      displayName: `Place ${geoid}`,
    });
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
    render({
      geoid,
      attrs: null,
      displayName: `Place ${geoid}`,
    });
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
    const statefp = geoid.slice(0, 2);
    const data = await loadPlacesAttributesByState(statefp);
    attrs = data[geoid] ?? null;
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

function syncValuesButtonLabel() {
  const dock = document.getElementById("charts-dock");
  const hidden = dock?.classList.contains("charts-dock-values-hidden");
  const btn = document.getElementById("charts-dock-values-toggle");
  if (btn) btn.textContent = hidden ? "Show values" : "Hide values";
}

function syncThemeButtonLabel() {
  const dock = document.getElementById("charts-dock");
  const light = dock?.classList.contains("charts-dock-light");
  const btn = document.getElementById("charts-dock-theme-toggle");
  if (btn) btn.textContent = light ? "Dark panel" : "Light panel";
}

function refreshAfterValuesChange() {
  redrawDemographicsPercentChart();
  redrawCommutePercentChart();
  redrawStateTopCitiesChart();
  redrawDemographicDoughnutDockChart();
  redrawCommuteDoughnutDockChart();
}

function initDockToggles() {
  const dock = document.getElementById("charts-dock");
  const valuesBtn = document.getElementById("charts-dock-values-toggle");
  const themeBtn = document.getElementById("charts-dock-theme-toggle");
  if (!dock) return;

  const savedValues = localStorage.getItem("dockShowValues");
  if (savedValues === "false") {
    dock.classList.add("charts-dock-values-hidden");
  }
  syncValuesButtonLabel();

  valuesBtn?.addEventListener("click", () => {
    dock.classList.toggle("charts-dock-values-hidden");
    localStorage.setItem(
      "dockShowValues",
      (!dock.classList.contains("charts-dock-values-hidden")).toString()
    );
    syncValuesButtonLabel();
    refreshAfterValuesChange();
  });

  if (localStorage.getItem("charts-dock-light") === "true") {
    dock.classList.add("charts-dock-light");
  }
  syncThemeButtonLabel();

  themeBtn?.addEventListener("click", () => {
    dock.classList.toggle("charts-dock-light");
    localStorage.setItem(
      "charts-dock-light",
      dock.classList.contains("charts-dock-light").toString()
    );
    syncThemeButtonLabel();
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
