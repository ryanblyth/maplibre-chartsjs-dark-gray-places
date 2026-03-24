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
/** Search fly-to always uses this zoom (bounds center + dock offset). */
const FOCUS_SEARCH_ZOOM = 9;
/** Incremented on each search focus; stale `idle` handlers must not move the map. */
let mapFocusOpSeq = 0;

/** Look up [lng, lat] for a GEOID from the static centroids module. */
function getCachedPlaceCoords(geoid) {
  const key = normalizeGeoidDigits(geoid);
  return placeCentroidsByGeoid[key] ?? null;
}

// #region agent log
function agentFocusDbg(message, data, hypothesisId) {
  fetch("http://127.0.0.1:7542/ingest/3f936112-97d1-496a-9023-983de7d6ae11", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "35c9c0",
    },
    body: JSON.stringify({
      sessionId: "35c9c0",
      runId: "static-centroids",
      hypothesisId,
      location: "map.js:focus",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

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

function focusMapOnGeoid(geoid) {
  const id = String(geoid);
  const statefp = id.length >= 2 ? id.slice(0, 2) : id.padStart(2, "0");
  mapFocusOpSeq += 1;
  const focusOpId = mapFocusOpSeq;
  const focusAlive = () => focusOpId === mapFocusOpSeq;
  try {
    map.stop();
  } catch {
    /* ignore */
  }
  mapFocusLog("focusMapOnGeoid start", { geoid: id, statefp, focusOpId });
  // #region agent log
  agentFocusDbg(
    "focusMapOnGeoid_enter",
    {
      geoid: id,
      statefp,
      focusOpId,
      preZoom: typeof map.getZoom === "function" ? map.getZoom() : null,
      preCenter:
        typeof map.getCenter === "function" ? map.getCenter().toArray() : null,
    },
    "H3-H5"
  );
  // #endregion

  const tryFocus = (phase = "") => {
    if (!focusAlive()) {
      // #region agent log
      agentFocusDbg(
        "tryFocus_superseded",
        { phase, focusOpId },
        "H3"
      );
      // #endregion
      return false;
    }
    if (!map.getSource("places-source")) {
      mapFocusLog(`tryFocus${phase}: no places-source`);
      return false;
    }
    // PMTiles places maxzoom 12: querySourceFeatures needs tiles loaded; z9+ is enough in normal cases.
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
      if (jsMatchCount > 0) {
        const want = normalizeGeoidDigits(id);
        const jsFeat = allLoaded.find(
          (ft) => normalizeGeoidDigits(ft.properties?.GEOID) === want
        );
        if (jsFeat) {
          filtered = [jsFeat];
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

    if (!filtered.length) {
      // #region agent log
      agentFocusDbg(
        "tryFocus_no_feature",
        { phase, zoom: map.getZoom() },
        "H2"
      );
      // #endregion
      return false;
    }

    const feat = filtered[0];
    const bb = geometryBounds(feat.geometry);
    const t = feat.geometry?.type;
    if (bb) {
      if (!focusAlive()) {
        // #region agent log
        agentFocusDbg(
          "tryFocus_superseded_before_easeTo",
          { phase, focusOpId },
          "H3"
        );
        // #endregion
        return false;
      }
      const cx = (bb[0][0] + bb[1][0]) / 2;
      const cy = (bb[0][1] + bb[1][1]) / 2;
      const dockW = getChartsDockOverlapPx();
      try {
        // #region agent log
        agentFocusDbg(
          "tryFocus_easeTo_polygon",
          {
            phase,
            targetZoom: FOCUS_SEARCH_ZOOM,
            cx,
            cy,
            geomType: t,
            dockW,
            mapZoomBefore: map.getZoom(),
          },
          "H1-H4"
        );
        // #endregion
        map.easeTo({
          center: [cx, cy],
          zoom: FOCUS_SEARCH_ZOOM,
          duration: 1100,
          offset: [-dockW / 2, 0],
        });
        mapFocusLog(`tryFocus${phase}: easeTo fixed z${FOCUS_SEARCH_ZOOM} ok`, {
          geomType: t,
        });
        return true;
      } catch (err) {
        console.error("[map focus] easeTo (search focus) failed:", err);
      }
    } else {
      // #region agent log
      agentFocusDbg(
        "tryFocus_no_bounds",
        { phase, geomType: feat.geometry?.type },
        "H1"
      );
      // #endregion
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

  /** Fly to place coordinates at FOCUS_SEARCH_ZOOM, then tryFocus the polygon source. */
  const flyToPlaceCoords = (coords) => {
    if (!focusAlive()) {
      // #region agent log
      agentFocusDbg(
        "flyToPlaceCoords_superseded",
        { focusOpId },
        "H3"
      );
      // #endregion
      return;
    }
    // #region agent log
    agentFocusDbg(
      "flyToPlaceCoords",
      {
        coords,
        targetZoom: FOCUS_SEARCH_ZOOM,
        mapZoomBefore: map.getZoom(),
      },
      "H2-H4"
    );
    // #endregion
    try {
      map.easeTo({
        center: coords,
        zoom: FOCUS_SEARCH_ZOOM,
        duration: 1000,
        offset: [-dockW() / 2, 0],
      });
    } catch (err) {
      console.error("[map focus] easeTo (place coords) failed:", err);
      return;
    }
    map.once("idle", () => {
      if (!focusAlive()) {
        // #region agent log
        agentFocusDbg(
          "idle_superseded",
          { where: "afterFlyToPlaceCoords1", focusOpId },
          "H3"
        );
        // #endregion
        return;
      }
      if (tryFocus(" afterWarmupIdle1")) return;
      map.once("idle", () => {
        if (!focusAlive()) {
          // #region agent log
          agentFocusDbg(
            "idle_superseded",
            { where: "afterFlyToPlaceCoords2", focusOpId },
            "H3"
          );
          // #endregion
          return;
        }
        tryFocus(" afterWarmupIdle2");
      });
    });
  };

  const warmupStateThenRetry = () => {
    if (!focusAlive()) {
      // #region agent log
      agentFocusDbg(
        "warmupStateThenRetry_superseded",
        { focusOpId },
        "H3"
      );
      // #endregion
      return;
    }
    // Step 1: try cached coords first, then live tile query
    const cached = getCachedPlaceCoords(id);
    if (cached) {
      // #region agent log
      agentFocusDbg(
        "warmup_skip_has_cached_coords",
        { coords: cached, geoid: id },
        "H9"
      );
      // #endregion
      flyToPlaceCoords(cached);
      return;
    }
    const pointCoords = getPlaceCoordsFromPointSource();
    if (pointCoords) {
      // #region agent log
      agentFocusDbg(
        "warmup_skip_has_point_coords",
        { pointCoords, geoid: id },
        "H2"
      );
      // #endregion
      flyToPlaceCoords(pointCoords);
      return;
    }

    // Step 2: fly to state center at FOCUS_SEARCH_ZOOM so tiles for that state load at target zoom
    const stateCenter = getStateApproxCenterLngLat(statefp);
    if (!stateCenter) {
      return;
    }

    // #region agent log
    agentFocusDbg(
      "warmup_easeTo_state_z9",
      {
        statefp,
        stateCenter,
        geoid: id,
        zoom: FOCUS_SEARCH_ZOOM,
      },
      "H6"
    );
    // #endregion
    if (!focusAlive()) return;
    try {
      map.easeTo({
        center: stateCenter,
        zoom: FOCUS_SEARCH_ZOOM,
        duration: 900,
        offset: [-dockW() / 2, 0],
      });
    } catch (err) {
      console.error("[map focus] easeTo (point tile load) failed:", err);
      return;
    }

    /** MapLibre may not emit `idle` again if the map is already idle when `once("idle")` is registered. */
    let postStateWarmupSettleRan = false;
    const runAfterStateWarmupSettled = () => {
      if (postStateWarmupSettleRan) return;
      if (!focusAlive()) {
        // #region agent log
        agentFocusDbg(
          "idle_superseded",
          { where: "afterWarmupStateZ9", focusOpId },
          "H3"
        );
        // #endregion
        return;
      }
      postStateWarmupSettleRan = true;
      // #region agent log
      agentFocusDbg(
        "warmup_post_state_settle",
        {
          geoid: id,
          focusOpId,
          tilesLoaded:
            typeof map.areTilesLoaded === "function"
              ? map.areTilesLoaded()
              : null,
          moving:
            typeof map.isMoving === "function" ? map.isMoving() : null,
        },
        "H8"
      );
      // #endregion
      // Try cache first, then live tile query
      const cachedC = getCachedPlaceCoords(id);
      if (cachedC) {
        flyToPlaceCoords(cachedC);
        return;
      }
      const coords = getPlaceCoordsFromPointSource();
      if (coords) {
        flyToPlaceCoords(coords);
        return;
      }
      if (tryFocus(" afterWarmupStateZ9")) return;
      // Step 3: final fallback — state center at FOCUS_SEARCH_ZOOM (best effort)
      // #region agent log
      agentFocusDbg(
        "warmup_state_fallback_z9",
        { stateCenter, geoid: id },
        "H2"
      );
      // #endregion
      if (!focusAlive()) return;
      try {
        map.easeTo({
          center: stateCenter,
          zoom: FOCUS_SEARCH_ZOOM,
          duration: 800,
          offset: [-dockW() / 2, 0],
        });
      } catch (err) {
        console.error("[map focus] easeTo (state fallback) failed:", err);
        return;
      }
      let fallbackSettleRan = false;
      const runAfterFallbackSettled = () => {
        if (fallbackSettleRan) return;
        if (!focusAlive()) {
          // #region agent log
          agentFocusDbg(
            "idle_superseded",
            { where: "afterStateFallbackZ9_1", focusOpId },
            "H3"
          );
          // #endregion
          return;
        }
        fallbackSettleRan = true;
        if (tryFocus(" afterStateFallbackIdle1")) return;
        map.once("idle", () => {
          if (!focusAlive()) {
            // #region agent log
            agentFocusDbg(
              "idle_superseded",
              { where: "afterStateFallbackZ9_2", focusOpId },
              "H3"
            );
            // #endregion
            return;
          }
          tryFocus(" afterStateFallbackIdle2");
        });
      };
      map.once("idle", runAfterFallbackSettled);
      map.once("moveend", () => {
        queueMicrotask(() => {
          if (!focusAlive() || fallbackSettleRan) return;
          runAfterFallbackSettled();
        });
      });
    };

    map.once("idle", runAfterStateWarmupSettled);
    map.once("moveend", () => {
      queueMicrotask(() => {
        if (!focusAlive() || postStateWarmupSettleRan) return;
        runAfterStateWarmupSettled();
      });
    });
  };

  // Best path: use cached place centroid (tile-independent, built at init idle).
  const cachedCoords = getCachedPlaceCoords(id);
  if (cachedCoords) {
    // #region agent log
    agentFocusDbg(
      "focus_path_cached_coords",
      { geoid: id, coords: cachedCoords },
      "H9"
    );
    // #endregion
    flyToPlaceCoords(cachedCoords);
    return;
  }

  // Fallback: try live tile query on point source (available at low zoom).
  const initialPointCoords = getPlaceCoordsFromPointSource();
  if (initialPointCoords) {
    // #region agent log
    agentFocusDbg(
      "focus_path_point_first",
      { geoid: id, coords: initialPointCoords },
      "H7"
    );
    // #endregion
    flyToPlaceCoords(initialPointCoords);
    return;
  }

  if (tryFocus(" initial")) return;

  let fallbackRan = false;
  const runAfterInitialFailure = () => {
    if (!focusAlive()) {
      // #region agent log
      agentFocusDbg(
        "runAfterInitialFailure_superseded",
        { focusOpId },
        "H3"
      );
      // #endregion
      return;
    }
    if (fallbackRan) return;
    fallbackRan = true;
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
    mapFocusLog("charts-dock-focus-place", { geoid });
    // #region agent log
    agentFocusDbg(
      "event_charts_dock_focus_place",
      { geoid: geoid ?? null, t: Date.now() },
      "H3"
    );
    // #endregion
    if (geoid) focusMapOnGeoid(geoid);
  });
}

// ============================================================================
// Places Interactivity: Load data and set up click handlers
// ============================================================================
import { getStateApproxCenterLngLat } from "./data/stateCentroids.js";
import { placeCentroidsByGeoid } from "./data/placeCentroids.js";
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
