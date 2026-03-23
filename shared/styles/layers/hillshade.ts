/**
 * Hillshade layers (terrain shading from elevation data)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";

/**
 * Creates hillshade layer for terrain visualization
 * 
 * @param theme - Theme object with hillshade configuration
 * @returns Array of LayerSpecification objects, or empty array if hillshade is disabled
 */
export function createHillshadeLayers(theme: Theme): LayerSpecification[] {
  // Return empty array if hillshade is disabled
  if (!theme.hillshade?.enabled) {
    return [];
  }
  
  const hillshade = theme.hillshade;
  
  // Hillshade layers don't support opacity as a paint property
  // Instead, we control the effect through:
  // 1. Exaggeration (lower = more subtle, can be used to simulate opacity)
  // 2. Zoom-based exaggeration for fade-out effect
  
  const baseExaggeration = hillshade.exaggeration ?? 0.5;
  const opacity = hillshade.opacity ?? 0.5;
  
  // Adjust exaggeration based on opacity (lower opacity = lower exaggeration)
  // This simulates opacity by reducing the intensity of the hillshade effect
  const effectiveExaggeration = baseExaggeration * opacity;
  
  // For fade-out at maxZoom, use zoom-based exaggeration
  let exaggerationExpr: unknown;
  if (hillshade.maxZoom !== undefined) {
    exaggerationExpr = [
      "interpolate",
      ["linear"],
      ["zoom"],
      hillshade.minZoom ?? 0, effectiveExaggeration,
      hillshade.maxZoom, effectiveExaggeration,
      hillshade.maxZoom + 1, 0.0,  // Fade out by reducing exaggeration to 0
    ];
  } else {
    exaggerationExpr = effectiveExaggeration;
  }
  
  const layer: LayerSpecification = {
    id: "hillshade",
    type: "hillshade",
    source: "world-hillshade",
    minzoom: hillshade.minZoom ?? 0,
    maxzoom: hillshade.maxZoom ? hillshade.maxZoom + 1 : undefined,
    paint: {
      "hillshade-illumination-direction": hillshade.illuminationDirection ?? 335,
      "hillshade-illumination-anchor": hillshade.illuminationAnchor ?? "viewport",
      "hillshade-exaggeration": exaggerationExpr,
      "hillshade-shadow-color": hillshade.shadowColor ?? "#000000",
      "hillshade-highlight-color": hillshade.highlightColor ?? "#ffffff",
      "hillshade-accent-color": hillshade.accentColor ?? "#000000",
    },
  };
  
  return [layer];
}

