/**
 * Ice layers (glaciers, ice sheets, and ice shelves)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";

/**
 * Creates ice fill and line layers for glaciated areas, ice shelves, and ice edges
 * 
 * @param theme - Theme object with ice configuration
 * @returns Array of LayerSpecification objects, or empty array if ice is disabled
 */
export function createIceLayers(theme: Theme): LayerSpecification[] {
  // Return empty array if ice is disabled
  if (!theme.ice?.enabled) {
    return [];
  }
  
  const ice = theme.ice;
  const layers: LayerSpecification[] = [];
  
  // Default colors - use light blue/white tones for ice
  const defaultGlaciatedColor = "#e8f4f8";  // Light blue-white
  const defaultIceShelvesColor = "#d0e8f0";  // Slightly darker blue-white
  const defaultIceEdgeColor = "#a0c8d8";    // Medium blue-gray
  
  // Base opacity settings
  const baseOpacityMin = ice.opacity?.min ?? 0.7;
  const baseOpacityMax = ice.opacity?.max ?? 0.9;
  const iceMinZoom = ice.minZoom ?? 0;
  const iceMaxZoom = ice.maxZoom ?? 6;
  
  // Glaciated areas (glaciers, ice caps) - fill layer
  const glaciatedColor = ice.glaciated?.color ?? defaultGlaciatedColor;
  const glaciatedOpacity = ice.glaciated?.opacity ?? baseOpacityMax;
  
  // Glaciated fill layer (no outline - we'll use a separate line layer)
  layers.push({
    id: "ice-glaciated",
    type: "fill",
    source: "ne-ice",
    "source-layer": "glaciated",
    minzoom: iceMinZoom,
    maxzoom: iceMaxZoom + 1,  // Add 1 for fade-out
    filter: ["all"],
    paint: {
      "fill-color": glaciatedColor,
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        iceMinZoom, glaciatedOpacity * (baseOpacityMin / baseOpacityMax),
        iceMaxZoom, glaciatedOpacity,
        iceMaxZoom + 1, 0.0  // Fade out
      ],
      // Disable antialiasing to prevent rendering artifacts at polygon boundaries
      "fill-antialias": false,
    }
  });
  
  // Glaciated outline layer (invisible - used to prevent default outline rendering)
  layers.push({
    id: "ice-glaciated-outline",
    type: "line",
    source: "ne-ice",
    "source-layer": "glaciated",
    minzoom: iceMinZoom,
    maxzoom: iceMaxZoom + 1,
    paint: {
      "line-color": glaciatedColor,  // Match fill color for seamless look
      "line-width": 0,  // Zero width = invisible (effectively disables outlines)
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        iceMinZoom, glaciatedOpacity * (baseOpacityMin / baseOpacityMax),
        iceMaxZoom, glaciatedOpacity,
        iceMaxZoom + 1, 0.0
      ]
    }
  });
  
  // Ice shelves - fill layer
  const iceShelvesColor = ice.iceShelves?.color ?? defaultIceShelvesColor;
  const iceShelvesOpacity = ice.iceShelves?.opacity ?? baseOpacityMax;
  
  // Ice shelves fill layer (no outline - we'll use a separate line layer)
  layers.push({
    id: "ice-shelves",
    type: "fill",
    source: "ne-ice",
    "source-layer": "ice_shelves",
    minzoom: iceMinZoom,
    maxzoom: iceMaxZoom + 1,  // Add 1 for fade-out
    filter: ["all"],
    paint: {
      "fill-color": iceShelvesColor,
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        iceMinZoom, iceShelvesOpacity * (baseOpacityMin / baseOpacityMax),
        iceMaxZoom, iceShelvesOpacity,
        iceMaxZoom + 1, 0.0  // Fade out
      ],
      // Disable antialiasing to prevent rendering artifacts at polygon boundaries
      "fill-antialias": false,
    }
  });
  
  // Ice shelves outline layer (invisible - used to prevent default outline rendering)
  layers.push({
    id: "ice-shelves-outline",
    type: "line",
    source: "ne-ice",
    "source-layer": "ice_shelves",
    minzoom: iceMinZoom,
    maxzoom: iceMaxZoom + 1,
    paint: {
      "line-color": iceShelvesColor,  // Match fill color for seamless look
      "line-width": 0,  // Zero width = invisible (effectively disables outlines)
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        iceMinZoom, iceShelvesOpacity * (baseOpacityMin / baseOpacityMax),
        iceMaxZoom, iceShelvesOpacity,
        iceMaxZoom + 1, 0.0
      ]
    }
  });
  
  // Ice edge (outline) - line layer
  // Only create if iceEdge is not explicitly disabled
  // Set iceEdge to null or iceEdge.enabled to false to disable
  if (ice.iceEdge !== null && ice.iceEdge?.enabled !== false) {
    const iceEdgeColor = ice.iceEdge?.color ?? defaultIceEdgeColor;
    const iceEdgeWidth = ice.iceEdge?.width ?? 0.5;
    const iceEdgeOpacity = ice.iceEdge?.opacity ?? 0.6;
    
    layers.push({
      id: "ice-edge",
      type: "line",
      source: "ne-ice",
      "source-layer": "ice_edge",
      minzoom: iceMinZoom,
      maxzoom: iceMaxZoom + 1,  // Add 1 for fade-out
      filter: ["all"],
      paint: {
        "line-color": iceEdgeColor,
        "line-width": iceEdgeWidth,
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          iceMinZoom, iceEdgeOpacity * (baseOpacityMin / baseOpacityMax),
          iceMaxZoom, iceEdgeOpacity,
          iceMaxZoom + 1, 0.0  // Fade out
        ]
      }
    });
  } else {
    // Even when disabled, create a hidden layer to prevent any default rendering
    // This ensures ice_edge source layer features don't accidentally render
    layers.push({
      id: "ice-edge-hidden",
      type: "line",
      source: "ne-ice",
      "source-layer": "ice_edge",
      minzoom: iceMinZoom,
      maxzoom: iceMaxZoom + 1,
      paint: {
        "line-opacity": 0,  // Completely invisible
        "line-width": 0
      }
    });
  }
  
  return layers;
}

