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

// Get projection and minZoom from window overrides or use defaults
const projectionType = (typeof window !== 'undefined' && window.mapProjection) 
  ? window.mapProjection 
  : DEFAULT_PROJECTION;

// Get minZoom based on projection type
const minZoomConfig = (typeof window !== 'undefined' && window.mapMinZoom)
  ? window.mapMinZoom
  : DEFAULT_MIN_ZOOM;

const minZoom = projectionType === 'mercator' 
  ? minZoomConfig.mercator 
  : minZoomConfig.globe;

// Get center, zoom, pitch, and bearing from window overrides or use defaults
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

// Initialize map (disable default attribution control)
// maxZoom set high to allow overzooming beyond source limits (6 for world, 15 for US)
// minZoom, center, zoom, pitch, and bearing come from theme configuration
const map = new maplibregl.Map({
  container: "map-container",
  style: "./style.json?v=" + Date.now(),  // Cache-bust to ensure latest style
  center: center,  // From theme.ts myCustomMapFixedSettings.view.center
  zoom: zoom,  // From theme.ts myCustomMapFixedSettings.view.zoom
  pitch: pitch,  // From theme.ts myCustomMapFixedSettings.view.pitch
  bearing: bearing,  // From theme.ts myCustomMapFixedSettings.view.bearing
  minZoom: minZoom,  // From theme.ts myCustomMapFixedSettings.minZoom
  maxZoom: 22,
  hash: false,
  attributionControl: false,
  canvasContextAttributes: { antialias: true }
});

// Add navigation control
map.addControl(new maplibregl.NavigationControl(), "top-right");

// Add attribution control with custom attribution
const attributionControl = new maplibregl.AttributionControl({
  compact: false,
  customAttribution: "<a href='https://maplibre.org/'>MapLibre</a> | © <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors, © <a href='https://openmaptiles.org/'>OpenMapTiles</a> | <a href='https://www.naturalearthdata.com/'>Natural Earth</a>"
});
map.addControl(attributionControl);

// Create and attach the starry background
// Configuration is read from window.starfieldConfig (generated from theme.ts) or uses defaults
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

// Override glowColors if provided in config (works with CDN version)
// This allows theme-specific colors to be applied even when using the CDN script
if (starfieldConfig && starfieldConfig.glowColors) {
  starryBg.config.glowColors = { ...starryBg.config.glowColors, ...starfieldConfig.glowColors };
}

// Set projection from theme configuration and attach starfield when style loads
map.on('style.load', () => {
  // Use projection from theme settings (or fallback)
  map.setProjection({
    type: projectionType
  });
  
  // Only attach starfield for globe projection
  if (projectionType === 'globe') {
    starryBg.attachToMap(map, "starfield-container", "globe-glow");
  }
});

// Error handling
map.on("error", (e) => console.error("Map error:", e?.error || e));

// ============================================================================
// Charts dock: fly / ease to a place selected from search (GEOID)
// querySourceFeatures only returns features for tiles already loaded; at low zoom
// or before tiles load, the place may be missing — charts still update via panel.
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

// Wait for both map load and style load to ensure layers are available
// IMPORTANT: Set up places handler FIRST so it runs before other click handlers
let placesInitialized = false;

function setupPlacesInteractivity() {
  // Prevent double initialization
  if (placesInitialized) {
    console.log('Places interactivity already initialized, skipping...');
    return;
  }
  
  // Check if layers are already available
  if (map.getLayer('places-fill') || map.getLayer('places-outline')) {
    console.log('Places layers found, initializing interactivity...');
    console.log(`Map loaded: ${map.loaded()}, Style loaded: ${!!map.getStyle()}`);
    
    // Don't set flag until initialization completes successfully
    initializePlacesInteractivity(map, {
      enableHover: true,
      popupOffset: 10,
      popupAttributeConfig: { ...defaultPlacePopupAttributeConfig },
      onInitComplete: (states, data) => {
        console.log(`✅ Places interactivity initialized for ${states.length} states`);
        console.log(`   Loaded ${Object.keys(data).length} places`);
        placesInitialized = true; // Only set flag on success
      },
      onPlaceClick: (geoid, attrs, displayName) => {
        console.log(`📍 Clicked place: ${geoid}`, attrs);
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
      console.error('❌ Failed to initialize places interactivity:', error);
      placesInitialized = false; // Ensure flag is false on error
      // Don't prevent retry - let it try again on next style.load
    });
  } else {
    console.log('Places layers not yet available, will retry...');
  }
}

// Register places handler immediately when style loads
map.on('style.load', () => {
  setupPlacesInteractivity();
});

// Also try on load
map.on('load', () => {
  setupPlacesInteractivity();
});

// And try immediately if already loaded
if (map.loaded() && map.getStyle()) {
  setupPlacesInteractivity();
}

// ============================================================================
// Debug: Log zoom level changes
// ============================================================================
let lastZoom = null;
let zoomInterval = null;

function setupZoomLogging() {
  if (zoomInterval) return; // Already set up
  
  // Log initial zoom and center
  try {
    const z = map.getZoom();
    const center = map.getCenter();
    console.log(`[Zoom] Initial: ${z.toFixed(2)}`);
    console.log(`[Center] [${center.lng.toFixed(4)}, ${center.lat.toFixed(4)}]`);
    lastZoom = z;
  } catch (e) {
    // Map not ready yet
  }
  
  // Poll zoom level and center (more reliable than events in some cases)
  zoomInterval = setInterval(() => {
    try {
      const currentZoom = map.getZoom();
      const currentCenter = map.getCenter();
      if (lastZoom === null || Math.abs(currentZoom - lastZoom) >= 0.05) {
        console.log(`[Zoom] ${currentZoom.toFixed(2)}`);
        console.log(`[Center] [${currentCenter.lng.toFixed(4)}, ${currentCenter.lat.toFixed(4)}]`);
        lastZoom = currentZoom;
      }
    } catch (e) {
      // Silently fail if map not ready
    }
  }, 500);
}

// Setup when map is ready
map.on('load', setupZoomLogging);
map.on('style.load', setupZoomLogging);

// ============================================================================
// Debug: Inspect bathymetry source data
// ============================================================================
function setupBathymetryDebug() {
  map.on('click', function(e) {
    // Skip if clicking on a places layer
    const placesFeatures = map.queryRenderedFeatures(e.point, {
      layers: ['places-fill', 'places-outline']
    });
    if (placesFeatures.length > 0) return;
    // Query bathymetry features at click location
    const bbox = [
      [e.point.x - 10, e.point.y - 10],
      [e.point.x + 10, e.point.y + 10]
    ];
    
    try {
      const bathymetryFeatures = map.queryRenderedFeatures(bbox, {
        layers: map.getStyle().layers
          .filter(l => l.id && l.id.startsWith('bathymetry-'))
          .map(l => l.id)
      });
      
      if (bathymetryFeatures.length > 0) {
        console.group('🌊 Bathymetry Features Found');
        console.log('Count:', bathymetryFeatures.length);
        bathymetryFeatures.slice(0, 3).forEach((f, i) => {
          console.log(`Feature ${i + 1}:`, {
            layer: f.layer?.id,
            source: f.source,
            sourceLayer: f.sourceLayer,
            properties: f.properties,
            depth: f.properties?.depth,
            featurecla: f.properties?.featurecla,
            scalerank: f.properties?.scalerank
          });
        });
        console.groupEnd();
      } else {
        // Try querying source features directly
        try {
          const sourceFeatures = map.querySourceFeatures('ne-bathy', {
            sourceLayer: 'ne_10m_bathymetry_F_5000',
            filter: undefined
          });
          console.group('🌊 Bathymetry Source Query');
          console.log('Source features found:', sourceFeatures.length);
          if (sourceFeatures.length > 0) {
            console.log('Sample feature:', {
              properties: sourceFeatures[0].properties,
              geometry: sourceFeatures[0].geometry?.type
            });
          }
          console.groupEnd();
        } catch (err) {
          console.log('❌ Could not query bathymetry source:', err.message);
        }
      }
    } catch (err) {
      console.log('❌ Error querying bathymetry:', err.message);
    }
  });
}

map.on('load', setupBathymetryDebug);
map.on('style.load', setupBathymetryDebug);


// Also try immediately if map is already loaded
setTimeout(() => {
  if (map.loaded()) {
    setupZoomLogging();
  }
}, 1000);


// ============================================================================
// Debug: Show road/street information on click
// ============================================================================
function setupRoadClickHandler() {
  map.on('click', function(e) {
    // Skip if clicking on a places layer
    const placesFeatures = map.queryRenderedFeatures(e.point, {
      layers: ['places-fill', 'places-outline']
    });
    if (placesFeatures.length > 0) return;
    
    // Use a bounding box for easier clicking on thin roads
    const bbox = [
      [e.point.x - 5, e.point.y - 5],
      [e.point.x + 5, e.point.y + 5]
    ];
    
    const features = map.queryRenderedFeatures(bbox, {
      layers: [
        'road-world',
        'road-world-mid',
        'road-tunnel-casing',
        'road-tunnel',
        'road-casing',
        'road-bridge',
        'road-casing-us',
        'road-us',
        'road-alley',
        'road-parking-aisle',
        'road-other',
        'road-bridge-us',
        'road-world',
        'road-world-mid',
        'paths',
        'railway'
      ]
    });

    if (features.length > 0) {
      const feature = features[0];
      const props = feature.properties;
      const layerId = feature.layer?.id;
      const currentZoom = map.getZoom();
      
      // Get the line-width from the layer's paint properties
      let lineWidth = 'N/A';
      try {
        const paintWidth = map.getPaintProperty(layerId, 'line-width');
        if (typeof paintWidth === 'number') {
          lineWidth = paintWidth.toFixed(2) + 'px';
        } else if (Array.isArray(paintWidth)) {
          // It's an expression - try to evaluate at current zoom
          lineWidth = evaluateWidthExpression(paintWidth, currentZoom, props.class);
        }
      } catch (err) {
        lineWidth = 'Error: ' + err.message;
      }
      
      // Get the line-color from the layer's paint properties
      let lineColor = 'N/A';
      try {
        const paintColor = map.getPaintProperty(layerId, 'line-color');
        if (typeof paintColor === 'string') {
          lineColor = paintColor;
        } else if (Array.isArray(paintColor)) {
          lineColor = evaluateColorExpression(paintColor, props.class);
        }
      } catch (err) {
        lineColor = 'Error: ' + err.message;
      }
      
      console.group('🛣️  Street/Road Information');
      console.log('Road Class:', props.class || 'N/A');
      console.log('Road Type:', getRoadTypeName(props.class));
      console.log('Name:', props.name || props['name:en'] || 'Unnamed');
      console.log('Brunnel:', props.brunnel || 'none (surface road)');
      console.log('Current Zoom:', currentZoom.toFixed(2));
      console.log('Line Width:', lineWidth);
      console.log('Line Color:', lineColor);
      console.log('Layer:', layerId || 'N/A');
      console.log('Network:', props.network || 'N/A');
      console.log('Ref:', props.ref || 'N/A');
      console.log('All Properties:', props);
      
      // Also query the transportation_name layer for highway shield data
      const labelFeatures = map.queryRenderedFeatures(bbox, {
        layers: ['road-label-major', 'road-label-secondary', 'road-label-tertiary', 'road-label-other']
      });
      if (labelFeatures.length > 0) {
        const labelProps = labelFeatures[0].properties;
        console.log('--- Highway Label Data ---');
        console.log('Label Ref:', labelProps.ref || 'N/A');
        console.log('Label Network:', labelProps.network || 'N/A');
        console.log('Label Route Num:', labelProps.ref_length || 'N/A');
        console.log('Label Properties:', labelProps);
      }
      console.groupEnd();
    } else {
      // Query ALL features at this point to see what's there
      const allFeatures = map.queryRenderedFeatures(bbox);
      if (allFeatures.length > 0) {
        console.group('🔍 No road layer found, but found other features:');
        console.log('Current Zoom:', map.getZoom().toFixed(2));
        allFeatures.slice(0, 5).forEach((f, i) => {
          console.log(`Feature ${i + 1}:`, {
            layer: f.layer?.id,
            source: f.source,
            sourceLayer: f.sourceLayer,
            type: f.layer?.type,
            class: f.properties?.class,
            name: f.properties?.name || f.properties?.['name:en'],
            properties: f.properties
          });
        });
        if (allFeatures.length > 5) {
          console.log(`... and ${allFeatures.length - 5} more features`);
        }
        console.groupEnd();
      } else {
        console.log('ℹ️  Clicked location has no features at all');
      }
    }
  });

  // Airport/Airfield Inspector: Query airport and airfield features at click location
  map.on('click', (e) => {
    // Skip if clicking on a places layer
    const placesFeatures = map.queryRenderedFeatures(e.point, {
      layers: ['places-fill', 'places-outline']
    });
    if (placesFeatures.length > 0) return;
    
    console.group('✈️ Airport/Airfield Inspector');
    console.log('Click Location:', e.lngLat);
    console.log('Zoom Level:', map.getZoom().toFixed(2));
    
    // Query rendered features for airports/airfields
    const bbox = [
      [e.point.x - 10, e.point.y - 10],
      [e.point.x + 10, e.point.y + 10]
    ];
    const renderedFeatures = map.queryRenderedFeatures(bbox);
    
    // Filter for airport/airfield layers
    const airportFeatures = renderedFeatures.filter(f => 
      f.layer?.id?.includes('airport') || 
      f.layer?.id?.includes('airfield') ||
      f.layer?.id?.includes('aerodrome')
    );
    
    if (airportFeatures.length > 0) {
      console.log(`\n✈️ Airport/Airfield Analysis (${airportFeatures.length} features):`);
      airportFeatures.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
        console.log(`     Class: ${f.properties?.class || 'N/A'}`);
        console.log(`     Subclass: ${f.properties?.subclass || 'N/A'}`);
        console.log(`     Place: ${f.properties?.place || 'N/A'}`);
        console.log(`     Source Layer: ${f.sourceLayer || 'N/A'}`);
        console.log(`     Layer: ${f.layer?.id || 'N/A'}`);
        console.log(`     All properties:`, f.properties);
      });
    } else {
      console.log('\nℹ️  No airports/airfields found in rendered features at this location');
      
      // Check source features to see if airports/airfields exist but aren't rendering
      const sources = ['world_low', 'world_mid', 'us_high', 'poi_us', 'world_labels'];
      console.log('\n🔍 Checking source features for airports/airfields...');
      sources.forEach(sourceName => {
        try {
          // Check aerodrome_label layer
          try {
            const aerodromeFeatures = map.querySourceFeatures(sourceName, {
              sourceLayer: 'aerodrome_label',
              filter: undefined
            });
            if (aerodromeFeatures.length > 0) {
              console.log(`\n✅ Found ${aerodromeFeatures.length} aerodrome_label features in ${sourceName}:`);
              aerodromeFeatures.slice(0, 3).forEach((f, i) => {
                console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
                console.log(`     All properties:`, f.properties);
              });
            }
          } catch (err) {
            // Source-layer may not exist, ignore
          }
          
          // Check poi layer for airports/airfields
          const poiFeatures = map.querySourceFeatures(sourceName, {
            sourceLayer: 'poi',
            filter: undefined
          });
          
          const airportPoiFeatures = poiFeatures.filter(f => {
            const props = f.properties || {};
            const classVal = (props.class || '').toLowerCase();
            const subclass = (props.subclass || '').toLowerCase();
            return classVal.includes('airport') || classVal.includes('transport') ||
                   subclass.includes('airport') || subclass.includes('airfield');
          });
          
          if (airportPoiFeatures.length > 0) {
            console.log(`\n✅ Found ${airportPoiFeatures.length} airport/airfield POI features in ${sourceName}:`);
            airportPoiFeatures.slice(0, 3).forEach((f, i) => {
              console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
              console.log(`     Class: ${f.properties?.class || 'N/A'}`);
              console.log(`     Subclass: ${f.properties?.subclass || 'N/A'}`);
              console.log(`     All properties:`, f.properties);
            });
          }
        } catch (err) {
          // Source or source-layer may not exist, ignore
        }
      });
    }
    
    console.groupEnd();
  });
  
  // Stadium Inspector: Query stadium features at click location
  map.on('click', (e) => {
    // Skip if clicking on a places layer
    const placesFeatures = map.queryRenderedFeatures(e.point, {
      layers: ['places-fill', 'places-outline']
    });
    if (placesFeatures.length > 0) return;
    
    console.group('🏟️ Stadium Inspector');
    console.log('Click Location:', e.lngLat);
    console.log('Zoom Level:', map.getZoom().toFixed(2));
    
    // Query rendered features for stadiums
    const bbox = [
      [e.point.x - 10, e.point.y - 10],
      [e.point.x + 10, e.point.y + 10]
    ];
    const renderedFeatures = map.queryRenderedFeatures(bbox);
    
    // Filter for stadium layers
    const stadiumFeatures = renderedFeatures.filter(f => 
      f.layer?.id?.includes('stadium')
    );
    
    if (stadiumFeatures.length > 0) {
      console.log(`\n🏟️ Stadium Analysis (${stadiumFeatures.length} features):`);
      stadiumFeatures.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
        console.log(`     Class: ${f.properties?.class || 'N/A'}`);
        console.log(`     Subclass: ${f.properties?.subclass || 'N/A'}`);
        console.log(`     Place: ${f.properties?.place || 'N/A'}`);
        console.log(`     Source Layer: ${f.sourceLayer || 'N/A'}`);
        console.log(`     Layer: ${f.layer?.id || 'N/A'}`);
        console.log(`     All properties:`, f.properties);
      });
    } else {
      console.log('\nℹ️  No stadiums found in rendered features at this location');
      
      // Check source features to see if stadiums exist but aren't rendering
      const sources = ['world_low', 'world_mid', 'us_high', 'poi_us', 'world_labels'];
      console.log('\n🔍 Checking source features for stadiums...');
      sources.forEach(sourceName => {
        try {
          // Check poi layer for stadiums
          const poiFeatures = map.querySourceFeatures(sourceName, {
            sourceLayer: 'poi',
            filter: undefined
          });
          
          const stadiumPoiFeatures = poiFeatures.filter(f => {
            const props = f.properties || {};
            const classVal = (props.class || '').toLowerCase();
            const subclass = (props.subclass || '').toLowerCase();
            return classVal.includes('stadium') || 
                   (classVal.includes('entertainment') && subclass.includes('stadium')) ||
                   (classVal.includes('sport') && subclass.includes('stadium')) ||
                   (classVal.includes('leisure') && subclass.includes('stadium')) ||
                   (classVal.includes('amenity') && subclass.includes('stadium'));
          });
          
          if (stadiumPoiFeatures.length > 0) {
            console.log(`\n✅ Found ${stadiumPoiFeatures.length} stadium POI features in ${sourceName}:`);
            stadiumPoiFeatures.slice(0, 5).forEach((f, i) => {
              console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
              console.log(`     Class: ${f.properties?.class || 'N/A'}`);
              console.log(`     Subclass: ${f.properties?.subclass || 'N/A'}`);
              console.log(`     Has name: ${!!f.properties?.name}`);
              console.log(`     All properties:`, f.properties);
            });
          }
          
          // Check place layer for stadiums
          try {
            const placeFeatures = map.querySourceFeatures(sourceName, {
              sourceLayer: 'place',
              filter: undefined
            });
            
            const stadiumPlaceFeatures = placeFeatures.filter(f => {
              const props = f.properties || {};
              const place = (props.place || '').toLowerCase();
              return place.includes('stadium') || place.includes('arena');
            });
            
            if (stadiumPlaceFeatures.length > 0) {
              console.log(`\n✅ Found ${stadiumPlaceFeatures.length} stadium place features in ${sourceName}:`);
              stadiumPlaceFeatures.slice(0, 5).forEach((f, i) => {
                console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
                console.log(`     Place: ${f.properties?.place || 'N/A'}`);
                console.log(`     Has name: ${!!f.properties?.name}`);
                console.log(`     All properties:`, f.properties);
              });
            }
          } catch (err) {
            // Source-layer may not exist, ignore
          }
        } catch (err) {
          // Source or source-layer may not exist, ignore
        }
      });
    }
    
    console.groupEnd();
  });
  
}

/**
 * Evaluate a MapLibre line-width expression at a given zoom level
 * Handles interpolate and match expressions
 */
function evaluateWidthExpression(expr, zoom, roadClass) {
  if (!Array.isArray(expr)) {
    return typeof expr === 'number' ? expr.toFixed(2) + 'px' : String(expr);
  }
  
  const exprType = expr[0];
  
  // Handle interpolate expressions: ["interpolate", ["linear"], ["zoom"], z1, v1, z2, v2, ...]
  if (exprType === 'interpolate') {
    const stops = expr.slice(3); // Skip ["interpolate", ["linear"], ["zoom"]]
    let prevZoom = null, prevValue = null;
    
    for (let i = 0; i < stops.length; i += 2) {
      const stopZoom = stops[i];
      let stopValue = stops[i + 1];
      
      // If the value is itself an expression (like match), try to evaluate it
      if (Array.isArray(stopValue)) {
        stopValue = evaluateWidthExpression(stopValue, zoom, roadClass);
        if (typeof stopValue === 'string') {
          stopValue = parseFloat(stopValue);
        }
      }
      
      if (zoom <= stopZoom) {
        if (prevZoom === null) {
          return stopValue.toFixed(2) + 'px';
        }
        // Linear interpolation
        const t = (zoom - prevZoom) / (stopZoom - prevZoom);
        const interpolated = prevValue + t * (stopValue - prevValue);
        return interpolated.toFixed(2) + 'px';
      }
      
      prevZoom = stopZoom;
      prevValue = stopValue;
    }
    
    // Beyond last stop
    return prevValue ? prevValue.toFixed(2) + 'px' : 'N/A';
  }
  
  // Handle match expressions: ["match", ["get", "class"], "motorway", 1.2, "trunk", 1.0, ...]
  if (exprType === 'match') {
    const matchOn = expr[1]; // ["get", "class"]
    const cases = expr.slice(2);
    const defaultValue = cases[cases.length - 1];
    
    for (let i = 0; i < cases.length - 1; i += 2) {
      const matchValue = cases[i];
      const resultValue = cases[i + 1];
      
      if (matchValue === roadClass || (Array.isArray(matchValue) && matchValue.includes(roadClass))) {
        if (Array.isArray(resultValue)) {
          return evaluateWidthExpression(resultValue, zoom, roadClass);
        }
        return typeof resultValue === 'number' ? resultValue.toFixed(2) + 'px' : String(resultValue);
      }
    }
    
    if (Array.isArray(defaultValue)) {
      return evaluateWidthExpression(defaultValue, zoom, roadClass);
    }
    return typeof defaultValue === 'number' ? defaultValue.toFixed(2) + 'px' : String(defaultValue);
  }
  
  return JSON.stringify(expr).substring(0, 50) + '...';
}

function evaluateColorExpression(expr, roadClass) {
  if (!Array.isArray(expr)) return String(expr);
  if (expr[0] === 'match') {
    const cases = expr.slice(2);
    for (let i = 0; i < cases.length - 1; i += 2) {
      if (cases[i] === roadClass || (Array.isArray(cases[i]) && cases[i].includes(roadClass))) {
        return String(cases[i + 1]);
      }
    }
    return String(cases[cases.length - 1]) + ' (default)';
  }
  return JSON.stringify(expr).substring(0, 60) + '...';
}

// Setup when map is ready
map.on('load', setupRoadClickHandler);
map.on('style.load', setupRoadClickHandler);

// Also try immediately if map is already loaded
setTimeout(() => {
  if (map.loaded()) {
    setupRoadClickHandler();
  }
}, 1000);

/**
 * Get human-readable road type name
 */
function getRoadTypeName(roadClass) {
  const roadTypes = {
    'motorway': 'Motorway/Freeway/Interstate',
    'trunk': 'Trunk Highway/Major Highway',
    'primary': 'Primary Road/State Highway',
    'secondary': 'Secondary Road/County Highway',
    'tertiary': 'Tertiary Road',
    'residential': 'Residential Street',
    'service': 'Service Road/Alley',
    'path': 'Path/Footway',
    'track': 'Track',
    'footway': 'Footway/Sidewalk',
    'cycleway': 'Cycleway/Bike Path',
    'rail': 'Railway',
  };
  return roadTypes[roadClass] || roadClass || 'Unknown';
}

// Make map available globally for debugging
if (typeof window !== 'undefined') {
  window.map = map;
  
  // ============================================================================
  // DEBUGGING UTILITIES
  // ============================================================================
  // These functions are available in the browser console for debugging:
  // - checkBuildingProperties() - Check building properties at current zoom
  // - checkBuildingZoomLevels() - Test building availability across zoom levels
  
  // Building height diagnostic function
  window.checkBuildingProperties = function() {
    console.group('🏢 Building Properties Diagnostic');
    const currentZoom = map.getZoom();
    console.log(`Current Zoom: ${currentZoom.toFixed(2)}`);
    
    // Get center of map
    const center = map.getCenter();
    const bbox = [
      [map.getCanvas().width / 2 - 50, map.getCanvas().height / 2 - 50],
      [map.getCanvas().width / 2 + 50, map.getCanvas().height / 2 + 50]
    ];
    
    // Query rendered features
    const renderedFeatures = map.queryRenderedFeatures(bbox, {
      layers: ['building', 'building-us']
    });
    
    console.log(`\n📊 Rendered Features: ${renderedFeatures.length}`);
    if (renderedFeatures.length > 0) {
      const sample = renderedFeatures[0];
      console.log('Sample rendered feature:', {
        layer: sample.layer?.id,
        properties: sample.properties,
        hasRenderHeight: 'render_height' in (sample.properties || {}),
        renderHeight: sample.properties?.render_height,
        allKeys: Object.keys(sample.properties || {})
      });
    }
    
    // Query source features
    const sourceFeatures = map.querySourceFeatures('us_high', {
      sourceLayer: 'building',
      filter: undefined
    });
    
    console.log(`\n📦 Source Features: ${sourceFeatures.length}`);
    if (sourceFeatures.length > 0) {
      const sample = sourceFeatures[0];
      console.log('Sample source feature:', {
        properties: sample.properties,
        hasRenderHeight: 'render_height' in (sample.properties || {}),
        renderHeight: sample.properties?.render_height,
        allKeys: Object.keys(sample.properties || {})
      });
      
      // Count how many have render_height
      const withHeight = sourceFeatures.filter(f => 
        f.properties && 'render_height' in f.properties && f.properties.render_height != null
      );
      const withoutHeight = sourceFeatures.length - withHeight.length;
      
      console.log(`\n📈 Height Data Availability:`);
      console.log(`  With render_height: ${withHeight.length} (${(withHeight.length / sourceFeatures.length * 100).toFixed(1)}%)`);
      console.log(`  Without render_height: ${withoutHeight} (${(withoutHeight / sourceFeatures.length * 100).toFixed(1)}%)`);
      
      if (withHeight.length > 0) {
        const heights = withHeight.map(f => f.properties.render_height).filter(h => h != null);
        console.log(`  Height range: ${Math.min(...heights)}m - ${Math.max(...heights)}m`);
        console.log(`  Average height: ${(heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1)}m`);
      }
    }
    
    console.groupEnd();
    console.log('\n💡 Tip: Zoom to different levels (10, 11, 12, 13, 14, 15) and run checkBuildingProperties() again to compare');
  };
  
  // Check building availability across zoom levels
  window.checkBuildingZoomLevels = async function() {
    console.group('🏢 Building Availability Across Zoom Levels');
    const center = map.getCenter();
    const currentZoom = map.getZoom();
    
    // First, check if we're in an area with buildings - try a larger area
    console.log('📍 Checking current location for buildings...');
    const fullViewport = [
      [0, 0],
      [map.getCanvas().width, map.getCanvas().height]
    ];
    
    const initialCheck = map.queryRenderedFeatures(fullViewport, {
      layers: ['building', 'building-us']
    });
    console.log(`  Current viewport has ${initialCheck.length} rendered buildings`);
    
    if (initialCheck.length === 0) {
      console.warn('⚠️ No buildings found in current view. Try navigating to a city area first.');
      console.log('💡 Tip: Navigate to a city (e.g., New York, Los Angeles) and try again');
      console.groupEnd();
      return;
    }
    
    // Test zoom levels from 6 to 15
    const testZooms = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const results = [];
    
    console.log('\n🔍 Testing zoom levels...');
    
    for (const zoom of testZooms) {
      map.setZoom(zoom);
      map.setCenter(center);
      
      // Wait for map to update (longer wait for tile loading)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use full viewport for query
      const viewport = [
        [0, 0],
        [map.getCanvas().width, map.getCanvas().height]
      ];
      
      // Check rendered features
      const renderedFeatures = map.queryRenderedFeatures(viewport, {
        layers: ['building', 'building-us']
      });
      
      // Check source features
      const sourceFeatures = map.querySourceFeatures('us_high', {
        sourceLayer: 'building',
        filter: undefined
      });
      
      const withHeight = sourceFeatures.filter(f => 
        f.properties && 'render_height' in f.properties && f.properties.render_height != null
      );
      
      results.push({
        zoom,
        rendered: renderedFeatures.length,
        source: sourceFeatures.length,
        withHeight: withHeight.length,
        hasHeightData: withHeight.length > 0 && sourceFeatures.length > 0 ? (withHeight.length / sourceFeatures.length * 100).toFixed(1) + '%' : '0%'
      });
    }
    
    // Restore original zoom
    map.setZoom(currentZoom);
    map.setCenter(center);
    
    console.table(results);
    console.log('\n📊 Summary:');
    const firstRendered = results.find(r => r.rendered > 0);
    const firstWithHeight = results.find(r => r.withHeight > 0);
    console.log(`  First zoom with rendered buildings: ${firstRendered ? `z${firstRendered.zoom}` : 'none'}`);
    console.log(`  First zoom with height data: ${firstWithHeight ? `z${firstWithHeight.zoom}` : 'none'}`);
    
    if (firstRendered && firstWithHeight && firstRendered.zoom !== firstWithHeight.zoom) {
      console.log(`\n💡 Default color will show from z${firstRendered.zoom} to z${firstWithHeight.zoom - 1}`);
      console.log(`   Height-based colors will show from z${firstWithHeight.zoom}+`);
    }
    
    console.groupEnd();
  };
}
