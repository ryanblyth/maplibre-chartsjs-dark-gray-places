/**
 * Aeroway layers (airports, runways, aprons, taxiways, helipads)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";
import { createTextField } from "../baseStyle.js";

/**
 * Creates aeroway layers for airport features
 * 
 * Zoom level breakdown:
 * - z6-7: Only major runways (length ≥ 2500 m) as thin lines
 * - z8-9: More runways; aprons as thin fill; labels for major airports
 * - z10-12: Taxiways + aprons for regionals
 * - z13+: Helipads, all aprons, detailed labeling
 * 
 * @param theme - Theme object with aeroway configuration
 * @returns Array of LayerSpecification objects, or empty array if aeroway is disabled
 */
export function createAerowayLayers(theme: Theme): LayerSpecification[] {
  // Return empty array if aeroway is disabled
  if (!theme.aeroway?.enabled) {
    return [];
  }
  
  const aeroway = theme.aeroway;
  const layers: LayerSpecification[] = [];
  
  // Default styling values
  const runwayColor = aeroway.runway?.color ?? "#4a5568";
  const runwayWidth = aeroway.runway?.width ?? 0.5;
  const runwayOpacity = aeroway.runway?.opacity ?? 0.8;
  const majorRunwayLength = aeroway.runway?.majorLength ?? 2500;
  
  const apronFillColor = aeroway.apron?.fillColor ?? "#3a4455";
  const apronFillOpacity = aeroway.apron?.fillOpacity ?? 0.3;
  const apronOutlineColor = aeroway.apron?.outlineColor ?? "#4a5568";
  const apronOutlineWidth = aeroway.apron?.outlineWidth ?? 0.3;
  
  const taxiwayColor = aeroway.taxiway?.color ?? "#5a6578";
  const taxiwayWidth = aeroway.taxiway?.width ?? 0.4;
  const taxiwayOpacity = aeroway.taxiway?.opacity ?? 0.7;
  
  const helipadFillColor = aeroway.helipad?.fillColor ?? "#5a6578";
  const helipadFillOpacity = aeroway.helipad?.fillOpacity ?? 0.6;
  const helipadOutlineColor = aeroway.helipad?.outlineColor ?? "#6a7588";
  const helipadOutlineWidth = aeroway.helipad?.outlineWidth ?? 0.3;
  const helipadSize = aeroway.helipad?.size ?? 4;
  
  const labelColor = aeroway.label?.color ?? "#a8b8d0";
  const labelHaloColor = aeroway.label?.haloColor ?? "#0b0f14";
  const labelHaloWidth = aeroway.label?.haloWidth ?? 2;
  const labelOpacity = aeroway.label?.opacity ?? 0.9;
  
  // Helper to create label size expression
  const getLabelSize = (size: number | { min: number; max: number } | undefined, defaultMin: number, defaultMax: number): unknown => {
    if (typeof size === 'number') {
      return size;
    }
    if (size) {
      return [
        "interpolate",
        ["linear"],
        ["zoom"],
        8, size.min,
        13, size.max,
      ];
    }
    return [
      "interpolate",
      ["linear"],
      ["zoom"],
      8, defaultMin,
      13, defaultMax,
    ];
  };
  
  const majorLabelSize = getLabelSize(aeroway.label?.majorSize, 10, 12);
  const detailedLabelSize = getLabelSize(aeroway.label?.detailedSize, 12, 14);
  
  // ============================================================================
  // RUNWAY LAYERS
  // ============================================================================
  
  // Major runways only (z6-7): length ≥ 2500 m
  layers.push({
    id: "aeroway-runway-major",
    type: "line",
    source: "aeroway-world",
    "source-layer": "runway_lines",
    minzoom: 6,
    maxzoom: 8,
    filter: [
      "all",
      ["has", "length"], // Ensure length property exists
      [">=", ["get", "length"], majorRunwayLength],
    ],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": runwayColor,
      "line-width": runwayWidth,
      "line-opacity": runwayOpacity,
    },
  });
  
  // All runways (z8+)
  layers.push({
    id: "aeroway-runway-all",
    type: "line",
    source: "aeroway-world",
    "source-layer": "runway_lines",
    minzoom: 8,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": runwayColor,
      "line-width": runwayWidth,
      "line-opacity": runwayOpacity,
    },
  });
  
  // ============================================================================
  // APRON LAYERS
  // ============================================================================
  
  // Aprons (z8+): thin fill
  layers.push({
    id: "aeroway-apron-fill",
    type: "fill",
    source: "aeroway-world",
    "source-layer": "apron_polys",
    minzoom: 8,
    paint: {
      "fill-color": apronFillColor,
      "fill-opacity": apronFillOpacity,
    },
  });
  
  // Apron outlines (z8+)
  layers.push({
    id: "aeroway-apron-outline",
    type: "line",
    source: "aeroway-world",
    "source-layer": "apron_polys",
    minzoom: 8,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": apronOutlineColor,
      "line-width": apronOutlineWidth,
      "line-opacity": apronFillOpacity,
    },
  });
  
  // ============================================================================
  // TAXIWAY LAYERS
  // ============================================================================
  
  // Taxiways (z10+)
  layers.push({
    id: "aeroway-taxiway",
    type: "line",
    source: "aeroway-world",
    "source-layer": "taxiway_lines",
    minzoom: 10,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": taxiwayColor,
      "line-width": taxiwayWidth,
      "line-opacity": taxiwayOpacity,
    },
  });
  
  // ============================================================================
  // HELIPAD LAYERS
  // ============================================================================
  
  // Helipads (z13+)
  layers.push({
    id: "aeroway-helipad-fill",
    type: "circle",
    source: "aeroway-world",
    "source-layer": "helipad_points",
    minzoom: 13,
    paint: {
      "circle-color": helipadFillColor,
      "circle-opacity": helipadFillOpacity,
      "circle-radius": helipadSize,
      "circle-stroke-color": helipadOutlineColor,
      "circle-stroke-width": helipadOutlineWidth,
      "circle-stroke-opacity": helipadFillOpacity,
    },
  });
  
  // ============================================================================
  // AIRPORT LABEL LAYERS
  // ============================================================================
  
  // Major airport labels (z8-9)
  // Note: These are text-only labels from apron polygons
  // POI airport icons (with icons + labels) show at z12+ from POI sources
  // Prevent duplicate labels by using text-ignore-placement: false (default) which enables
  // collision detection, and text-padding to increase the collision box size
  // Use text-ignore-placement: true to allow POI icons to show through
  layers.push({
    id: "aeroway-label-major",
    type: "symbol",
    source: "aeroway-world",
    "source-layer": "apron_polys", // Use aprons as source for labels (they represent airports)
    minzoom: 8,
    maxzoom: 10,
    filter: ["has", "name"],
    layout: {
      "text-field": createTextField(),
      "text-font": theme.fonts.regular,
      "text-size": majorLabelSize,
      "text-anchor": "center",
      "text-optional": true,
      "text-allow-overlap": false,
      "text-ignore-placement": true, // Don't block POI icons - allow them to show through
      "text-padding": 50, // Increase padding to prevent nearby duplicate labels
      "symbol-placement": "point",
    },
    paint: {
      "text-color": labelColor,
      "text-halo-color": labelHaloColor,
      "text-halo-width": labelHaloWidth,
      "text-halo-blur": 1,
      "text-opacity": labelOpacity,
    },
  });
  
  // Detailed airport labels (z13+)
  // These complement POI airport icons which also show at z12+
  // Use text-ignore-placement: true to allow POI icons to show through
  layers.push({
    id: "aeroway-label-detailed",
    type: "symbol",
    source: "aeroway-world",
    "source-layer": "apron_polys",
    minzoom: 13,
    filter: ["has", "name"],
    layout: {
      "text-field": createTextField(),
      "text-font": theme.fonts.regular,
      "text-size": detailedLabelSize,
      "text-anchor": "center",
      "text-optional": true,
      "text-allow-overlap": false,
      "text-ignore-placement": true, // Don't block POI icons - allow them to show through
      "text-padding": 30, // Increase padding to prevent nearby duplicate labels
      "symbol-placement": "point",
    },
    paint: {
      "text-color": labelColor,
      "text-halo-color": labelHaloColor,
      "text-halo-width": labelHaloWidth,
      "text-halo-blur": 1,
      "text-opacity": labelOpacity,
    },
  });
  
  return layers;
}

