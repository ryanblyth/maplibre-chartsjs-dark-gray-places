/**
 * Boundary layers (country, state, maritime)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme, ZoomWidths } from "../theme.js";
import { filters, zoomWidthExpr } from "./expressions.js";

/** Helper to create opacity expression from ZoomWidths or number */
function opacityExpr(opacity: ZoomWidths | number): unknown {
  if (typeof opacity === "number") return opacity;
  return zoomWidthExpr(opacity);
}

export function createBoundaryLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const w = theme.widths.boundary;
  const o = theme.opacities.boundary;
  const b = theme.boundary;
  const layers: LayerSpecification[] = [];
  
  // Country boundaries (conditional)
  if (b?.country !== false) {
    layers.push(
    { id: "boundary-country-world", type: "line", source: "world_low", "source-layer": "boundary", minzoom: 0, maxzoom: 6.5, filter: filters.countryBoundary, paint: { "line-color": c.boundary.country, "line-width": ["interpolate", ["linear"], ["zoom"], 0, w.country.z0 ?? 0.4, 6, w.country.z6 ?? 1.2], "line-opacity": opacityExpr(o.country) } },
      { id: "boundary-country-world-mid", type: "line", source: "world_mid", "source-layer": "boundary", minzoom: 6, filter: filters.countryBoundary, paint: { "line-color": c.boundary.country, "line-width": ["interpolate", ["linear"], ["zoom"], 6, w.country.z6 ?? 1.2, 10, w.country.z10 ?? 2.0], "line-opacity": opacityExpr(o.country) } }
    );
  }
  
  // Maritime boundaries (conditional)
  if (b?.maritime !== false) {
    layers.push(
    { id: "boundary-maritime-world", type: "line", source: "world_low", "source-layer": "boundary", minzoom: 0, maxzoom: 6.5, filter: filters.maritimeBoundary, paint: { "line-color": c.boundary.country, "line-width": ["interpolate", ["linear"], ["zoom"], 0, w.country.z0 ?? 0.4, 6, w.country.z6 ?? 1.2], "line-opacity": o.maritime } },
      { id: "boundary-maritime-world-mid", type: "line", source: "world_mid", "source-layer": "boundary", minzoom: 6, filter: filters.maritimeBoundary, paint: { "line-color": c.boundary.country, "line-width": ["interpolate", ["linear"], ["zoom"], 6, w.country.z6 ?? 1.2, 10, w.country.z10 ?? 2.0], "line-opacity": o.maritime } }
    );
  }
  
  // State boundaries (conditional)
  if (b?.state !== false) {
    layers.push(
    { id: "boundary-state-world", type: "line", source: "world_low", "source-layer": "boundary", minzoom: 3, maxzoom: 6.5, filter: filters.stateBoundary, paint: { "line-color": c.boundary.state, "line-width": ["interpolate", ["linear"], ["zoom"], 0, w.state.z0 ?? 0.2, 6, w.state.z6 ?? 0.8], "line-opacity": o.state } },
      { id: "boundary-state-world-mid", type: "line", source: "world_mid", "source-layer": "boundary", minzoom: 6, filter: filters.stateBoundary, paint: { "line-color": c.boundary.state, "line-width": ["interpolate", ["linear"], ["zoom"], 6, w.state.z6 ?? 0.8, 10, w.state.z10 ?? 1.2], "line-opacity": o.state } }
    );
  }
  
  return layers;
}

export function createUSBoundaryLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const w = theme.widths.boundary;
  const o = theme.opacities.boundary;
  const b = theme.boundary;
  const layers: LayerSpecification[] = [];
  
  // Country boundaries (conditional)
  if (b?.country !== false) {
    layers.push(
      { id: "boundary-country-us", type: "line", source: "us_high", "source-layer": "boundary", minzoom: 6, filter: filters.countryBoundary, paint: { "line-color": c.boundary.country, "line-width": ["interpolate", ["linear"], ["zoom"], 6, w.country.z6 ?? 1.2, 10, w.country.z10 ?? 2.0, 15, w.country.z15 ?? 2.5], "line-opacity": typeof o.country === "number" ? o.country : (o.country.z10 ?? 0.8) } }
    );
  }
  
  // Maritime boundaries (conditional)
  if (b?.maritime !== false) {
    layers.push(
      { id: "boundary-maritime-us", type: "line", source: "us_high", "source-layer": "boundary", minzoom: 6, filter: filters.maritimeBoundary, paint: { "line-color": c.boundary.country, "line-width": ["interpolate", ["linear"], ["zoom"], 6, w.country.z6 ?? 1.2, 10, w.country.z10 ?? 2.0, 15, w.country.z15 ?? 2.5], "line-opacity": o.maritime } }
    );
  }
  
  // State boundaries (conditional)
  if (b?.state !== false) {
    layers.push(
      { id: "boundary-state-us", type: "line", source: "us_high", "source-layer": "boundary", minzoom: 6, filter: filters.stateBoundary, paint: { "line-color": c.boundary.state, "line-width": ["interpolate", ["linear"], ["zoom"], 6, w.state.z6 ?? 0.3, 8, w.state.z8 ?? 0.8, 12, w.state.z12 ?? 1.2, 15, w.state.z15 ?? 1.5], "line-opacity": o.state } }
    );
  }
  
  return layers;
}
