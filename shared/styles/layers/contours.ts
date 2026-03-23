/**
 * Contour layers (topographic elevation lines)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";

/**
 * Creates contour line layers for major and minor contours
 * 
 * @param theme - Theme object with contours configuration
 * @returns Array of LayerSpecification objects, or empty array if contours are disabled
 */
export function createContourLayers(theme: Theme): LayerSpecification[] {
  // Return empty array if contours are disabled
  if (!theme.contours?.enabled) {
    return [];
  }
  
  const contours = theme.contours;
  const layers: LayerSpecification[] = [];
  
  // Default colors - use subtle colors that work with dark themes
  const defaultMajorColor = "#4a5568";  // Medium gray
  const defaultMinorColor = "#3a4455";  // Darker gray
  
  // Major contours (z6-12) - always create unless explicitly disabled
  const majorColor = contours.major?.color ?? defaultMajorColor;
  const majorWidth = contours.major?.width ?? { min: 0.5, max: 1.5 };
  const majorOpacity = contours.major?.opacity ?? 0.6;
  const majorMinZoom = contours.major?.minZoom ?? contours.minZoom ?? 6;
  const majorMaxZoom = contours.maxZoom ?? 12;
  
  layers.push({
    id: "contour-major",
    type: "line",
    source: "world-contours",
    "source-layer": "major",
    minzoom: majorMinZoom,
    maxzoom: majorMaxZoom + 1,  // Add 1 for fade-out
    paint: {
      "line-color": majorColor,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        majorMinZoom, majorWidth.min,
        8, majorWidth.max * 1.2,  // Increase width at z8 for more detail
        9, majorWidth.max * 1.3,  // Increase width at z9 for more detail
        majorMaxZoom, majorWidth.max
      ],
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        majorMinZoom, majorOpacity,
        8, majorOpacity * 1.2,  // Increase opacity at z8 for more detail
        9, majorOpacity * 1.3,  // Increase opacity at z9 for more detail
        majorMaxZoom, majorOpacity,
        majorMaxZoom + 1, 0.0  // Fade out
      ]
    }
  });
  
  // Minor contours (z8-12) - always create unless explicitly disabled
  const minorColor = contours.minor?.color ?? defaultMinorColor;
  const minorWidth = contours.minor?.width ?? { min: 0.25, max: 0.75 };
  const minorOpacity = contours.minor?.opacity ?? 0.4;
  const minorMinZoom = contours.minor?.minZoom ?? contours.minZoom ?? 8;
  const minorMaxZoom = contours.maxZoom ?? 12;
  
  layers.push({
    id: "contour-minor",
    type: "line",
    source: "world-contours",
    "source-layer": "minor",
    minzoom: minorMinZoom,
    maxzoom: minorMaxZoom + 1,  // Add 1 for fade-out
    paint: {
      "line-color": minorColor,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        minorMinZoom, minorWidth.min,
        8, minorWidth.max * 1.3,  // Increase width at z8 for more detail
        9, minorWidth.max * 1.5,  // Increase width at z9 for more detail
        minorMaxZoom, minorWidth.max
      ],
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        minorMinZoom, minorOpacity,
        8, minorOpacity * 1.5,  // Increase opacity at z8 for more detail
        9, minorOpacity * 1.8,  // Increase opacity at z9 for more detail
        minorMaxZoom, minorOpacity,
        minorMaxZoom + 1, 0.0  // Fade out
      ]
    }
  });
  
  return layers;
}

