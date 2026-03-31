/**
 * Places popup utilities
 * 
 * Provides functions to format and display popups showing place attribute data
 */

// Use global maplibregl object (loaded via script tag in HTML)
// Types are declared below for TypeScript compilation
declare const maplibregl: {
  Popup: typeof import("maplibre-gl").Popup;
  Map: typeof import("maplibre-gl").Map;
};

import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { PlaceAttributes, PlacesAttributeData } from "./placesData.js";
import { getAttributesRowForGeoidFromCache } from "./placesData.js";

/**
 * Configuration for a single popup attribute
 */
export interface PlacePopupAttributeConfig {
  /** Override label to display */
  label?: string;
  /** Hide this attribute from the popup */
  hidden?: boolean;
  /** Order weight (lower renders first). Falls back to default priority when unset */
  order?: number;
}

/** Mapping of attribute keys to popup configs */
export type PlacePopupAttributeConfigMap = Record<string, PlacePopupAttributeConfig>;

/**
 * Template attribute configuration reflecting current popup fields.
 * Consumers can spread/override this when initializing interactivity.
 */
export const defaultPlacePopupAttributeConfig: PlacePopupAttributeConfigMap = {
  pop_total: { label: "Pop Total", order: 1 },
  pop_density_sqmi: { label: "Pop Density Sq Mile", order: 2 },
  median_hh_income: { label: "Median Hh Income", order: 3 },
  median_age: { label: "Median Age", order: 4 },
  avg_household_size: { label: "Avg Household Size", order: 5 },
  households: { label: "Households", order: 6 },
  housing_units: { label: "Housing Units", order: 7 },
  mean_commute_min: { label: "Mean Commute Min", order: 8 },
  median_gross_rent: { label: "Median Gross Rent", order: 9 },
  median_home_value: { label: "Median Home Value", order: 10 },
  median_owner_cost_mortgage: { label: "Median Owner Cost Mortgage", order: 11 },
  pct_bach_plus: { label: "% Bachelor's or Higher", order: 12 },
  pct_carpool: { label: "% Carpool", order: 13, hidden: true },
  pct_drive_alone: { label: "% Drive Alone", order: 14 },
  pct_hispanic: { label: "% Hispanic", order: 15 },
  pct_hs_grad: { label: "% High School Graduate", order: 16 },
  pct_in_labor_force: { label: "% In Labor Force", order: 17 },
  pct_insured: { label: "% Insured", order: 18 },
  pct_no_vehicle: { label: "% No Vehicle", order: 19 },
  pct_nonhisp_asian: { label: "% Asian", order: 20 },
  pct_nonhisp_black: { label: "% Black", order: 21 },
  pct_nonhisp_white: { label: "% Non-Hispanic White", order: 22 },
  pct_over65: { label: "% Over 65", order: 23 },
  pct_owner_occ: { label: "% Owner Occupied", order: 24 },
  pct_poverty: { label: "% Poverty", order: 25 },
  pct_transit: { label: "% Transit", order: 26 },
  pct_under18: { label: "% Under 18", order: 27 },
  pct_vacant: { label: "% Vacant", order: 28 },
  pct_wfh: { label: "% Work From Home", order: 29 },
  per_capita_income: { label: "Per Capita Income", order: 30 },
  unemployment_rate: { label: "Unemployment Rate", order: 31 },
};

function getAttributeConfig(
  key: string,
  config?: PlacePopupAttributeConfigMap
): PlacePopupAttributeConfig | undefined {
  if (!config) return undefined;
  const lower = key.toLowerCase();
  // Support exact and lowercase matches to be forgiving
  return config[key] ?? config[lower];
}

/**
 * Formats an attribute key from snake_case to Title Case
 * 
 * @param key - Attribute key (e.g., "pop_total", "median_hh_income")
 * @returns Formatted label (e.g., "Pop Total", "Median HH Income")
 */
export function formatAttributeKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Human-readable place label from a map feature (matches popup title fallback order).
 */
export function getFeatureDisplayName(feature: {
  properties?: Record<string, unknown>;
  id?: unknown;
}): string {
  const geoid = String(feature.id || feature.properties?.GEOID || "");
  const name =
    feature.properties?.NAME ??
    feature.properties?.name ??
    feature.properties?.NAMELSAD ??
    feature.properties?.namelsad;
  return typeof name === "string" && name ? name : `Place ${geoid}`;
}

/**
 * Formats an attribute value for display
 * 
 * @param key - Attribute key (for context-aware formatting)
 * @param value - Attribute value
 * @returns Formatted value string
 */
export function formatAttributeValue(key: string, value: any): string {
  if (value === null || value === undefined) {
    return '<em>N/A</em>';
  }
  
  // Handle different value types
  if (typeof value === 'number') {
    // Check if it's a currency field
    if (key.includes('income') || key.includes('earnings') || key.includes('wage') || 
        key.includes('rent') || key.includes('value') || key.includes('cost')) {
      return `$${value.toLocaleString()}`;
    }
    
    // Check if it's a percentage field
    if (key.includes('pct') || key.includes('percent') || key.includes('rate')) {
      return `${value.toFixed(2)}%`;
    }
    
    // Check if it's a density field (population density)
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('density') || lowerKey === 'pop_density' || lowerKey === 'population_density' || lowerKey === 'pop_density_sqmi') {
      // Format density as rounded integer (no decimal places, no units)
      return Math.round(value).toLocaleString();
    }
    
    // Default number formatting with commas
    return value.toLocaleString();
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // String or other types
  return String(value);
}

/**
 * Formats popup HTML content with all attributes
 * 
 * @param geoid - Place GEOID
 * @param attrs - Place attributes
 * @param featureProps - Feature properties from PMTiles (may contain name)
 * @param attributeConfig - Optional per-attribute popup configuration
 * @returns HTML string for popup content
 */
export function formatPopupHTML(
  geoid: string,
  attrs: PlaceAttributes,
  featureProps?: Record<string, any>,
  attributeConfig?: PlacePopupAttributeConfigMap
): string {
  // Debug: log what we're looking for
  if (featureProps) {
    console.log('Feature properties keys:', Object.keys(featureProps));
    console.log('Looking for name in:', {
      NAME: featureProps.NAME,
      name: featureProps.name,
      NAMELSAD: featureProps.NAMELSAD,
      namelsad: featureProps.namelsad,
      allKeys: Object.keys(featureProps)
    });
  }
  
  // Try to get place name from feature properties first, then attributes
  // Check all possible name field variations
  const name = featureProps?.NAME || 
               featureProps?.name || 
               featureProps?.NAMELSAD || 
               featureProps?.namelsad ||
               featureProps?.NAME20 ||
               featureProps?.name20 ||
               attrs.name || 
               attrs.NAME || 
               attrs.namelsad || 
               attrs.NAMELSAD || 
               'Unknown Place';
  
  // Try to get state name from feature properties or attributes
  const stateName = featureProps?.STATE_NAME || 
                    featureProps?.state_name ||
                    featureProps?.STATE ||
                    featureProps?.state ||
                    attrs.state_name || 
                    attrs.STATE_NAME || '';
  
  const title = stateName ? `${name}, ${stateName}` : name;
  
  // Build attributes list
  const attrEntries = Object.entries(attrs)
    .filter(([key]) => {
      const cfg = getAttributeConfig(key, attributeConfig);
      if (cfg?.hidden) {
        return false;
      }
      // Filter out name/metadata fields that we've already displayed
      const lowerKey = key.toLowerCase();
      return !lowerKey.includes('name') && 
             !lowerKey.includes('geoid') &&
             key !== 'id';
    })
    .sort((a, b) => {
      const aKey = a[0].toLowerCase();
      const bKey = b[0].toLowerCase();
      
      const aCfg = getAttributeConfig(a[0], attributeConfig);
      const bCfg = getAttributeConfig(b[0], attributeConfig);
      if (aCfg?.order !== undefined || bCfg?.order !== undefined) {
        const aOrder = aCfg?.order ?? Number.POSITIVE_INFINITY;
        const bOrder = bCfg?.order ?? Number.POSITIVE_INFINITY;
        if (aOrder !== bOrder) return aOrder - bOrder;
      }

      // Check if a field is a density field (including pop_density_sqmi)
      const isDensity = (key: string) => {
        return key === 'pop_density' || 
               key === 'population_density' || 
               key === 'density' ||
               key === 'pop_density_sqmi' ||
               key.includes('density');
      };
      
      // Explicit ordering: pop_total first, then density fields, then others
      const isPopTotal = aKey === 'pop_total' || aKey === 'population';
      const isBDensity = isDensity(bKey);
      const isADensity = isDensity(aKey);
      const isBPopTotal = bKey === 'pop_total' || bKey === 'population';
      
      // If one is pop_total and the other is density, ensure pop_total comes first
      if (isPopTotal && isBDensity) return -1;
      if (isBPopTotal && isADensity) return 1;
      
      // If both are density fields, sort alphabetically
      if (isADensity && isBDensity) return a[0].localeCompare(b[0]);
      
      // Sort with important fields first
      const priority: Record<string, number> = {
        'pop_total': 1,
        'population': 1,
        'pop_density': 2,
        'population_density': 2,
        'pop_density_sqmi': 2,
        'density': 2,
        'median_hh_income': 3,
        'median_age': 4,
      };
      const aPriority = priority[aKey] || (isADensity ? 2 : 99);
      const bPriority = priority[bKey] || (isBDensity ? 2 : 99);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a[0].localeCompare(b[0]);
    });
  
  const attrsHTML = attrEntries
    .map(([key, value]) => {
      const label = getAttributeConfig(key, attributeConfig)?.label ?? formatAttributeKey(key);
      const formattedValue = formatAttributeValue(key, value);
      return `
        <span class="places-popup-key">${label}:</span>
        <span class="places-popup-value">${formattedValue}</span>
      `;
    })
    .join('');
  
  return `
    <div class="places-popup">
      <div class="places-popup-title">${title}</div>
      ${attrsHTML ? `<div class="places-popup-attrs">${attrsHTML}</div>` : '<div class="places-popup-no-data">No additional data available</div>'}
      <div class="places-popup-geoid">GEOID: ${geoid}</div>
    </div>
  `;
}

/**
 * Creates and displays a MapLibre popup for a place
 * 
 * @param map - MapLibre Map instance
 * @param feature - Clicked map feature
 * @param attrs - Place attributes
 * @param lngLat - Click location [longitude, latitude]
 * @param offset - Popup offset in pixels (default: 10)
 * @param attributeConfig - Optional per-attribute popup configuration
 * @returns MapLibre Popup instance
 */
export function createPlacesPopup(
  map: MapLibreMap,
  feature: MapGeoJSONFeature,
  attrs: PlaceAttributes,
  lngLat: [number, number],
  offset: number = 10,
  attributeConfig?: PlacePopupAttributeConfigMap
): maplibregl.Popup {
  const geoid = String(feature.id || feature.properties?.GEOID || 'unknown');
  const html = formatPopupHTML(geoid, attrs, feature.properties, attributeConfig);
  
  const popup = new maplibregl.Popup({
    offset,
    closeButton: true,
    closeOnClick: true,
    maxWidth: '400px',
  })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);
  
  return popup;
}

/**
 * Sets up click handler for places layers
 * 
 * @param map - MapLibre Map instance
 * @param attributeData - Places attribute data cache
 * @param options - Configuration options
 */
export function setupPlacesClickHandler(
  map: MapLibreMap,
  attributeData: PlacesAttributeData,
  options: {
    sourceId?: string;
    sourceLayer?: string;
    layerIds?: string[];
    popupOffset?: number;
    onClickCallback?: (geoid: string, attrs: PlaceAttributes | undefined, displayName: string) => void;
    popupAttributeConfig?: PlacePopupAttributeConfigMap;
  } = {}
): void {
  console.log('🚀 setupPlacesClickHandler CALLED');
  console.log(`   Current zoom: ${map.getZoom().toFixed(2)}`);
  console.log(`   Map loaded: ${map.loaded()}`);
  console.log(`   Attribute data entries: ${Object.keys(attributeData).length}`);
  
  const {
    sourceId = "places-source",
    sourceLayer = "places",
    layerIds = ["places-fill", "places-outline"],
    popupOffset = 10,
    onClickCallback,
    popupAttributeConfig
  } = options;
  
  // Global click handler that works at all zoom levels by querying source features
  // Use 'idle' event to ensure it's registered after other handlers, giving it priority
  console.log('Setting up global places click handler (works at all zoom levels)');
  
  // Register with a unique handler ID so we can control order
  const placesClickHandler = (e: any) => {
    const currentZoom = map.getZoom();
    console.log(`🔵 Places global click handler fired at zoom ${currentZoom.toFixed(2)}`);
    
    // Check if places source exists
    if (!map.getSource(sourceId)) {
      console.log(`Places source ${sourceId} not found, skipping`);
      return;
    }
    
    // CRITICAL: PMTiles source has maxzoom: 12, so querySourceFeatures only works at zoom 13+
    // But features ARE rendered at zoom 5+, so we MUST use queryRenderedFeatures
    let featureFound = false;
    
    // Use a very large bounding box at lower zooms (features are tiny)
    // At zoom 5: 300px, zoom 8: 150px, zoom 10: 75px, zoom 13: 30px
    const bboxSize = Math.max(20, Math.min(300, 300 / Math.pow(1.8, currentZoom - 5)));
    console.log(`🔍 Checking rendered features with ${bboxSize.toFixed(1)}px bbox at zoom ${currentZoom.toFixed(2)}`);
    
    // Query all places layers at once with large bounding box
    const availableLayers = layerIds.filter(id => map.getLayer(id));
    if (availableLayers.length === 0) {
      console.log('❌ No places layers available');
      return;
    }
    
    const bbox: [[number, number], [number, number]] = [
      [e.point.x - bboxSize, e.point.y - bboxSize],
      [e.point.x + bboxSize, e.point.y + bboxSize]
    ];
    
    const allPlacesFeatures = map.queryRenderedFeatures(bbox, { 
      layers: availableLayers
    });
    
    console.log(`Found ${allPlacesFeatures.length} rendered features in ${bboxSize.toFixed(1)}px bbox`);
    
    if (allPlacesFeatures.length > 0) {
      console.log(`✅ Using rendered feature: ${allPlacesFeatures[0].properties?.NAME || allPlacesFeatures[0].id}`);
      featureFound = true;
      handlePlaceClick(e, allPlacesFeatures[0], attributeData, popupOffset, onClickCallback, sourceId, sourceLayer);
      e.originalEvent?.stopPropagation?.();
      e.originalEvent?.stopImmediatePropagation?.();
    } else {
      console.log(`❌ No rendered features in ${bboxSize.toFixed(1)}px bbox - trying larger area...`);
      
      // Try even larger box (full viewport area around click)
      const largerBbox: [[number, number], [number, number]] = [
        [e.point.x - 500, e.point.y - 500],
        [e.point.x + 500, e.point.y + 500]
      ];
      const largeFeatures = map.queryRenderedFeatures(largerBbox, { layers: availableLayers });
      if (largeFeatures.length > 0) {
        console.log(`✅ Found ${largeFeatures.length} features in larger 500px bbox`);
        // Find closest to click point
        let closest = largeFeatures[0];
        let minDist = Infinity;
        largeFeatures.forEach(f => {
          // Simple distance check using feature center if available
          const dist = Math.abs(f.layer?.id?.length || 0); // Placeholder - would need actual distance calc
          if (dist < minDist) {
            minDist = dist;
            closest = f;
          }
        });
        featureFound = true;
        handlePlaceClick(e, closest, attributeData, popupOffset, onClickCallback, sourceId, sourceLayer);
        e.originalEvent?.stopPropagation?.();
        e.originalEvent?.stopImmediatePropagation?.();
      }
    }
    
    // Fallback: Try source feature query (only works at zoom 13+ due to PMTiles maxzoom: 12)
    // But we should have found rendered features above, so this is just a safety net
    if (!featureFound && currentZoom >= 13) {
      console.log(`🔍 Fallback: Querying source features at zoom ${currentZoom.toFixed(2)} (maxzoom: 12 means features available at z13+)...`);
      try {
        const sourceFeatures = map.querySourceFeatures(sourceId, {
          sourceLayer: sourceLayer,
          filter: undefined
        });
        
        if (sourceFeatures.length > 0) {
          console.log(`Found ${sourceFeatures.length} source features, finding closest...`);
          const clickLngLat = e.lngLat;
          let closestFeature = sourceFeatures[0];
          let minDistance = Infinity;
          
          const maxCheck = Math.min(100, sourceFeatures.length);
          for (let i = 0; i < maxCheck; i++) {
            const f = sourceFeatures[i];
            if (f.geometry?.type === 'Polygon' && f.geometry.coordinates) {
              const coords = f.geometry.coordinates[0];
              const sampleSize = Math.min(5, coords.length);
              for (let j = 0; j < sampleSize; j++) {
                const coord = coords[j];
                const [lng, lat] = coord;
                const distance = Math.sqrt(
                  Math.pow(lng - clickLngLat.lng, 2) + 
                  Math.pow(lat - clickLngLat.lat, 2)
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  closestFeature = f;
                }
              }
            }
          }
          
          if (minDistance < 0.1) {
            console.log(`✅ Using closest source feature (distance: ${minDistance.toFixed(4)})`);
            handlePlaceClick(e, closestFeature as any, attributeData, popupOffset, onClickCallback, sourceId, sourceLayer);
            e.originalEvent?.stopPropagation?.();
            e.originalEvent?.stopImmediatePropagation?.();
          }
        }
      } catch (err) {
        console.error('Error in source feature fallback:', err);
      }
    } else if (!featureFound) {
      console.log(`⚠️ No features found. Source maxzoom is 12, so source queries only work at z13+. Rendered features should work at z5+ but none found.`);
    }
  };
  
  // Register the handler immediately - don't wait for events
  console.log('Registering places global click handler (HIGH PRIORITY)...');
  
  // Register immediately - this function is called during initialization when map is ready
  map.on('click', placesClickHandler);
  console.log('✅ Places click handler registered immediately');
  
  // Helper function to handle the click
  function handlePlaceClick(
    e: any,
    feature: any,
    attributeData: PlacesAttributeData,
    popupOffset: number,
    onClickCallback?: (geoid: string, attrs: PlaceAttributes | undefined, displayName: string) => void,
    sourceId?: string,
    sourceLayer?: string
  ) {
    const geoid = String(feature.id || feature.properties?.GEOID);
    
    if (!geoid || geoid === 'undefined') {
      console.warn('No GEOID found for clicked feature');
      return;
    }

    const displayName = getFeatureDisplayName(feature);
    
    const attrs =
      attributeData[geoid] ?? getAttributesRowForGeoidFromCache(geoid);

    if (!attrs) {
      // Show "no data" popup
      new maplibregl.Popup({
        offset: popupOffset,
        closeButton: true,
        closeOnClick: true,
      })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="places-popup">
            <div class="places-popup-title">${displayName}</div>
            <div class="places-popup-no-data">No attribute data available for this place.</div>
            <div class="places-popup-geoid">GEOID: ${geoid}</div>
          </div>
        `)
        .addTo(map);
      if (onClickCallback) {
        onClickCallback(geoid, undefined, displayName);
      }
      return;
    }
    
    // Create and show popup
    createPlacesPopup(map, feature, attrs, [e.lngLat.lng, e.lngLat.lat], popupOffset, popupAttributeConfig);
    
    // Call optional callback
    if (onClickCallback) {
      onClickCallback(geoid, attrs, displayName);
    }
  }
  
}

/**
 * Sets up hover cursor styling for places layers
 * 
 * @param map - MapLibre Map instance
 * @param layerIds - Layer IDs to add hover cursor to
 */
export function setupPlacesHoverCursor(
  map: MapLibreMap,
  layerIds: string[] = ["places-fill", "places-outline"]
): void {
  layerIds.forEach(layerId => {
    if (!map.getLayer(layerId)) {
      console.warn(`Layer ${layerId} not found, skipping hover cursor`);
      return;
    }
    
    // Change cursor to pointer on hover
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    
    // Reset cursor when leaving
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });
}
