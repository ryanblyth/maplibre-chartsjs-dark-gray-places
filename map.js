/* global maplibregl, pmtiles */
import { getStateApproxCenterLngLat } from "./data/stateCentroids.js";
import { placeCentroidsByGeoid } from "./data/placeCentroids.js";
import { initializePlacesInteractivity } from "./shared/utils/placesMapSetup.js";
import { defaultPlacePopupAttributeConfig } from "./shared/utils/placesPopup.js";
import { loadPlacesAttributesByState, updateMapFeatureStates } from "./shared/utils/placesData.js";

/**
 * My Custom Map Fixed Basemap - Map Initialization
 * 
 * This map uses the generated style.json which is built from TypeScript:
 *   npm run build:styles
 * 
 * For programmatic usage (e.g., in a bundled application), you can import directly:
 * 
 *   import { createMyCustomMapFixedStyle } from './styles/myCustomMapFixedStyle.js';
 *   
 *   const map = new maplibregl.Map({
 *     container: "map-container",
 *     style: createMyCustomMapFixedStyle(),
 *     // ... other options
 *   });
 * 
 * For static hosting or simple HTML pages, use the generated JSON:
 *   style: "./style.json"  // or "./style.generated.json"
 */

// ============================================================================
// Configuration Constants
// These values match styles/theme.ts myCustomMapFixedSettings
// Can be overridden by setting window.mapProjection/window.mapMinZoom/window.mapCenter/window.mapZoom/window.mapPitch/window.mapBearing before this script runs
// ============================================================================
const DEFAULT_PROJECTION = "globe";
const DEFAULT_MIN_ZOOM = { mercator: 0, globe: 2 };
const DEFAULT_CENTER = [-98.0, 39.0];
const DEFAULT_ZOOM = 4.25;
const DEFAULT_PITCH = 0;
const DEFAULT_BEARING = 0;

const projectionType = (typeof window !== 'undefined' && window.mapProjection) 
  ? window.mapProjection 
  : DEFAULT_PROJECTION;

const minZoomConfig = (typeof window !== 'undefined' && window.mapMinZoom)
  ? window.mapMinZoom
  : DEFAULT_MIN_ZOOM;

const minZoom = projectionType === 'mercator' 
  ? minZoomConfig.mercator 
  : minZoomConfig.globe;

const center = (typeof window !== 'undefined' && window.mapCenter) 
  ? window.mapCenter 
  : DEFAULT_CENTER;

const zoom = (typeof window !== 'undefined' && window.mapZoom !== undefined) 
  ? window.mapZoom 
  : DEFAULT_ZOOM;

const pitch = (typeof window !== 'undefined' && window.mapPitch !== undefined) 
  ? window.mapPitch 
  : DEFAULT_PITCH;

const bearing = (typeof window !== 'undefined' && window.mapBearing !== undefined) 
  ? window.mapBearing 
  : DEFAULT_BEARING;

// Register PMTiles protocol
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

const mapStyleUrl = `./style.json?v=${Date.now()}`;

// Initialize map
const map = new maplibregl.Map({
  container: "map-container",
  style: mapStyleUrl,
  center: center,
  zoom: zoom,
  pitch: pitch,
  bearing: bearing,
  minZoom: minZoom,
  maxZoom: 22,
  hash: false,
  attributionControl: false,
  canvasContextAttributes: { antialias: true }
});

map.addControl(new maplibregl.NavigationControl(), "top-left");

const attributionControl = new maplibregl.AttributionControl({
  compact: false,
  customAttribution: "<a href='https://maplibre.org/'>MapLibre</a> | © <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors, © <a href='https://openmaptiles.org/'>OpenMapTiles</a> | <a href='https://www.naturalearthdata.com/'>Natural Earth</a>"
});
map.addControl(attributionControl);

// Starry background (globe projection only; requires maplibre-gl-starfield.js)
const starfieldConfig = (typeof window !== 'undefined' && window.starfieldConfig)
  ? window.starfieldConfig
  : {
      glowColors: {
        inner: "rgba(120, 180, 255, 0.9)",
        middle: "rgba(100, 150, 255, 0.7)",
        outer: "rgba(70, 120, 255, 0.4)",
        fade: "rgba(40, 80, 220, 0)"
      }
    };

const StarryCtor =
  typeof globalThis !== "undefined" && typeof globalThis.MapLibreStarryBackground === "function"
    ? globalThis.MapLibreStarryBackground
    : null;
const starryBg = StarryCtor ? new StarryCtor(starfieldConfig) : null;
if (!StarryCtor && typeof console !== "undefined") {
  console.warn("[map] MapLibreStarryBackground not loaded — starfield script missing or failed (globe still works without starfield).");
}

if (starryBg && starfieldConfig && starfieldConfig.glowColors) {
  starryBg.config.glowColors = { ...starryBg.config.glowColors, ...starfieldConfig.glowColors };
}

map.on('style.load', () => {
  map.setProjection({ type: projectionType });
  if (projectionType === 'globe' && starryBg) {
    starryBg.attachToMap(map, "starfield-container", "globe-glow");
  }
});

// Tile loads can emit many identical "Failed to fetch" errors (e.g. PMTiles Range + CDN reset).
// Verbose: set window.MAP_DEBUG_MAP_ERRORS = true before or in DevTools for every event.
const MAP_ERROR_THROTTLE_MS = 8000;
const mapErrorLastLog = Object.create(null);
let mapFetchErrorHintShown = false;

map.on("error", (e) => {
  const err = e?.error ?? e;
  const msg = err?.message ?? String(err);
  if (typeof window !== "undefined" && window.MAP_DEBUG_MAP_ERRORS === true) {
    console.error("Map error:", err);
    return;
  }
  const throttleKey =
    msg === "Failed to fetch" || /^Load failed/i.test(msg) ? "__network_tile__" : msg;
  const now = Date.now();
  if (now - (mapErrorLastLog[throttleKey] ?? 0) < MAP_ERROR_THROTTLE_MS) {
    return;
  }
  mapErrorLastLog[throttleKey] = now;
  if (throttleKey === "__network_tile__" && !mapFetchErrorHintShown) {
    mapFetchErrorHintShown = true;
    console.warn(
      "[map] Tile/resource fetch failed (identical errors throttled ~8s). Network often shows ERR_HTTP2_PROTOCOL_ERROR or ERR_CONNECTION_RESET on Range GETs to data.storypath.studio .pmtiles — can hit any archive (e.g. ne-bathy, places), any zoom, especially after fly-to/search when many tiles load. Not an app-code bug; fix CDN/proxy/mirror or retry. MAP_DEBUG_MAP_ERRORS = true logs every error."
    );
  }
  console.error("Map error:", err);
});

// Log zoom when window.MAP_DEBUG_ZOOM is true (checked on each event so DevTools can toggle without reload).
function mapDebugZoomLog() {
  if (typeof window !== "undefined" && window.MAP_DEBUG_ZOOM === true) {
    console.log("[map zoom]", Number(map.getZoom().toFixed(4)));
  }
}
map.on("zoomend", mapDebugZoomLog);
map.once("load", mapDebugZoomLog);

// ============================================================================
// Charts dock: fly / ease to a place selected from search (GEOID)
// ============================================================================
const FOCUS_SEARCH_ZOOM = 9;
let mapFocusOpSeq = 0;

function getCachedPlaceCoords(geoid) {
  const key = normalizeGeoidDigits(geoid);
  return placeCentroidsByGeoid[key] ?? null;
}

function mapFocusDebugEnabled() {
  return typeof window !== "undefined" && window.MAP_FOCUS_DEBUG === true;
}

function mapFocusLog(...args) {
  if (mapFocusDebugEnabled()) console.log("[map focus]", ...args);
}

function getChartsDockOverlapPx() {
  if (typeof document === "undefined") return 0;
  const dock = document.getElementById("charts-dock");
  if (!dock || dock.classList.contains("charts-dock--closed")) return 0;
  return dock.getBoundingClientRect().width;
}

function getDockOffset() {
  return [-getChartsDockOverlapPx() / 2, 0];
}

/**
 * Ease to a center point at FOCUS_SEARCH_ZOOM with dock offset.
 * Returns false if the easeTo threw.
 */
function easeToPlace(center, duration = 1000) {
  try {
    map.easeTo({
      center,
      zoom: FOCUS_SEARCH_ZOOM,
      duration,
      offset: getDockOffset(),
    });
    return true;
  } catch (err) {
    console.error("[map focus] easeTo failed:", err);
    return false;
  }
}

/**
 * Register both `idle` and `moveend+microtask` listeners so the callback runs
 * even when MapLibre is already idle and won't emit another idle event.
 */
function onceMapSettled(focusAlive, callback) {
  let ran = false;
  const run = () => {
    if (ran || !focusAlive()) return;
    ran = true;
    callback();
  };
  map.once("idle", run);
  map.once("moveend", () => queueMicrotask(run));
}

function forEachCoordInGeometry(geom, fn) {
  if (!geom) return;
  if (geom.type === "Point") {
    fn(geom.coordinates);
  } else if (geom.type === "MultiPoint") {
    for (const c of geom.coordinates) fn(c);
  } else if (geom.type === "LineString") {
    for (const c of geom.coordinates) fn(c);
  } else if (geom.type === "MultiLineString") {
    for (const line of geom.coordinates) {
      for (const c of line) fn(c);
    }
  } else if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) {
      for (const c of ring) fn(c);
    }
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        for (const c of ring) fn(c);
      }
    }
  } else if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) forEachCoordInGeometry(g, fn);
  }
}

function geometryBounds(geom) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let any = false;
  forEachCoordInGeometry(geom, (coord) => {
    const [lng, lat] = coord;
    any = true;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  if (!any) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * MapLibre filter for GEOID on vector tiles: values may be 7-digit strings ("0846465")
 * or numbers (846465) after tile encoding — plain string equality misses the match.
 */
function geoidQueryFilter(geoid) {
  const raw = String(geoid).trim();
  const digits = raw.replace(/\D/g, "");
  const padded = digits ? digits.padStart(7, "0") : raw;
  const asNum = Number(padded);
  const parts = [
    ["==", ["to-string", ["get", "GEOID"]], padded],
    ["==", ["to-string", ["get", "GEOID"]], raw],
  ];
  if (Number.isFinite(asNum) && digits) {
    parts.push(
      ["==", ["to-string", ["get", "GEOID"]], String(asNum)],
      ["==", ["get", "GEOID"], asNum]
    );
  }
  return ["any", ...parts];
}

function normalizeGeoidDigits(geoid) {
  const d = String(geoid ?? "").replace(/\D/g, "");
  return d ? d.padStart(7, "0") : "";
}

function countJsGeoidMatchesInFeatures(features, geoid) {
  const want = normalizeGeoidDigits(geoid);
  if (!want) return 0;
  let n = 0;
  for (const ft of features) {
    const g = ft.properties?.GEOID;
    if (g == null) continue;
    if (normalizeGeoidDigits(g) === want) n++;
  }
  return n;
}

/**
 * Try to query polygon tiles for the given GEOID and ease the map to the
 * feature's bounding-box center.  Returns true if a feature was found and
 * easeTo was issued.
 */
function tryFocusOnPolygon(geoidStr, focusAlive, phase = "") {
  if (!focusAlive()) return false;
  if (!map.getSource("places-source")) {
    mapFocusLog(`tryFocus${phase}: no places-source`);
    return false;
  }

  let filtered = map.querySourceFeatures("places-source", {
    sourceLayer: "places",
    filter: geoidQueryFilter(geoidStr),
  });

  let allLoaded = null;
  if (!filtered.length) {
    allLoaded = map.querySourceFeatures("places-source", { sourceLayer: "places" });
    if (countJsGeoidMatchesInFeatures(allLoaded, geoidStr) > 0) {
      const want = normalizeGeoidDigits(geoidStr);
      const jsFeat = allLoaded.find(
        (ft) => normalizeGeoidDigits(ft.properties?.GEOID) === want
      );
      if (jsFeat) filtered = [jsFeat];
    }
  }

  if (mapFocusDebugEnabled()) {
    const c = map.getCenter();
    const unfiltered = allLoaded ?? map.querySourceFeatures("places-source", { sourceLayer: "places" });
    mapFocusLog(`tryFocus${phase}`, {
      zoom: map.getZoom(),
      center: [c.lng, c.lat],
      filteredCount: filtered.length,
      unfilteredCount: unfiltered.length,
    });
    if (!filtered.length && unfiltered.length > 0) {
      const p = unfiltered[0].properties;
      mapFocusLog("filter miss; sample feature GEOID:", p?.GEOID, typeof p?.GEOID);
    }
  }

  if (!filtered.length) return false;

  const feat = filtered[0];
  const bb = geometryBounds(feat.geometry);
  if (!bb) return false;
  if (!focusAlive()) return false;

  const cx = (bb[0][0] + bb[1][0]) / 2;
  const cy = (bb[0][1] + bb[1][1]) / 2;
  easeToPlace([cx, cy], 1100);
  mapFocusLog(`tryFocus${phase}: easeTo z${FOCUS_SEARCH_ZOOM}`, { geomType: feat.geometry?.type });
  return true;
}

/** Try to get [lng, lat] from the low-zoom points source (available z0-7). */
function getPlaceCoordsFromPointSource(geoidStr) {
  const sourceLayers = ["places", "points", "places_points"];
  for (const sl of sourceLayers) {
    try {
      const pts = map.querySourceFeatures("places-low-source", {
        sourceLayer: sl,
        filter: geoidQueryFilter(geoidStr),
      });
      if (pts.length) {
        const g = pts[0].geometry;
        if (g?.type === "Point" && g.coordinates) return [g.coordinates[0], g.coordinates[1]];
      }
      const all = map.querySourceFeatures("places-low-source", { sourceLayer: sl });
      const want = normalizeGeoidDigits(geoidStr);
      const match = all.find((ft) => normalizeGeoidDigits(ft.properties?.GEOID) === want);
      if (match?.geometry?.type === "Point" && match.geometry.coordinates) {
        return [match.geometry.coordinates[0], match.geometry.coordinates[1]];
      }
    } catch { /* source layer may not exist */ }
  }
  return null;
}

/**
 * Fly to place coordinates, then attempt polygon refinement after idle.
 */
function flyToPlaceCoords(coords, geoidStr, focusAlive) {
  if (!focusAlive()) return;
  if (!easeToPlace(coords)) return;
  map.once("idle", () => {
    if (!focusAlive()) return;
    if (tryFocusOnPolygon(geoidStr, focusAlive, " afterFlyIdle1")) return;
    map.once("idle", () => {
      if (!focusAlive()) return;
      tryFocusOnPolygon(geoidStr, focusAlive, " afterFlyIdle2");
    });
  });
}

function focusMapOnGeoid(geoid) {
  const geoidStr = String(geoid);
  const statefp = geoidStr.length >= 2 ? geoidStr.slice(0, 2) : geoidStr.padStart(2, "0");
  mapFocusOpSeq += 1;
  const focusOpId = mapFocusOpSeq;
  const focusAlive = () => focusOpId === mapFocusOpSeq;
  try { map.stop(); } catch { /* ignore */ }
  mapFocusLog("focusMapOnGeoid start", { geoid: geoidStr, statefp, focusOpId });

  // Best path: static centroid lookup (tile-independent).
  const cachedCoords = getCachedPlaceCoords(geoidStr);
  if (cachedCoords) {
    flyToPlaceCoords(cachedCoords, geoidStr, focusAlive);
    return;
  }

  // Fallback: live tile query on point source.
  const pointCoords = getPlaceCoordsFromPointSource(geoidStr);
  if (pointCoords) {
    flyToPlaceCoords(pointCoords, geoidStr, focusAlive);
    return;
  }

  // Fallback: polygon query at current viewport.
  if (tryFocusOnPolygon(geoidStr, focusAlive, " initial")) return;

  // Last resort: warm up state center, then retry tile queries.
  let fallbackRan = false;
  const runAfterInitialFailure = () => {
    if (!focusAlive() || fallbackRan) return;
    fallbackRan = true;
    mapFocusLog("idle pass 1");
    if (tryFocusOnPolygon(geoidStr, focusAlive, " afterIdle1")) return;

    // Warmup: try coords again, then ease to state center
    if (!focusAlive()) return;
    const cached = getCachedPlaceCoords(geoidStr);
    if (cached) { flyToPlaceCoords(cached, geoidStr, focusAlive); return; }
    const ptCoords = getPlaceCoordsFromPointSource(geoidStr);
    if (ptCoords) { flyToPlaceCoords(ptCoords, geoidStr, focusAlive); return; }

    const stateCenter = getStateApproxCenterLngLat(statefp);
    if (!stateCenter || !focusAlive()) return;
    if (!easeToPlace(stateCenter, 900)) return;

    onceMapSettled(focusAlive, () => {
      const c = getCachedPlaceCoords(geoidStr);
      if (c) { flyToPlaceCoords(c, geoidStr, focusAlive); return; }
      const pc = getPlaceCoordsFromPointSource(geoidStr);
      if (pc) { flyToPlaceCoords(pc, geoidStr, focusAlive); return; }
      if (tryFocusOnPolygon(geoidStr, focusAlive, " afterWarmup")) return;

      // Final fallback: stay at state center with another idle attempt
      if (!focusAlive()) return;
      if (!easeToPlace(stateCenter, 800)) return;
      onceMapSettled(focusAlive, () => {
        if (tryFocusOnPolygon(geoidStr, focusAlive, " afterFinalFallback1")) return;
        map.once("idle", () => {
          if (!focusAlive()) return;
          tryFocusOnPolygon(geoidStr, focusAlive, " afterFinalFallback2");
        });
      });
    });
  };

  queueMicrotask(runAfterInitialFailure);
  map.once("idle", runAfterInitialFailure);
}

/**
 * Load ACS attributes for the place's state if missing from the initial viewport batch,
 * then apply feature-state styling (fixes gray fill on mobile / narrow viewports).
 */
async function ensureAttributesForFocusedGeoid(geoid) {
  const digits = String(geoid ?? "").replace(/\D/g, "");
  if (digits.length < 2) return;
  const statefp = digits.slice(0, 2).padStart(2, "0");
  try {
    const stateData = await loadPlacesAttributesByState(statefp);
    updateMapFeatureStates(map, stateData, "places-source", "places");
  } catch (err) {
    console.warn("[map] ensureAttributesForFocusedGeoid failed", statefp, err);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("charts-dock-focus-place", (e) => {
    const geoid = e.detail?.geoid;
    mapFocusLog("charts-dock-focus-place", { geoid });
    if (geoid) {
      void ensureAttributesForFocusedGeoid(geoid);
      focusMapOnGeoid(geoid);
    }
  });

  window.addEventListener("charts-dock-drawer-toggle", () => {
    if (map && typeof map.resize === "function") map.resize();
  });
}

// ============================================================================
// Places Interactivity: Load data and set up click handlers
// ============================================================================

let placesInitialized = false;

function setupPlacesInteractivity() {
  if (placesInitialized) return;
  
  if (map.getLayer('places-fill') || map.getLayer('places-outline')) {
    initializePlacesInteractivity(map, {
      enableHover: true,
      popupOffset: 10,
      popupAttributeConfig: { ...defaultPlacePopupAttributeConfig },
      onInitComplete: (states, data) => {
        console.log(`Places interactivity initialized for ${states.length} states, ${Object.keys(data).length} places`);
        placesInitialized = true;
      },
      onPlaceClick: (geoid, attrs, displayName) => {
        window.dispatchEvent(
          new CustomEvent("place-selected", {
            detail: {
              geoid,
              attrs: attrs ?? null,
              displayName: displayName || `Place ${geoid}`,
            },
          })
        );
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("q");
          url.searchParams.set("geoid", geoid);
          window.history.pushState({ geoid }, "", url);
        } catch {
          /* non-browser */
        }
      }
    }).catch(error => {
      console.error('Failed to initialize places interactivity:', error);
      placesInitialized = false;
    });
  }
}

map.on('style.load', () => { setupPlacesInteractivity(); });
map.on('load', () => { setupPlacesInteractivity(); });
if (map.loaded() && map.getStyle()) {
  setupPlacesInteractivity();
}
map.once('load', prefetchLowZoomTiles);

// ============================================================================
// Low-zoom tile prefetch: warm Cloudflare edge cache after initial load
// ============================================================================
function prefetchLowZoomTiles() {
  try {
    const style = map.getStyle();
    const templates = [
      style?.sources?.['world_low']?.tiles?.[0],
      style?.sources?.['world_labels']?.tiles?.[0],
    ].filter(Boolean);
    if (!templates.length) return;

    const coords = [];
    for (let z = 0; z <= 3; z++) {
      const max = 1 << z; // 2^z
      for (let x = 0; x < max; x++) {
        for (let y = 0; y < max; y++) {
          coords.push([z, x, y]);
        }
      }
    }

    const urls = [];
    for (const tpl of templates) {
      for (const [z, x, y] of coords) {
        urls.push(tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y));
      }
    }

    for (const [i, url] of urls.entries()) {
      setTimeout(() => fetch(url, { priority: 'low' }).catch(() => {}), i * 10);
    }
  } catch {
    // never affect map functionality
  }
}

// ============================================================================
// Expose map globally & conditionally load debug utilities
// ============================================================================
if (typeof window !== 'undefined') {
  window.map = map;

  /**
   * DevTools helper: run `mapFocusDebugProbe('4800100')` after setting `MAP_FOCUS_DEBUG = true`
   * to mirror filter vs unfiltered querySourceFeatures counts (see fly-to diagnosis).
   * @param {string} geoid
   */
  window.mapFocusDebugProbe = (geoid) => {
    const id = String(geoid);
    const c = map.getCenter();
    console.log("[mapFocusDebugProbe] geoid", id);
    console.log("[mapFocusDebugProbe] zoom", map.getZoom(), "center", [c.lng, c.lat]);
    const src = map.getSource("places-source");
    console.log("[mapFocusDebugProbe] places-source present", !!src);
    if (!src) return;
    const all = map.querySourceFeatures("places-source", {
      sourceLayer: "places",
    });
    console.log("[mapFocusDebugProbe] unfiltered count", all.length);
    if (all[0]?.properties) {
      const p = all[0].properties;
      console.log(
        "[mapFocusDebugProbe] sample GEOID",
        p.GEOID,
        typeof p.GEOID
      );
    }
    const f = map.querySourceFeatures("places-source", {
      sourceLayer: "places",
      filter: geoidQueryFilter(id),
    });
    const jsMatchCount = countJsGeoidMatchesInFeatures(all, id);
    console.log("[mapFocusDebugProbe] filtered count", f.length);
    console.log("[mapFocusDebugProbe] jsMatchCount", jsMatchCount);
    if (jsMatchCount > 0 && !f.length) {
      console.log(
        "[mapFocusDebugProbe] JS scan would match (tryFocus uses this fallback)"
      );
    }
    if (f[0]?.properties) console.log("[mapFocusDebugProbe] match", f[0].properties);
  };

  if (window.MAP_DEBUG) {
    import('./map-debug.js').then(({ initMapDebug }) => {
      initMapDebug(map);
    });
  }
}
