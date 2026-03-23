/**
 * Places data loading and management utilities
 * 
 * Provides functions to load attribute data for places from JSON files
 * and update MapLibre feature states for data-driven styling.
 */

// Use global maplibregl object (loaded via script tag in HTML)
declare const maplibregl: {
  Map: typeof import("maplibre-gl").Map;
};

import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * Attribute data for a single place
 */
export interface PlaceAttributes {
  pop_total?: number;
  median_hh_income?: number;
  [key: string]: any;
}

/**
 * Places attribute data keyed by GEOID
 */
export interface PlacesAttributeData {
  [geoid: string]: PlaceAttributes;
}

/**
 * Cache for loaded attribute data by state
 */
const attributeCache = new Map<string, PlacesAttributeData>();

/**
 * Base URL for attribute data files
 */
const ATTRS_BASE = "https://data.storypath.studio/attrs/places/acs5_2024";

/**
 * Constructs the URL for a state's attribute file
 * 
 * @param statefp - Two-digit state FIPS code (e.g., "01" for Alabama)
 * @returns URL to the attribute file
 */
export function getAttributeFileUrl(statefp: string): string {
  // Ensure statefp is zero-padded to 2 digits
  const paddedStatefp = statefp.padStart(2, "0");
  return `${ATTRS_BASE}/attrs_by_state/attrs_places_acs5_2024_${paddedStatefp}.json`;
}

/**
 * Loads places attribute data for a specific state
 * 
 * @param statefp - Two-digit state FIPS code (e.g., "01" for Alabama)
 * @returns Promise resolving to places attribute data
 * @throws Error if fetch fails or JSON is invalid
 * 
 * @example
 * ```typescript
 * const data = await loadPlacesAttributesByState("01");
 * console.log(data["0100124"]); // Attributes for place GEOID 0100124
 * ```
 */
export async function loadPlacesAttributesByState(statefp: string): Promise<PlacesAttributeData> {
  const paddedStatefp = statefp.padStart(2, "0");
  
  // Check cache first
  if (attributeCache.has(paddedStatefp)) {
    return attributeCache.get(paddedStatefp)!;
  }
  
  // Fetch from server
  const url = getAttributeFileUrl(paddedStatefp);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch places data for state ${paddedStatefp}: ${response.statusText}`);
    }
    
    const data = await response.json() as PlacesAttributeData;
    
    // Cache the result
    attributeCache.set(paddedStatefp, data);
    
    return data;
  } catch (error) {
    console.error(`Error loading places attributes for state ${paddedStatefp}:`, error);
    throw error;
  }
}

/**
 * Loads places attribute data for multiple states
 * 
 * @param statefps - Array of two-digit state FIPS codes
 * @returns Promise resolving to combined places attribute data
 * 
 * @example
 * ```typescript
 * const data = await loadPlacesAttributesByStates(["01", "02", "04"]);
 * ```
 */
export async function loadPlacesAttributesByStates(statefps: string[]): Promise<PlacesAttributeData> {
  const results = await Promise.all(
    statefps.map(statefp => loadPlacesAttributesByState(statefp))
  );
  
  // Merge all results into a single object
  return Object.assign({}, ...results);
}

/**
 * Gets a specific attribute value for a place
 * 
 * @param geoid - 7-digit place GEOID
 * @param attr - Attribute name (e.g., "pop_total", "median_hh_income")
 * @param data - Places attribute data
 * @returns Attribute value or undefined if not found
 * 
 * @example
 * ```typescript
 * const population = getAttributeForPlace("0100124", "pop_total", data);
 * ```
 */
export function getAttributeForPlace(
  geoid: string,
  attr: string,
  data: PlacesAttributeData
): any {
  return data[geoid]?.[attr];
}

/**
 * Updates MapLibre feature states with attribute data
 * 
 * This enables data-driven styling based on attributes like population.
 * Call this after loading attribute data to enhance the map visualization.
 * 
 * @param map - MapLibre Map instance
 * @param data - Places attribute data
 * @param sourceId - Source ID (default: "places-source")
 * @param sourceLayer - Source layer name (default: "places")
 * 
 * @example
 * ```typescript
 * const data = await loadPlacesAttributesByState("01");
 * updateMapFeatureStates(map, data);
 * ```
 */
export function updateMapFeatureStates(
  map: MapLibreMap,
  data: PlacesAttributeData,
  sourceId: string = "places-source",
  sourceLayer: string = "places"
): void {
  // Wait for source to be loaded
  if (!map.getSource(sourceId)) {
    console.warn(`Source ${sourceId} not found. Waiting for map to load...`);
    map.once("load", () => {
      updateMapFeatureStates(map, data, sourceId, sourceLayer);
    });
    return;
  }
  
  // Update feature states for each place
  let count = 0;
  for (const [geoid, attrs] of Object.entries(data)) {
    try {
      map.setFeatureState(
        { source: sourceId, sourceLayer, id: geoid },
        attrs
      );
      count++;
    } catch (error) {
      console.error(`Error setting feature state for GEOID ${geoid}:`, error);
    }
  }
  
  console.log(`Updated feature states for ${count} places`);
}

/**
 * Clears all cached attribute data
 * 
 * Useful for forcing a refresh of data or freeing memory.
 */
export function clearAttributeCache(): void {
  attributeCache.clear();
}

/**
 * Gets the current size of the attribute cache
 * 
 * @returns Number of states in cache
 */
export function getCacheSize(): number {
  return attributeCache.size;
}

/**
 * Checks if attribute data for a state is cached
 * 
 * @param statefp - Two-digit state FIPS code
 * @returns True if data is cached
 */
export function isCached(statefp: string): boolean {
  const paddedStatefp = statefp.padStart(2, "0");
  return attributeCache.has(paddedStatefp);
}

/**
 * US State bounding boxes (approximate) with FIPS codes
 * Format: [minLng, minLat, maxLng, maxLat]
 */
const STATE_BOUNDS: Record<string, [number, number, number, number]> = {
  "01": [-88.5, 30.2, -84.9, 35.0],   // Alabama
  "04": [-114.8, 31.3, -109.0, 37.0], // Arizona
  "05": [-94.6, 33.0, -89.6, 36.5],   // Arkansas
  "06": [-124.5, 32.5, -114.1, 42.0], // California
  "08": [-109.1, 37.0, -102.0, 41.0], // Colorado
  "09": [-73.7, 41.0, -71.8, 42.1],   // Connecticut
  "10": [-75.8, 38.5, -75.0, 39.8],   // Delaware
  "11": [-77.1, 38.8, -76.9, 39.0],   // DC
  "12": [-87.6, 24.5, -80.0, 31.0],   // Florida
  "13": [-85.6, 30.4, -80.8, 35.0],   // Georgia
  "16": [-117.2, 42.0, -111.0, 49.0], // Idaho
  "17": [-91.5, 37.0, -87.5, 42.5],   // Illinois
  "18": [-88.1, 37.8, -84.8, 41.8],   // Indiana
  "19": [-96.6, 40.4, -90.1, 43.5],   // Iowa
  "20": [-102.1, 37.0, -94.6, 40.0],  // Kansas
  "21": [-89.6, 36.5, -81.9, 39.1],   // Kentucky
  "22": [-94.0, 29.0, -88.8, 33.0],   // Louisiana
  "23": [-71.1, 43.1, -66.9, 47.5],   // Maine
  "24": [-79.5, 38.0, -75.0, 39.7],   // Maryland
  "25": [-73.5, 41.2, -69.9, 42.9],   // Massachusetts
  "26": [-90.4, 41.7, -82.4, 48.2],   // Michigan
  "27": [-97.2, 43.5, -89.5, 49.4],   // Minnesota
  "28": [-91.7, 30.2, -88.1, 35.0],   // Mississippi
  "29": [-95.8, 36.0, -89.1, 40.6],   // Missouri
  "30": [-116.1, 44.4, -104.0, 49.0], // Montana
  "31": [-104.1, 40.0, -95.3, 43.0],  // Nebraska
  "32": [-120.0, 35.0, -114.0, 42.0], // Nevada
  "33": [-72.6, 42.7, -70.6, 45.3],   // New Hampshire
  "34": [-75.6, 38.9, -73.9, 41.4],   // New Jersey
  "35": [-109.1, 31.3, -103.0, 37.0], // New Mexico
  "36": [-79.8, 40.5, -71.9, 45.0],   // New York
  "37": [-84.3, 33.8, -75.5, 36.6],   // North Carolina
  "38": [-104.1, 45.9, -96.6, 49.0],  // North Dakota
  "39": [-84.8, 38.4, -80.5, 42.3],   // Ohio
  "40": [-103.0, 33.6, -94.4, 37.0],  // Oklahoma
  "41": [-124.6, 42.0, -116.5, 46.3], // Oregon
  "42": [-80.5, 39.7, -74.7, 42.3],   // Pennsylvania
  "44": [-71.9, 41.1, -71.1, 42.0],   // Rhode Island
  "45": [-83.4, 32.0, -78.5, 35.2],   // South Carolina
  "46": [-104.1, 42.5, -96.4, 45.9],  // South Dakota
  "47": [-90.3, 35.0, -81.6, 36.7],   // Tennessee
  "48": [-106.6, 25.8, -93.5, 36.5],  // Texas
  "49": [-114.1, 37.0, -109.0, 42.0], // Utah
  "50": [-73.4, 42.7, -71.5, 45.0],   // Vermont
  "51": [-83.7, 36.5, -75.2, 39.5],   // Virginia
  "53": [-124.8, 45.5, -116.9, 49.0], // Washington
  "54": [-82.6, 37.2, -77.7, 40.6],   // West Virginia
  "55": [-92.9, 42.5, -86.8, 47.1],   // Wisconsin
  "56": [-111.1, 41.0, -104.0, 45.0], // Wyoming
};

/**
 * Determines which US states are visible in the current map viewport
 * 
 * @param map - MapLibre Map instance
 * @returns Array of state FIPS codes (2-digit strings) that intersect with viewport
 * 
 * @example
 * ```typescript
 * const visibleStates = getVisibleStates(map);
 * console.log(visibleStates); // ["06", "32", "04"] for California, Nevada, Arizona
 * ```
 */
export function getVisibleStates(map: MapLibreMap): string[] {
  try {
    const bounds = map.getBounds();
    const viewBounds: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];
    
    const visibleStates: string[] = [];
    
    // Check each state to see if it intersects with viewport
    for (const [fips, stateBounds] of Object.entries(STATE_BOUNDS)) {
      if (boundsIntersect(viewBounds, stateBounds)) {
        visibleStates.push(fips);
      }
    }
    
    // If no states detected (e.g., zoomed out too far), return common defaults
    if (visibleStates.length === 0) {
      console.warn('No states detected in viewport, using default set');
      // Return most populous states as default
      return ["06", "48", "12", "36", "42", "17", "39", "13", "37", "26"];
    }
    
    return visibleStates;
  } catch (error) {
    console.error('Error detecting visible states:', error);
    // Return common default states on error
    return ["06", "48", "12", "36", "42"];
  }
}

/**
 * Helper function to check if two bounding boxes intersect
 * 
 * @param bbox1 - First bounding box [minLng, minLat, maxLng, maxLat]
 * @param bbox2 - Second bounding box [minLng, minLat, maxLng, maxLat]
 * @returns True if bounding boxes intersect
 */
function boundsIntersect(
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number]
): boolean {
  const [minLng1, minLat1, maxLng1, maxLat1] = bbox1;
  const [minLng2, minLat2, maxLng2, maxLat2] = bbox2;
  
  return !(
    maxLng1 < minLng2 ||
    minLng1 > maxLng2 ||
    maxLat1 < minLat2 ||
    minLat1 > maxLat2
  );
}
