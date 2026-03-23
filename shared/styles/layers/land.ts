/**
 * Land layers (landcover, landuse)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";
import { landcoverFillColor, landuseFillColor } from "./expressions.js";

export function createLandcoverLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const o = theme.opacities;
  const landConfig = theme.land;
  const landuseConfig = theme.landuse;
  
  // If transparent is enabled, set opacity to 0 (layers still exist but are invisible)
  const landcoverOpacity = landConfig?.transparent ? 0 : o.landcover;
  const landuseOpacity = landuseConfig?.transparent ? 0 : o.landuse;
  
  const lcFill = landcoverFillColor(c, landConfig);
  const luFill = landuseFillColor(c, landuseConfig);
  
  // Filter out ice class from landcover if ice layers are enabled
  // This prevents duplicate/conflicting ice rendering
  const excludeIceFilter = theme.ice?.enabled 
    ? ["!=", ["get", "class"], "ice"]
    : true; // Show all if ice is disabled
  
  return [
    { 
      id: "landcover-world", 
      type: "fill", 
      source: "world_low", 
      "source-layer": "landcover", 
      minzoom: 0, 
      maxzoom: 6.5,
      filter: excludeIceFilter,
      paint: { 
        "fill-color": lcFill, 
        "fill-opacity": landcoverOpacity,
        // Hide polygon outlines to avoid white line artifacts
        "fill-outline-color": lcFill
      } 
    },
    { 
      id: "landcover-world-mid", 
      type: "fill", 
      source: "world_mid", 
      "source-layer": "landcover", 
      minzoom: 6,
      filter: excludeIceFilter,
      paint: { 
        "fill-color": lcFill, 
        "fill-opacity": landcoverOpacity,
        "fill-outline-color": lcFill
      } 
    },
    { id: "landuse-world", type: "fill", source: "world_low", "source-layer": "landuse", minzoom: 0, maxzoom: 6.5, paint: { "fill-color": luFill, "fill-opacity": landuseOpacity } },
    { id: "landuse-world-mid", type: "fill", source: "world_mid", "source-layer": "landuse", minzoom: 6, paint: { "fill-color": luFill, "fill-opacity": landuseOpacity } },
  ];
}

export function createUSLandLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const o = theme.opacities;
  const landConfig = theme.land;
  const landuseConfig = theme.landuse;
  
  // If transparent is enabled, set opacity to 0 (layers still exist but are invisible)
  const landcoverOpacity = landConfig?.transparent ? 0 : o.landcover;
  const landuseOpacity = landuseConfig?.transparent ? 0 : o.landuse;
  
  const lcFill = landcoverFillColor(c, landConfig);
  const luFill = landuseFillColor(c, landuseConfig);
  
  // Filter out ice class from landcover if ice layers are enabled
  const excludeIceFilter = theme.ice?.enabled 
    ? ["!=", ["get", "class"], "ice"]
    : true;
  
  return [
    { 
      id: "landcover-us", 
      type: "fill", 
      source: "us_high", 
      "source-layer": "landcover", 
      minzoom: 6,
      filter: excludeIceFilter,
      paint: { 
        "fill-color": lcFill, 
        "fill-opacity": landcoverOpacity,
        "fill-outline-color": lcFill
      } 
    },
    { id: "landuse-us", type: "fill", source: "us_high", "source-layer": "landuse", minzoom: 6, paint: { "fill-color": luFill, "fill-opacity": landuseOpacity } },
  ];
}
