/**
 * Background layers
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";

export function createBackgroundLayers(theme: Theme): LayerSpecification[] {
  return [
    { 
      id: "background", 
      type: "background", 
      paint: { "background-color": theme.colors.background } 
    },
  ];
}
