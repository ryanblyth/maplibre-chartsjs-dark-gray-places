/**
 * Places map initialization utilities
 * 
 * Provides high-level functions to set up places interactivity on a MapLibre map
 */

// Use global maplibregl object (loaded via script tag in HTML)
declare const maplibregl: {
  Map: typeof import("maplibre-gl").Map;
};

import type { Map as MapLibreMap } from "maplibre-gl";
import { 
  loadPlacesAttributesByStates, 
  updateMapFeatureStates, 
  getVisibleStates,
  type PlacesAttributeData 
} from "./placesData.js";
import { 
  setupPlacesClickHandler, 
  setupPlacesHoverCursor 
} from "./placesPopup.js";
import type { PlacePopupAttributeConfigMap } from "./placesPopup.js";

/**
 * Options for places interactivity initialization
 */
export interface PlacesInteractivityOptions {
  /** Array of state FIPS codes to pre-load (overrides auto-detection) */
  statesToLoad?: string[];
  /** Enable hover cursor styling (default: true) */
  enableHover?: boolean;
  /** Popup offset in pixels (default: 10) */
  popupOffset?: number;
  /** Source ID for places data (default: "places-source") */
  sourceId?: string;
  /** Source layer name (default: "places") */
  sourceLayer?: string;
  /** Layer IDs to make interactive (default: ["places-fill", "places-outline"]) */
  layerIds?: string[];
  /** Callback function called after successful initialization */
  onInitComplete?: (loadedStates: string[], data: PlacesAttributeData) => void;
  /** Callback function called on click (attrs undefined when no census row for this GEOID) */
  onPlaceClick?: (geoid: string, attrs: any, displayName: string) => void;
  /** Optional per-attribute popup config (label override, hide, order) */
  popupAttributeConfig?: PlacePopupAttributeConfigMap;
}

/**
 * Initializes places interactivity on a MapLibre map
 * 
 * This function:
 * 1. Waits for map to load (if not already loaded)
 * 2. Detects visible states or uses provided list
 * 3. Pre-loads attribute data for those states
 * 4. Updates map feature states for data-driven styling
 * 5. Sets up click handlers to show popups
 * 6. Optionally sets up hover cursor styling
 * 
 * @param map - MapLibre Map instance
 * @param options - Configuration options
 * @returns Promise that resolves when initialization is complete
 * 
 * @example
 * ```typescript
 * import { initializePlacesInteractivity } from './shared/utils/placesMapSetup.js';
 * 
 * map.on('load', async () => {
 *   await initializePlacesInteractivity(map, {
 *     enableHover: true,
 *     popupOffset: 10
 *   });
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Pre-load specific states
 * await initializePlacesInteractivity(map, {
 *   statesToLoad: ['06', '36', '48'], // CA, NY, TX
 *   onInitComplete: (states, data) => {
 *     console.log(`Loaded data for ${states.length} states`);
 *   }
 * });
 * ```
 */
export async function initializePlacesInteractivity(
  map: MapLibreMap,
  options: PlacesInteractivityOptions = {}
): Promise<void> {
  const {
    statesToLoad,
    enableHover = true,
    popupOffset = 10,
    sourceId = "places-source",
    sourceLayer = "places",
    layerIds = ["places-fill", "places-outline"],
    onInitComplete,
    onPlaceClick,
    popupAttributeConfig
  } = options;
  
  // Don't wait for map.loaded() - layers are available when style is loaded
  // The handler can work even if map isn't fully loaded, as long as layers exist
  // Only wait for style if it's not loaded (layers need style to exist)
  if (!map.getStyle()) {
    console.log('Waiting for style to load...');
    await new Promise<void>(resolve => {
      map.once('style.load', () => {
        console.log('Style load event fired');
        resolve();
      });
    });
  }
  
  // Check if places source and layers exist
  if (!map.getSource(sourceId)) {
    console.error(`Places source "${sourceId}" not found. Ensure places layer is enabled in theme.`);
    return;
  }
  
  const missingLayers = layerIds.filter(id => !map.getLayer(id));
  if (missingLayers.length > 0) {
    console.warn(`Some places layers not found: ${missingLayers.join(', ')}`);
  }
  
  const existingLayers = layerIds.filter(id => map.getLayer(id));
  console.log(`Places layers found: ${existingLayers.join(', ')}`);
  
  if (existingLayers.length === 0) {
    console.error('No places layers found! Cannot set up click handlers.');
    return;
  }
  
  try {
    console.log('Starting places interactivity initialization...');
    console.log(`Map loaded status: ${map.loaded()}`);
    console.log(`Current zoom: ${map.getZoom().toFixed(2)}`);
    
    // Determine which states to load
    const states = statesToLoad || getVisibleStates(map);
    console.log(`States to load: ${states.length > 0 ? states.join(', ') : 'NONE'}`);
    
    if (states.length === 0) {
      console.warn('⚠️ No states to load for places interactivity - this will prevent handler setup!');
      return;
    }
    
    console.log(`Loading places data for ${states.length} states:`, states.join(', '));
    
    // Pre-load attribute data for all states
    let attributeData: PlacesAttributeData;
    try {
      attributeData = await loadPlacesAttributesByStates(states);
      console.log(`✅ Data loading completed`);
    } catch (loadError) {
      console.error('❌ Failed to load places data:', loadError);
      throw loadError;
    }
    
    const placeCount = Object.keys(attributeData).length;
    console.log(`Loaded attributes for ${placeCount} places`);
    
    if (placeCount === 0) {
      console.warn('⚠️ No places data loaded! Check if state files are accessible. Handler will still be set up but won\'t have data.');
    }
    
    // Update feature states for data-driven styling
    console.log('Updating map feature states...');
    updateMapFeatureStates(map, attributeData, sourceId, sourceLayer);
    
    // Set up click handlers
    const availableLayers = layerIds.filter(id => map.getLayer(id));
    console.log(`Setting up click handlers for layers: ${availableLayers.join(', ')}`);
    
    try {
      setupPlacesClickHandler(map, attributeData, {
        sourceId,
        sourceLayer,
        layerIds: availableLayers,
        popupOffset,
        onClickCallback: onPlaceClick,
        popupAttributeConfig
      });
      console.log('✅ Click handler setup completed');
    } catch (error) {
      console.error('❌ Error setting up click handler:', error);
      throw error;
    }
    
    // Set up hover cursor if enabled
    if (enableHover) {
      console.log('Setting up hover cursor...');
      setupPlacesHoverCursor(map, availableLayers);
    }
    
    console.log('✅ Places interactivity initialized successfully');
    
    // Call completion callback if provided
    if (onInitComplete) {
      onInitComplete(states, attributeData);
    }
  } catch (error) {
    console.error('❌ Error initializing places interactivity:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.stack);
    }
    throw error;
  }
}

/**
 * Loads additional states after initial setup
 * 
 * Useful for loading data as the user pans to new areas
 * 
 * @param map - MapLibre Map instance
 * @param statesToLoad - Array of state FIPS codes to load
 * @param options - Configuration options
 * @returns Promise resolving to the loaded attribute data
 * 
 * @example
 * ```typescript
 * map.on('moveend', async () => {
 *   const newStates = getVisibleStates(map).filter(s => !isCached(s));
 *   if (newStates.length > 0) {
 *     await loadAdditionalStates(map, newStates);
 *   }
 * });
 * ```
 */
export async function loadAdditionalStates(
  map: MapLibreMap,
  statesToLoad: string[],
  options: {
    sourceId?: string;
    sourceLayer?: string;
    updateFeatureStates?: boolean;
  } = {}
): Promise<PlacesAttributeData> {
  const {
    sourceId = "places-source",
    sourceLayer = "places",
    updateFeatureStates = true
  } = options;
  
  if (statesToLoad.length === 0) {
    return {};
  }
  
  console.log(`Loading additional states: ${statesToLoad.join(', ')}`);
  
  try {
    const attributeData = await loadPlacesAttributesByStates(statesToLoad);
    
    if (updateFeatureStates) {
      updateMapFeatureStates(map, attributeData, sourceId, sourceLayer);
    }
    
    console.log(`Loaded ${Object.keys(attributeData).length} additional places`);
    
    return attributeData;
  } catch (error) {
    console.error('Error loading additional states:', error);
    throw error;
  }
}
