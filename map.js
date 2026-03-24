/* global maplibregl, pmtiles */

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
// These values match basemaps/my-custom-map-fixed/styles/theme.ts myCustomMapFixedSettings
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

// Initialize map
const map = new maplibregl.Map({
  container: "map-container",
  style: "./style.json?v=" + Date.now(),
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

// Starry background (globe projection only)
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

const starryBg = new MapLibreStarryBackground(starfieldConfig);

if (starfieldConfig && starfieldConfig.glowColors) {
  starryBg.config.glowColors = { ...starryBg.config.glowColors, ...starfieldConfig.glowColors };
}

map.on('style.load', () => {
  map.setProjection({ type: projectionType });
  if (projectionType === 'globe') {
    starryBg.attachToMap(map, "starfield-container", "globe-glow");
  }
});

map.on("error", (e) => console.error("Map error:", e?.error || e));

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
const FOCUS_PADDING_PX = 56;
const FOCUS_WARMUP_ZOOM = 13;
/** Second-pass tile load when z13 state center still has no target feature in memory (H3). */
const FOCUS_WARMUP_ZOOM_BUMP = 15;
const MIN_FIT_INNER_PX = 80;

function mapFocusDebugEnabled() {
  return typeof window !== "undefined" && window.MAP_FOCUS_DEBUG === true;
}

function mapFocusLog(...args) {
  if (mapFocusDebugEnabled()) console.log("[map focus]", ...args);
}

function getChartsDockOverlapPx() {
  if (typeof document === "undefined") return 0;
  const dock = document.getElementById("charts-dock");
  return dock ? dock.getBoundingClientRect().width : 0;
}

function focusPaddingOptions() {
  const dockW = getChartsDockOverlapPx();
  const p = FOCUS_PADDING_PX;
  let top = p;
  let bottom = p;
  let left = p;
  let right = p + dockW;
  try {
    const canvas = map.getCanvas();
    const w = canvas?.clientWidth ?? 0;
    const h = canvas?.clientHeight ?? 0;
    if (w > 0 && left + right > w - MIN_FIT_INNER_PX) {
      const budget = w - MIN_FIT_INNER_PX;
      const sum = left + right;
      left = Math.max(8, (left / sum) * budget);
      right = Math.max(8, (right / sum) * budget);
    }
    if (h > 0 && top + bottom > h - MIN_FIT_INNER_PX) {
      const budget = h - MIN_FIT_INNER_PX;
      const sum = top + bottom;
      top = Math.max(8, (top / sum) * budget);
      bottom = Math.max(8, (bottom / sum) * budget);
    }
  } catch {
    /* keep defaults */
  }
  return { top, bottom, left, right };
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

/** Count features in memory whose GEOID matches (handles string vs number). */
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

// #region agent log
function agentDebugLog(message, data, hypothesisId) {
  fetch("http://127.0.0.1:7542/ingest/3f936112-97d1-496a-9023-983de7d6ae11", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "35c9c0",
    },
    body: JSON.stringify({
      sessionId: "35c9c0",
      location: "map.js",
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
    }),
  }).catch(() => {});
}
// #endregion

function focusMapOnGeoid(geoid) {
  const id = String(geoid);
  const statefp = id.length >= 2 ? id.slice(0, 2) : id.padStart(2, "0");
  mapFocusLog("focusMapOnGeoid start", { geoid: id, statefp });

  const tryFocus = (phase = "") => {
    if (!map.getSource("places-source")) {
      mapFocusLog(`tryFocus${phase}: no places-source`);
      return false;
    }
    // PMTiles places maxzoom 12: querySourceFeatures is only reliable once
    // the map has loaded tiles at high zoom (see placesPopup.ts).
    let filtered = map.querySourceFeatures("places-source", {
      sourceLayer: "places",
      filter: geoidQueryFilter(id),
    });

    let allLoaded = null;
    if (!filtered.length) {
      allLoaded = map.querySourceFeatures("places-source", {
        sourceLayer: "places",
      });
      const jsMatchCount = countJsGeoidMatchesInFeatures(allLoaded, id);
      agentDebugLog(
        "tryFocus_maplibreFilterZero",
        {
          phase,
          geoid: id,
          zoom: map.getZoom(),
          unfilteredCount: allLoaded.length,
          jsMatchCount,
        },
        jsMatchCount === 0 ? "H3" : "H4"
      );
      if (jsMatchCount > 0) {
        const want = normalizeGeoidDigits(id);
        const jsFeat = allLoaded.find(
          (ft) => normalizeGeoidDigits(ft.properties?.GEOID) === want
        );
        if (jsFeat) {
          filtered = [jsFeat];
          agentDebugLog(
            "tryFocus_jsFallbackUsed",
            { phase, geoid: id },
            "H4fallback"
          );
        }
      }
    }

    if (mapFocusDebugEnabled()) {
      const c = map.getCenter();
      const unfiltered =
        allLoaded ??
        map.querySourceFeatures("places-source", {
          sourceLayer: "places",
        });
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
    agentDebugLog(
      "tryFocus_resolved",
      { phase, geoid: id, geomType: feat.geometry?.type },
      "VERIFY"
    );
    const bb = geometryBounds(feat.geometry);
    const t = feat.geometry?.type;
    if (bb && (t === "Polygon" || t === "MultiPolygon")) {
      try {
        map.fitBounds(bb, {
          padding: focusPaddingOptions(),
          maxZoom: 12,
          duration: 1100,
        });
        mapFocusLog(`tryFocus${phase}: fitBounds ok`, { geomType: t });
        return true;
      } catch (err) {
        console.error("[map focus] fitBounds failed:", err);
      }
    }
    if (bb) {
      const cx = (bb[0][0] + bb[1][0]) / 2;
      const cy = (bb[0][1] + bb[1][1]) / 2;
      const dockW = getChartsDockOverlapPx();
      try {
        map.easeTo({
          center: [cx, cy],
          zoom: Math.max(map.getZoom(), 10),
          duration: 1100,
          offset: [-dockW / 2, 0],
        });
        mapFocusLog(`tryFocus${phase}: easeTo centroid ok`, { geomType: t });
        return true;
      } catch (err) {
        console.error("[map focus] easeTo (centroid) failed:", err);
      }
    }
    return false;
  };

  const dockW = () => getChartsDockOverlapPx();

  /** Try to get [lng, lat] from the low-zoom points source (available z0–7). */
  const getPlaceCoordsFromPointSource = () => {
    const sourceLayers = ["places", "points", "places_points"];
    for (const sl of sourceLayers) {
      try {
        const pts = map.querySourceFeatures("places-low-source", {
          sourceLayer: sl,
          filter: geoidQueryFilter(id),
        });
        if (pts.length) {
          const g = pts[0].geometry;
          if (g?.type === "Point" && g.coordinates) {
            return [g.coordinates[0], g.coordinates[1]];
          }
        }
        // JS fallback scan
        const all = map.querySourceFeatures("places-low-source", {
          sourceLayer: sl,
        });
        const want = normalizeGeoidDigits(id);
        const match = all.find(
          (ft) => normalizeGeoidDigits(ft.properties?.GEOID) === want
        );
        if (match?.geometry?.type === "Point" && match.geometry.coordinates) {
          return [match.geometry.coordinates[0], match.geometry.coordinates[1]];
        }
      } catch {
        /* source layer may not exist */
      }
    }
    return null;
  };

  /** Fly to exact coordinates at z13, then tryFocus the polygon source. */
  const flyToPlaceCoords = (coords, source) => {
    agentDebugLog(
      "warmup_center",
      { geoid: id, statefp, usedPointSource: true, center: coords, zoom: FOCUS_WARMUP_ZOOM, source },
      "WARMUP"
    );
    try {
      map.easeTo({
        center: coords,
        zoom: FOCUS_WARMUP_ZOOM,
        duration: 1000,
        offset: [-dockW() / 2, 0],
      });
    } catch (err) {
      console.error("[map focus] easeTo (place coords) failed:", err);
      return;
    }
    map.once("idle", () => {
      if (tryFocus(" afterWarmupIdle1")) return;
      map.once("idle", () => {
        tryFocus(" afterWarmupIdle2");
      });
    });
  };

  const warmupStateThenRetry = () => {
    // Step 1: try the low-zoom points source for exact coordinates (already loaded tiles)
    const pointCoords = getPlaceCoordsFromPointSource();
    if (pointCoords) {
      flyToPlaceCoords(pointCoords, "pointSourceDirect");
      return;
    }

    // Step 2: fly to state center at z6 to load point-source tiles, then re-query
    const stateCenter = getStateApproxCenterLngLat(statefp);
    if (!stateCenter) {
      agentDebugLog(
        "warmup_center",
        { geoid: id, statefp, usedPointSource: false, center: null, zoom: null },
        "WARMUP"
      );
      return;
    }

    agentDebugLog(
      "warmup_pointSourceLoad",
      { geoid: id, statefp, stateCenter, zoom: 6 },
      "H6"
    );
    try {
      map.easeTo({
        center: stateCenter,
        zoom: 6,
        duration: 600,
        offset: [-dockW() / 2, 0],
      });
    } catch (err) {
      console.error("[map focus] easeTo (point tile load) failed:", err);
      return;
    }
    map.once("idle", () => {
      const coords = getPlaceCoordsFromPointSource();
      if (coords) {
        flyToPlaceCoords(coords, "pointSourceAfterStateZoom");
        return;
      }
      // Step 3: final fallback — go to state center at z13 (best effort)
      agentDebugLog(
        "warmup_center",
        { geoid: id, statefp, usedPointSource: false, center: stateCenter, zoom: FOCUS_WARMUP_ZOOM },
        "WARMUP"
      );
      try {
        map.easeTo({
          center: stateCenter,
          zoom: FOCUS_WARMUP_ZOOM,
          duration: 800,
          offset: [-dockW() / 2, 0],
        });
      } catch (err) {
        console.error("[map focus] easeTo (state fallback) failed:", err);
        return;
      }
      map.once("idle", () => {
        if (tryFocus(" afterStateFallbackIdle1")) return;
        map.once("idle", () => {
          tryFocus(" afterStateFallbackIdle2");
        });
      });
    });
  };

  if (tryFocus(" initial")) return;

  let fallbackRan = false;
  const runAfterInitialFailure = () => {
    if (fallbackRan) return;
    fallbackRan = true;
    agentDebugLog(
      "focus_fallback_idlePass1",
      {
        geoid: id,
        tilesLoaded: map.areTilesLoaded(),
      },
      "IDLE"
    );
    mapFocusLog("idle pass 1");
    if (tryFocus(" afterIdle1")) return;
    warmupStateThenRetry();
  };

  // Already-idle maps may never emit another "idle" until something moves; areTilesLoaded()
  // can also be false while the map looks still. Run on next microtask and also on idle (once).
  queueMicrotask(runAfterInitialFailure);
  map.once("idle", runAfterInitialFailure);
}

if (typeof window !== "undefined") {
  window.addEventListener("charts-dock-focus-place", (e) => {
    const geoid = e.detail?.geoid;
    agentDebugLog("charts_dock_focus_place", { geoid }, "H1");
    mapFocusLog("charts-dock-focus-place", { geoid });
    if (geoid) focusMapOnGeoid(geoid);
  });
}

// ============================================================================
// Places Interactivity: Load data and set up click handlers
// ============================================================================
import { getStateApproxCenterLngLat } from "./data/stateCentroids.js";
import { initializePlacesInteractivity } from './shared/utils/placesMapSetup.js';
import { defaultPlacePopupAttributeConfig } from './shared/utils/placesPopup.js';

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
    const probeHypothesis =
      jsMatchCount === 0 ? "H3" : f.length > 0 ? "H5" : "H4";
    agentDebugLog(
      "mapFocusDebugProbe",
      {
        geoid: id,
        zoom: map.getZoom(),
        unfilteredCount: all.length,
        maplibreFilteredCount: f.length,
        jsMatchCount,
      },
      probeHypothesis
    );
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
