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

map.addControl(new maplibregl.NavigationControl(), "top-right");

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

// ============================================================================
// Charts dock: fly / ease to a place selected from search (GEOID)
// ============================================================================
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

function focusMapOnGeoid(geoid) {
  const id = String(geoid);
  const tryFocus = () => {
    if (!map.getSource("places-source")) return false;
    const features = map.querySourceFeatures("places-source", {
      sourceLayer: "places",
      filter: ["==", ["to-string", ["get", "GEOID"]], id],
    });
    if (!features.length) return false;

    const feat = features[0];
    const bb = geometryBounds(feat.geometry);
    const t = feat.geometry?.type;
    if (
      bb &&
      (t === "Polygon" || t === "MultiPolygon")
    ) {
      try {
        map.fitBounds(bb, { padding: 56, maxZoom: 12, duration: 1100 });
        return true;
      } catch {
        /* fall through to center */
      }
    }
    if (bb) {
      const cx = (bb[0][0] + bb[1][0]) / 2;
      const cy = (bb[0][1] + bb[1][1]) / 2;
      map.easeTo({
        center: [cx, cy],
        zoom: Math.max(map.getZoom(), 10),
        duration: 1100,
      });
      return true;
    }
    return false;
  };

  if (tryFocus()) return;
  map.once("idle", () => {
    tryFocus();
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("charts-dock-focus-place", (e) => {
    const geoid = e.detail?.geoid;
    if (geoid) focusMapOnGeoid(geoid);
  });
}

// ============================================================================
// Places Interactivity: Load data and set up click handlers
// ============================================================================
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

  if (window.MAP_DEBUG) {
    import('./map-debug.js').then(({ initMapDebug }) => {
      initMapDebug(map);
    });
  }
}
