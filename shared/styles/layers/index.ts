/**
 * Shared layer factory functions
 * 
 * All layer creation functions accept a Theme object and return LayerSpecification arrays.
 * This allows any basemap to use the same layer structure with different colors/styles.
 */

import type { LayerSpecification, SourceSpecification, StyleSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";
import type { BaseStyleConfig } from "../baseStyle.js";

// Re-export layer creators
export { createBasemapSources } from "./sources.js";
export { createBackgroundLayers } from "./background.js";
export { createLandcoverLayers, createUSLandLayers } from "./land.js";
export { createWaterLayers, createUSWaterLayers } from "./water.js";
export { createBathymetryLayers } from "./bathymetry.js";
export { createIceLayers } from "./ice.js";
export { createContourLayers } from "./contours.js";
export { createGridLayers } from "./grid.js";
export { createHillshadeLayers } from "./hillshade.js";
export { createAerowayLayers } from "./aeroway.js";
export { createBoundaryLayers, createUSBoundaryLayers } from "./boundaries.js";
export { createPlacesLayers } from "./places.js";
export { createWorldRoadLayers, createUSRoadLayers, createUSOverlayRoadLayers } from "./roads.js";
export { 
  createRoadLabelLayers,
  createHighwayShieldLayers,
  createWaterLabelLayersFromWorldLabels, 
  createWaterLabelLayersFromBasemapSources, 
  createWaterwayLabelLayers,
  createPlaceLabelLayers,
  createPOILayers
} from "./labels/index.js";

// Re-export expressions for custom layer builders
export * from "./expressions.js";

// Import for createAllLayers
import { createBasemapSources } from "./sources.js";
import { createBackgroundLayers } from "./background.js";
import { createLandcoverLayers, createUSLandLayers } from "./land.js";
import { createWaterLayers, createUSWaterLayers } from "./water.js";
import { createBathymetryLayers } from "./bathymetry.js";
import { createIceLayers } from "./ice.js";
import { createContourLayers } from "./contours.js";
import { createGridLayers } from "./grid.js";
import { createHillshadeLayers } from "./hillshade.js";
import { createAerowayLayers } from "./aeroway.js";
import { createBoundaryLayers, createUSBoundaryLayers } from "./boundaries.js";
import { createPlacesLayers } from "./places.js";
import { createWorldRoadLayers, createUSRoadLayers, createUSOverlayRoadLayers } from "./roads.js";
import { 
  createRoadLabelLayers,
  createHighwayShieldLayers,
  createWaterLabelLayersFromWorldLabels, 
  createWaterLabelLayersFromBasemapSources, 
  createWaterwayLabelLayers,
  createPlaceLabelLayers,
  createPOILayers
} from "./labels/index.js";
import { createBaseStyle } from "../baseStyle.js";

/**
 * Creates all layers for a basemap in the correct order
 * 
 * @param theme - Theme object with colors, widths, opacities, and fonts
 * @returns Array of LayerSpecification objects
 */
export function createAllLayers(theme: Theme): LayerSpecification[] {
  // If hideOverWater is enabled, render boundaries before water so water covers them
  // Otherwise, render boundaries after water so they're visible on top
  const hideOverWater = theme.boundary?.hideOverWater === true;
  
  return [
    ...createBackgroundLayers(theme),
    ...createHillshadeLayers(theme),  // Hillshade renders first (under everything)
    ...createLandcoverLayers(theme),
    // Render boundaries before water if hideOverWater is enabled
    ...(hideOverWater ? createBoundaryLayers(theme) : []),
    ...(hideOverWater ? createUSBoundaryLayers(theme) : []),
    ...createWaterLayers(theme),
    ...createUSWaterLayers(theme),
    ...createBathymetryLayers(theme),
    ...createContourLayers(theme),
    // Render boundaries after water if hideOverWater is disabled
    ...(hideOverWater ? [] : createBoundaryLayers(theme)),
    ...createIceLayers(theme),  // Render ice after boundaries so boundaries don't show through
    ...createGridLayers(theme),  // Grid lines render on top of all features
    ...createWorldRoadLayers(theme),
    ...createUSRoadLayers(theme),
    ...createUSLandLayers(theme),
    ...(hideOverWater ? [] : createUSBoundaryLayers(theme)),
    ...createUSOverlayRoadLayers(theme),
    ...createAerowayLayers(theme),  // Aeroway features (runways, aprons, taxiways, helipads)
    ...createRoadLabelLayers(theme),
    ...createHighwayShieldLayers(theme),
    ...createWaterLabelLayersFromWorldLabels(theme),
    ...createWaterLabelLayersFromBasemapSources(theme),
    ...createWaterwayLabelLayers(theme),
    // Render places before labels if renderAboveLabels is false
    ...(theme.places?.renderAboveLabels === false ? createPlacesLayers(theme) : []),
    ...createPlaceLabelLayers(theme),
    ...createPOILayers(theme),
    // Render places after labels if renderAboveLabels is true (or undefined, default behavior)
    ...(theme.places?.renderAboveLabels !== false ? createPlacesLayers(theme) : []),
  ];
}

/**
 * Creates a complete basemap style from a theme
 * 
 * @param theme - Theme object with colors, widths, opacities, and fonts
 * @param config - Optional configuration for URLs
 * @returns Complete StyleSpecification
 */
export function createBasemapStyle(theme: Theme, config: BaseStyleConfig): StyleSpecification {
  const base = createBaseStyle(config);
  const sources = createBasemapSources(config, theme);  // Pass theme to conditionally include bathymetry source
  const layers = createAllLayers(theme);
  
  return {
    ...base,
    name: theme.name,
    sources: {
      ...base.sources,
      ...sources,
    },
    layers,
  };
}
