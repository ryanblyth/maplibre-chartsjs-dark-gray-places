/**
 * Map Debug Utilities
 *
 * Opt-in debug inspectors for bathymetry, roads, airports, stadiums, buildings,
 * and zoom logging. Gated behind window.MAP_DEBUG — only loaded when enabled.
 *
 * Enable in the browser console before the page loads:
 *   window.MAP_DEBUG = true;
 *
 * Or add to preview.html before map.js:
 *   <script>window.MAP_DEBUG = true;</script>
 *
 * Console utilities (available after init):
 *   checkBuildingProperties()  — building data at current zoom
 *   checkBuildingZoomLevels()  — building availability across zoom levels
 */

let _initialized = false;

export function initMapDebug(map) {
  if (_initialized) return;
  _initialized = true;

  console.log('[MAP_DEBUG] Debug inspectors enabled');

  setupZoomLogging(map);
  setupBathymetryDebug(map);
  setupRoadClickHandler(map);
  setupBuildingDiagnostics(map);
}

// ============================================================================
// Zoom logging (polls every 500ms)
// ============================================================================
function setupZoomLogging(map) {
  let lastZoom = null;

  try {
    const z = map.getZoom();
    const c = map.getCenter();
    console.log(`[Zoom] Initial: ${z.toFixed(2)}`);
    console.log(`[Center] [${c.lng.toFixed(4)}, ${c.lat.toFixed(4)}]`);
    lastZoom = z;
  } catch {
    /* map not ready yet */
  }

  setInterval(() => {
    try {
      const currentZoom = map.getZoom();
      const currentCenter = map.getCenter();
      if (lastZoom === null || Math.abs(currentZoom - lastZoom) >= 0.05) {
        console.log(`[Zoom] ${currentZoom.toFixed(2)}`);
        console.log(`[Center] [${currentCenter.lng.toFixed(4)}, ${currentCenter.lat.toFixed(4)}]`);
        lastZoom = currentZoom;
      }
    } catch {
      /* map not ready */
    }
  }, 500);
}

// ============================================================================
// Bathymetry click inspector
// ============================================================================
function setupBathymetryDebug(map) {
  map.on('click', (e) => {
    const placesFeatures = map.queryRenderedFeatures(e.point, {
      layers: ['places-fill', 'places-outline']
    });
    if (placesFeatures.length > 0) return;

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
        console.group('Bathymetry Features Found');
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
        try {
          const sourceFeatures = map.querySourceFeatures('ne-bathy', {
            sourceLayer: 'ne_10m_bathymetry_F_5000',
            filter: undefined
          });
          console.group('Bathymetry Source Query');
          console.log('Source features found:', sourceFeatures.length);
          if (sourceFeatures.length > 0) {
            console.log('Sample feature:', {
              properties: sourceFeatures[0].properties,
              geometry: sourceFeatures[0].geometry?.type
            });
          }
          console.groupEnd();
        } catch (err) {
          console.log('Could not query bathymetry source:', err.message);
        }
      }
    } catch (err) {
      console.log('Error querying bathymetry:', err.message);
    }
  });
}

// ============================================================================
// Road / Airport / Stadium click inspectors
// ============================================================================
const ROAD_LAYERS = [
  'road-world', 'road-world-mid', 'road-tunnel-casing', 'road-tunnel',
  'road-casing', 'road-bridge', 'road-casing-us', 'road-us', 'road-alley',
  'road-parking-aisle', 'road-other', 'road-bridge-us', 'paths', 'railway'
];

const ROAD_TYPE_NAMES = {
  motorway: 'Motorway/Freeway/Interstate',
  trunk: 'Trunk Highway/Major Highway',
  primary: 'Primary Road/State Highway',
  secondary: 'Secondary Road/County Highway',
  tertiary: 'Tertiary Road',
  residential: 'Residential Street',
  service: 'Service Road/Alley',
  path: 'Path/Footway',
  track: 'Track',
  footway: 'Footway/Sidewalk',
  cycleway: 'Cycleway/Bike Path',
  rail: 'Railway',
};

function setupRoadClickHandler(map) {
  map.on('click', (e) => {
    const placesFeatures = map.queryRenderedFeatures(e.point, {
      layers: ['places-fill', 'places-outline']
    });
    if (placesFeatures.length > 0) return;

    const bbox = [
      [e.point.x - 5, e.point.y - 5],
      [e.point.x + 5, e.point.y + 5]
    ];

    const features = map.queryRenderedFeatures(bbox, { layers: ROAD_LAYERS });

    if (features.length > 0) {
      logRoadFeature(map, features[0], bbox);
    } else {
      logNonRoadFeatures(map, bbox);
    }
  });

  map.on('click', (e) => {
    const placesFeatures = map.queryRenderedFeatures(e.point, {
      layers: ['places-fill', 'places-outline']
    });
    if (placesFeatures.length > 0) return;
    logAirportFeatures(map, e);
  });

  map.on('click', (e) => {
    const placesFeatures = map.queryRenderedFeatures(e.point, {
      layers: ['places-fill', 'places-outline']
    });
    if (placesFeatures.length > 0) return;
    logStadiumFeatures(map, e);
  });
}

function logRoadFeature(map, feature, bbox) {
  const props = feature.properties;
  const layerId = feature.layer?.id;
  const currentZoom = map.getZoom();

  let lineWidth = 'N/A';
  try {
    const paintWidth = map.getPaintProperty(layerId, 'line-width');
    if (typeof paintWidth === 'number') {
      lineWidth = paintWidth.toFixed(2) + 'px';
    } else if (Array.isArray(paintWidth)) {
      lineWidth = evaluateWidthExpression(paintWidth, currentZoom, props.class);
    }
  } catch (err) {
    lineWidth = 'Error: ' + err.message;
  }

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

  console.group('Street/Road Information');
  console.log('Road Class:', props.class || 'N/A');
  console.log('Road Type:', ROAD_TYPE_NAMES[props.class] || props.class || 'Unknown');
  console.log('Name:', props.name || props['name:en'] || 'Unnamed');
  console.log('Brunnel:', props.brunnel || 'none (surface road)');
  console.log('Current Zoom:', currentZoom.toFixed(2));
  console.log('Line Width:', lineWidth);
  console.log('Line Color:', lineColor);
  console.log('Layer:', layerId || 'N/A');
  console.log('Network:', props.network || 'N/A');
  console.log('Ref:', props.ref || 'N/A');
  console.log('All Properties:', props);

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
}

function logNonRoadFeatures(map, bbox) {
  const allFeatures = map.queryRenderedFeatures(bbox);
  if (allFeatures.length > 0) {
    console.group('No road layer found, but found other features:');
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
  }
}

function logAirportFeatures(map, e) {
  console.group('Airport/Airfield Inspector');
  console.log('Click Location:', e.lngLat);
  console.log('Zoom Level:', map.getZoom().toFixed(2));

  const bbox = [
    [e.point.x - 10, e.point.y - 10],
    [e.point.x + 10, e.point.y + 10]
  ];
  const renderedFeatures = map.queryRenderedFeatures(bbox);

  const airportFeatures = renderedFeatures.filter(f =>
    f.layer?.id?.includes('airport') ||
    f.layer?.id?.includes('airfield') ||
    f.layer?.id?.includes('aerodrome')
  );

  if (airportFeatures.length > 0) {
    console.log(`Airport/Airfield Analysis (${airportFeatures.length} features):`);
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
    console.log('No airports/airfields found in rendered features at this location');
    const sources = ['world_low', 'world_mid', 'us_high', 'poi_us', 'world_labels'];
    console.log('Checking source features for airports/airfields...');
    sources.forEach(sourceName => {
      try {
        try {
          const aerodromeFeatures = map.querySourceFeatures(sourceName, {
            sourceLayer: 'aerodrome_label',
            filter: undefined
          });
          if (aerodromeFeatures.length > 0) {
            console.log(`Found ${aerodromeFeatures.length} aerodrome_label features in ${sourceName}:`);
            aerodromeFeatures.slice(0, 3).forEach((f, i) => {
              console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
              console.log(`     All properties:`, f.properties);
            });
          }
        } catch {
          /* source-layer may not exist */
        }

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
          console.log(`Found ${airportPoiFeatures.length} airport/airfield POI features in ${sourceName}:`);
          airportPoiFeatures.slice(0, 3).forEach((f, i) => {
            console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
            console.log(`     Class: ${f.properties?.class || 'N/A'}`);
            console.log(`     Subclass: ${f.properties?.subclass || 'N/A'}`);
            console.log(`     All properties:`, f.properties);
          });
        }
      } catch {
        /* source may not exist */
      }
    });
  }

  console.groupEnd();
}

function logStadiumFeatures(map, e) {
  console.group('Stadium Inspector');
  console.log('Click Location:', e.lngLat);
  console.log('Zoom Level:', map.getZoom().toFixed(2));

  const bbox = [
    [e.point.x - 10, e.point.y - 10],
    [e.point.x + 10, e.point.y + 10]
  ];
  const renderedFeatures = map.queryRenderedFeatures(bbox);

  const stadiumFeatures = renderedFeatures.filter(f =>
    f.layer?.id?.includes('stadium')
  );

  if (stadiumFeatures.length > 0) {
    console.log(`Stadium Analysis (${stadiumFeatures.length} features):`);
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
    console.log('No stadiums found in rendered features at this location');
    const sources = ['world_low', 'world_mid', 'us_high', 'poi_us', 'world_labels'];
    console.log('Checking source features for stadiums...');
    sources.forEach(sourceName => {
      try {
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
          console.log(`Found ${stadiumPoiFeatures.length} stadium POI features in ${sourceName}:`);
          stadiumPoiFeatures.slice(0, 5).forEach((f, i) => {
            console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
            console.log(`     Class: ${f.properties?.class || 'N/A'}`);
            console.log(`     Subclass: ${f.properties?.subclass || 'N/A'}`);
            console.log(`     Has name: ${!!f.properties?.name}`);
            console.log(`     All properties:`, f.properties);
          });
        }

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
            console.log(`Found ${stadiumPlaceFeatures.length} stadium place features in ${sourceName}:`);
            stadiumPlaceFeatures.slice(0, 5).forEach((f, i) => {
              console.log(`  ${i + 1}. ${f.properties?.name || f.properties?.['name:en'] || 'unnamed'}`);
              console.log(`     Place: ${f.properties?.place || 'N/A'}`);
              console.log(`     Has name: ${!!f.properties?.name}`);
              console.log(`     All properties:`, f.properties);
            });
          }
        } catch {
          /* source-layer may not exist */
        }
      } catch {
        /* source may not exist */
      }
    });
  }

  console.groupEnd();
}

// ============================================================================
// MapLibre expression evaluators (for road debug inspector)
// ============================================================================
function evaluateWidthExpression(expr, zoom, roadClass) {
  if (!Array.isArray(expr)) {
    return typeof expr === 'number' ? expr.toFixed(2) + 'px' : String(expr);
  }

  const exprType = expr[0];

  if (exprType === 'interpolate') {
    const stops = expr.slice(3);
    let prevZoom = null, prevValue = null;

    for (let i = 0; i < stops.length; i += 2) {
      const stopZoom = stops[i];
      let stopValue = stops[i + 1];

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
        const t = (zoom - prevZoom) / (stopZoom - prevZoom);
        const interpolated = prevValue + t * (stopValue - prevValue);
        return interpolated.toFixed(2) + 'px';
      }

      prevZoom = stopZoom;
      prevValue = stopValue;
    }

    return prevValue ? prevValue.toFixed(2) + 'px' : 'N/A';
  }

  if (exprType === 'match') {
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

// ============================================================================
// Building diagnostics (exposed on window)
// ============================================================================
function setupBuildingDiagnostics(map) {
  window.checkBuildingProperties = function () {
    console.group('Building Properties Diagnostic');
    const currentZoom = map.getZoom();
    console.log(`Current Zoom: ${currentZoom.toFixed(2)}`);

    const bbox = [
      [map.getCanvas().width / 2 - 50, map.getCanvas().height / 2 - 50],
      [map.getCanvas().width / 2 + 50, map.getCanvas().height / 2 + 50]
    ];

    const renderedFeatures = map.queryRenderedFeatures(bbox, {
      layers: ['building', 'building-us']
    });

    console.log(`Rendered Features: ${renderedFeatures.length}`);
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

    const sourceFeatures = map.querySourceFeatures('us_high', {
      sourceLayer: 'building',
      filter: undefined
    });

    console.log(`Source Features: ${sourceFeatures.length}`);
    if (sourceFeatures.length > 0) {
      const sample = sourceFeatures[0];
      console.log('Sample source feature:', {
        properties: sample.properties,
        hasRenderHeight: 'render_height' in (sample.properties || {}),
        renderHeight: sample.properties?.render_height,
        allKeys: Object.keys(sample.properties || {})
      });

      const withHeight = sourceFeatures.filter(f =>
        f.properties && 'render_height' in f.properties && f.properties.render_height != null
      );
      const withoutHeight = sourceFeatures.length - withHeight.length;

      console.log('Height Data Availability:');
      console.log(`  With render_height: ${withHeight.length} (${(withHeight.length / sourceFeatures.length * 100).toFixed(1)}%)`);
      console.log(`  Without render_height: ${withoutHeight} (${(withoutHeight / sourceFeatures.length * 100).toFixed(1)}%)`);

      if (withHeight.length > 0) {
        const heights = withHeight.map(f => f.properties.render_height).filter(h => h != null);
        console.log(`  Height range: ${Math.min(...heights)}m - ${Math.max(...heights)}m`);
        console.log(`  Average height: ${(heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1)}m`);
      }
    }

    console.groupEnd();
    console.log('Tip: Zoom to different levels (10-15) and run checkBuildingProperties() again to compare');
  };

  window.checkBuildingZoomLevels = async function () {
    console.group('Building Availability Across Zoom Levels');
    const center = map.getCenter();
    const currentZoom = map.getZoom();

    console.log('Checking current location for buildings...');
    const fullViewport = [
      [0, 0],
      [map.getCanvas().width, map.getCanvas().height]
    ];

    const initialCheck = map.queryRenderedFeatures(fullViewport, {
      layers: ['building', 'building-us']
    });
    console.log(`  Current viewport has ${initialCheck.length} rendered buildings`);

    if (initialCheck.length === 0) {
      console.warn('No buildings found in current view. Try navigating to a city area first.');
      console.groupEnd();
      return;
    }

    const testZooms = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const results = [];

    console.log('Testing zoom levels...');

    for (const z of testZooms) {
      map.setZoom(z);
      map.setCenter(center);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const viewport = [
        [0, 0],
        [map.getCanvas().width, map.getCanvas().height]
      ];

      const rendered = map.queryRenderedFeatures(viewport, {
        layers: ['building', 'building-us']
      });

      const source = map.querySourceFeatures('us_high', {
        sourceLayer: 'building',
        filter: undefined
      });

      const withHeight = source.filter(f =>
        f.properties && 'render_height' in f.properties && f.properties.render_height != null
      );

      results.push({
        zoom: z,
        rendered: rendered.length,
        source: source.length,
        withHeight: withHeight.length,
        hasHeightData: withHeight.length > 0 && source.length > 0
          ? (withHeight.length / source.length * 100).toFixed(1) + '%'
          : '0%'
      });
    }

    map.setZoom(currentZoom);
    map.setCenter(center);

    console.table(results);
    console.log('Summary:');
    const firstRendered = results.find(r => r.rendered > 0);
    const firstWithHeight = results.find(r => r.withHeight > 0);
    console.log(`  First zoom with rendered buildings: ${firstRendered ? `z${firstRendered.zoom}` : 'none'}`);
    console.log(`  First zoom with height data: ${firstWithHeight ? `z${firstWithHeight.zoom}` : 'none'}`);

    if (firstRendered && firstWithHeight && firstRendered.zoom !== firstWithHeight.zoom) {
      console.log(`  Default color will show from z${firstRendered.zoom} to z${firstWithHeight.zoom - 1}`);
      console.log(`  Height-based colors will show from z${firstWithHeight.zoom}+`);
    }

    console.groupEnd();
  };
}
