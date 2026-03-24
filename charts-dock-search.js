import { selectPlaceFromSearch, EVENT_NAME } from "./charts-dock-panel.js";
import {
  ensurePlacesSearchReady,
  searchPlaces,
} from "./data/placesSearch.js";

const input = document.getElementById("charts-dock-search-input");
const resultsEl = document.getElementById("charts-dock-search-results");
const errorEl = document.getElementById("charts-dock-search-error");
const searchRoot = document.querySelector(".charts-dock-search");

let debounceTimer = null;
/** @type {Array<{ geoid: string; name: string; stusps?: string }>} */
let currentResults = [];
let activeIndex = -1;

function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };
}

function setResultsHidden(hidden) {
  if (!resultsEl) return;
  resultsEl.hidden = hidden;
  input?.setAttribute("aria-expanded", hidden ? "false" : "true");
}

function closeResults() {
  setResultsHidden(true);
  activeIndex = -1;
  currentResults = [];
  if (resultsEl) resultsEl.innerHTML = "";
}

function displayNameFor(place) {
  const name = place.name ?? "";
  const st = place.stusps;
  return st ? `${name}, ${st}` : name;
}

function renderResults(rows) {
  if (!resultsEl) return;
  currentResults = rows;
  activeIndex = -1;
  if (!rows.length) {
    resultsEl.innerHTML = "";
    setResultsHidden(true);
    return;
  }

  resultsEl.innerHTML = rows
    .map(
      (place, i) =>
        `<button type="button" class="charts-dock-search-result" role="option" data-index="${i}" id="charts-dock-search-opt-${i}">
          <div class="charts-dock-search-result-name"></div>
          <div class="charts-dock-search-result-meta"></div>
        </button>`
    )
    .join("");

  resultsEl.querySelectorAll(".charts-dock-search-result").forEach((btn, i) => {
    const place = rows[i];
    btn.querySelector(".charts-dock-search-result-name").textContent =
      place.name ?? "";
    btn.querySelector(".charts-dock-search-result-meta").textContent = `${
      place.stusps ?? ""
    } · ${place.geoid}`;
    btn.addEventListener("click", () => {
      void pickPlace(place);
    });
  });

  setResultsHidden(false);
}

function highlightActive() {
  if (!resultsEl) return;
  resultsEl.querySelectorAll(".charts-dock-search-result").forEach((el, i) => {
    el.classList.toggle("is-active", i === activeIndex);
  });
}

async function pickPlace(place) {
  if (!place?.geoid) return;
  const displayName = displayNameFor(place);
  closeResults();
  if (input) input.value = "";
  await selectPlaceFromSearch({ geoid: String(place.geoid), displayName });
}

const runSearch = debounce((query) => {
  if (!query || query.trim() === "") {
    closeResults();
    return;
  }
  const rows = searchPlaces(query.trim(), 10);
  renderResults(rows);
}, 250);

async function init() {
  if (!input || !resultsEl) return;

  try {
    await ensurePlacesSearchReady();
    input.disabled = false;
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
  } catch (err) {
    console.error("charts-dock-search: index load failed", err);
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent =
        "Could not load place search index. Check network or data URL.";
    }
    return;
  }

  const bootParams = new URLSearchParams(window.location.search);
  if (!bootParams.get("geoid")) {
    const initialQ = bootParams.get("q");
    if (initialQ && initialQ.trim() !== "") {
      const t = initialQ.trim();
      input.value = t;
      const rows = searchPlaces(t, 10);
      renderResults(rows);
    }
  }

  window.addEventListener(EVENT_NAME, () => {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    if (input) input.value = "";
    closeResults();
  });

  input.addEventListener("input", (e) => {
    const q = e.target.value;
    runSearch(q);
  });

  input.addEventListener("keydown", (e) => {
    if (!resultsEl || resultsEl.hidden || !currentResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
      highlightActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlightActive();
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      void pickPlace(currentResults[activeIndex]);
    } else if (e.key === "Escape") {
      closeResults();
    }
  });

  document.addEventListener("click", (e) => {
    const t = /** @type {Node} */ (e.target);
    if (
      searchRoot &&
      !searchRoot.contains(t) &&
      resultsEl &&
      !resultsEl.contains(t)
    ) {
      closeResults();
    }
  });
}

void init();
