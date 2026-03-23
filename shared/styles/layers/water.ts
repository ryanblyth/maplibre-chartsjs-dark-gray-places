/**
 * Water layers (fill and line)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";
import { zoomWidthExpr, waterFillColor, waterwayLineColor } from "./expressions.js";

export function createWaterLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const w = theme.widths.water.line;
  const waterConfig = theme.water;
  
  // If transparent is enabled, set opacity to 0 (layers still exist but are invisible)
  const waterOpacity = waterConfig?.transparent ? 0 : 0.85;
  const waterwayOpacity = waterConfig?.transparentWaterway ? 0 : 1.0;
  
  const waterFill = waterFillColor(c, waterConfig);
  const waterwayLine = waterwayLineColor(c, waterConfig);
  
  return [
    { id: "water-world", type: "fill", source: "world_low", "source-layer": "water", minzoom: 0, maxzoom: 6.5, paint: { "fill-color": waterFill, "fill-opacity": waterOpacity } },
    { id: "water-world-mid", type: "fill", source: "world_mid", "source-layer": "water", minzoom: 6, paint: { "fill-color": waterFill, "fill-opacity": waterOpacity } },
    { id: "waterway-world", type: "line", source: "world_low", "source-layer": "waterway", minzoom: 0, maxzoom: 6.5, paint: { "line-color": waterwayLine, "line-opacity": waterwayOpacity, "line-width": ["interpolate", ["linear"], ["zoom"], 0, w.z0 ?? 0.1, 6, w.z6 ?? 0.4] } },
    { id: "waterway-world-mid", type: "line", source: "world_mid", "source-layer": "waterway", minzoom: 6, paint: { "line-color": waterwayLine, "line-opacity": waterwayOpacity, "line-width": ["interpolate", ["linear"], ["zoom"], 6, w.z6 ?? 0.4, 10, w.z10 ?? 0.8] } },
  ];
}

export function createUSWaterLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const w = theme.widths.water.line;
  const waterConfig = theme.water;
  
  // If transparent is enabled, set opacity to 0 (layers still exist but are invisible)
  const waterOpacity = waterConfig?.transparent ? 0 : 0.85;
  const waterwayOpacity = waterConfig?.transparentWaterway ? 0 : 1.0;
  
  const waterFill = waterFillColor(c, waterConfig);
  const waterwayLine = waterwayLineColor(c, waterConfig);
  
  return [
    { id: "water-us", type: "fill", source: "us_high", "source-layer": "water", minzoom: 6, paint: { "fill-color": waterFill, "fill-opacity": waterOpacity } },
    { id: "waterway-us", type: "line", source: "us_high", "source-layer": "waterway", minzoom: 6, paint: { "line-color": waterwayLine, "line-opacity": waterwayOpacity, "line-width": ["interpolate", ["linear"], ["zoom"], 6, w.z6 ?? 0.2, 12, w.z12 ?? 0.6, 15, w.z15 ?? 1.0] } },
  ];
}
