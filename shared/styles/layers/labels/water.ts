/**
 * Water label layers (marine, water bodies, waterways)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../../theme.js";
import { createTextField } from "../../baseStyle.js";
import { filters } from "../expressions.js";

// ============================================================================
// COMPLEX SIZE EXPRESSIONS
// ============================================================================

/** Complex text-size expression for water_name labels */
function createWaterNameSizeExpression(): unknown {
  const sizeAtZoom = (baseSize: number) => [
    "let", "name", ["coalesce", ["get", "name:en"], ["get", "name"], ""],
    ["case",
      ["has", "rank"],
      ["case",
        ["<=", ["get", "rank"], 1], baseSize + 6,
        ["<=", ["get", "rank"], 2], baseSize + 4,
        ["<=", ["get", "rank"], 3], baseSize + 3,
        ["<=", ["get", "rank"], 4], baseSize + 2,
        ["<=", ["get", "rank"], 6], baseSize + 1,
        baseSize
      ],
      ["case",
        ["in", "Sea", ["var", "name"]], baseSize + 4,
        ["in", "sea", ["var", "name"]], baseSize + 4,
        ["in", "Gulf", ["var", "name"]], baseSize + 3,
        ["in", "gulf", ["var", "name"]], baseSize + 3,
        ["in", "Bay", ["var", "name"]], baseSize + 2,
        ["in", "bay", ["var", "name"]], baseSize + 2,
        ["==", ["get", "class"], "bay"], baseSize + 2,
        ["==", ["get", "class"], "lake"], baseSize + 3,
        baseSize + 1
      ]
    ]
  ];
  
  return ["interpolate", ["linear"], ["zoom"], 4, sizeAtZoom(7), 6, sizeAtZoom(13), 10, sizeAtZoom(18)];
}

/** Complex text-size expression for US major water labels */
function createUSMajorWaterSizeExpression(): unknown {
  const sizeExpr = (pondSize: number, reservoirSize: number, defaultSize: number, rankSizes: number[]) => [
    "let", "name", ["coalesce", ["get", "name:en"], ["get", "name"], ""],
    ["case",
      ["in", "Pond", ["var", "name"]], pondSize,
      ["in", "pond", ["var", "name"]], pondSize,
      ["in", "Pool", ["var", "name"]], pondSize,
      ["in", "pool", ["var", "name"]], pondSize,
      ["in", "Puddle", ["var", "name"]], pondSize - 1,
      ["in", "puddle", ["var", "name"]], pondSize - 1,
      ["case",
        ["has", "rank"],
        ["case",
          ["<=", ["get", "rank"], 1], rankSizes[0],
          ["<=", ["get", "rank"], 2], rankSizes[1],
          ["<=", ["get", "rank"], 3], rankSizes[2],
          ["<=", ["get", "rank"], 4], rankSizes[3],
          rankSizes[4]
        ],
        ["case",
          ["in", "Reservoir", ["var", "name"]], reservoirSize,
          ["in", "reservoir", ["var", "name"]], reservoirSize,
          defaultSize
        ]
      ]
    ]
  ];
  
  return ["interpolate", ["linear"], ["zoom"],
    6, sizeExpr(6, 11, 10, [16, 14, 12, 10, 8]),
    10, sizeExpr(6, 14, 13, [22, 19, 16, 13, 10]),
    12, sizeExpr(7, 18, 17, [26, 23, 20, 17, 13]),
    15, sizeExpr(8, 19, 18, [30, 26, 22, 18, 14])
  ];
}

// ============================================================================
// WATER LABEL LAYERS FROM WORLD_LABELS SOURCE
// ============================================================================

export function createWaterLabelLayersFromWorldLabels(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const waterLabelPaint = { "text-color": c.label.water.color, "text-halo-color": c.label.water.halo, "text-halo-width": 2, "text-halo-blur": 1, "text-opacity": 0.9 };
  
  // Use theme-configured font for water labels, with fallback to italic
  const waterFont = theme.labelFonts?.water ?? theme.labelFonts?.default ?? theme.fonts.italic;
  
  return [
    // Ocean labels from place layer
    { id: "marine-label-world-labels-place-ocean", type: "symbol", source: "world_labels", "source-layer": "place", minzoom: 1, maxzoom: 10, filter: ["all", filters.hasName, ["==", ["get", "class"], "ocean"]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 1, 11, 3, 16, 6, 22, 10, 26], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    
    // Sea/Gulf/Bay/Lake labels from place layer
    { id: "marine-label-world-labels-place", type: "symbol", source: "world_labels", "source-layer": "place", minzoom: 4, maxzoom: 10, filter: ["all", filters.hasName, ["any", ["match", ["get", "class"], ["sea", "gulf", "bay"], true, false], ["==", ["get", "class"], "lake"]]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 4, ["match", ["get", "class"], "sea", 10, "gulf", 8, "bay", 6, "lake", 9, 7], 6, ["match", ["get", "class"], "sea", 15, "gulf", 11, "bay", 9, "lake", 13, 11], 10, ["match", ["get", "class"], "sea", 25, "gulf", 20, "bay", 17, "lake", 23, 20]], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    
    // Ocean labels from water_name layer (name-based detection)
    { id: "water-label-world-labels-watername-ocean", type: "symbol", source: "world_labels", "source-layer": "water_name", minzoom: 1, maxzoom: 10, filter: ["all", filters.hasName, ["let", "name", ["coalesce", ["get", "name:en"], ["get", "name"], ""], ["any", ["in", "Ocean", ["var", "name"]], ["in", "ocean", ["var", "name"]]]]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 1, 11, 3, 16, 6, 22, 10, 26], "symbol-placement": "point", "text-padding": 8 }, paint: { ...waterLabelPaint, "text-halo-width": 1.5 } },
    
    // Other water labels from water_name layer
    { id: "water-label-world-labels-watername", type: "symbol", source: "world_labels", "source-layer": "water_name", minzoom: 4, maxzoom: 10, filter: ["all", filters.hasName, ["let", "name", ["coalesce", ["get", "name:en"], ["get", "name"], ""], ["all", ["!", ["in", "Ocean", ["var", "name"]]], ["!", ["in", "ocean", ["var", "name"]]]]]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": createWaterNameSizeExpression(), "symbol-placement": "point", "text-padding": 8 }, paint: { ...waterLabelPaint, "text-halo-width": 1.5 } },
  ];
}

// ============================================================================
// WATER LABEL LAYERS FROM BASEMAP SOURCES
// ============================================================================

export function createWaterLabelLayersFromBasemapSources(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const waterLabelPaint = { "text-color": c.label.water.color, "text-halo-color": c.label.water.halo, "text-halo-width": 2, "text-halo-blur": 1, "text-opacity": 0.9 };
  const waterLabelPaintThin = { ...waterLabelPaint, "text-halo-width": 1.5 };
  const hasClassFilter = ["case", ["has", "class"], ["match", ["get", "class"], ["ocean", "sea", "gulf", "bay"], true, false], true];
  
  // Use theme-configured font for water labels, with fallback to italic
  const waterFont = theme.labelFonts?.water ?? theme.labelFonts?.default ?? theme.fonts.italic;
  
  return [
    // World low zoom ocean labels
    { id: "marine-label-world-watername-ocean", type: "symbol", source: "world_low", "source-layer": "water_name_ocean", minzoom: 1, maxzoom: 6.5, layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"], ["get", "name_int"], ""], "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 1, 14, 3, 18, 6, 24], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    
    // Debug layer (magenta) - kept for consistency
    { id: "marine-label-world-all-watername", type: "symbol", source: "world_low", "source-layer": "water_name", minzoom: 1, maxzoom: 6.5, layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"], ["get", "name_int"], ""], "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 1, 14, 3, 18, 6, 24], "symbol-placement": "point", "text-padding": 10 }, paint: { "text-color": "#ff00ff", "text-halo-color": "#ffffff", "text-halo-width": 2, "text-halo-blur": 1, "text-opacity": 1 } },
    
    // World low zoom water_name
    { id: "marine-label-world-watername", type: "symbol", source: "world_low", "source-layer": "water_name", minzoom: 1, maxzoom: 6.5, filter: ["all", filters.hasName, hasClassFilter], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 1, 14, 3, 18, 6, 24], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    
    // World low zoom place
    { id: "marine-label-world", type: "symbol", source: "world_low", "source-layer": "place", minzoom: 1, maxzoom: 6.5, filter: ["all", filters.hasName, filters.marineClass], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 1, 14, 3, 18, 6, 24], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    
    // Water labels
    { id: "water-label-world-major", type: "symbol", source: "world_low", "source-layer": "water_name", minzoom: 2, maxzoom: 6.5, filter: ["all", filters.hasName], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 2, 12, 4, 14, 6, 18], "symbol-placement": "point", "text-padding": 8 }, paint: waterLabelPaintThin },
    { id: "water-label-world", type: "symbol", source: "world_low", "source-layer": "water_name", minzoom: 4, maxzoom: 6.5, filter: ["all", filters.hasName, ["case", ["has", "rank"], [">", ["get", "rank"], 2], false]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 6, 14], "symbol-placement": "point", "text-padding": 8 }, paint: waterLabelPaintThin },
    
    // World mid zoom
    { id: "marine-label-world-mid-watername-ocean", type: "symbol", source: "world_mid", "source-layer": "water_name_ocean", minzoom: 6, filter: ["all", filters.hasName], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 6, 20, 8, 24, 10, 28], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    { id: "marine-label-world-mid-watername", type: "symbol", source: "world_mid", "source-layer": "water_name", minzoom: 6, filter: ["all", filters.hasName, hasClassFilter], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 6, 20, 8, 24, 10, 28], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    { id: "marine-label-world-mid", type: "symbol", source: "world_mid", "source-layer": "place", minzoom: 6, filter: ["all", filters.hasName, filters.marineClass], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 6, 20, 8, 24, 10, 28], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    { id: "water-label-world-mid-major", type: "symbol", source: "world_mid", "source-layer": "water_name", minzoom: 6, filter: ["all", filters.hasName], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 6, 16, 8, 18, 10, 22], "symbol-placement": "point", "text-padding": 8 }, paint: waterLabelPaintThin },
    { id: "water-label-world-mid", type: "symbol", source: "world_mid", "source-layer": "water_name", minzoom: 7, filter: ["all", ["has", "name"], ["case", ["has", "rank"], [">", ["get", "rank"], 3], false]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 7, 12, 10, 16], "symbol-placement": "point", "text-padding": 8 }, paint: waterLabelPaintThin },
    
    // US high zoom
    { id: "marine-label-us-watername-ocean", type: "symbol", source: "us_high", "source-layer": "water_name_ocean", minzoom: 4, filter: ["all", filters.hasName], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 4, 16, 8, 20, 12, 26, 15, 32], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    { id: "marine-label-us-watername", type: "symbol", source: "us_high", "source-layer": "water_name", minzoom: 4, filter: ["all", filters.hasName, hasClassFilter], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 4, 16, 8, 20, 12, 26, 15, 32], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    { id: "marine-label-us", type: "symbol", source: "us_high", "source-layer": "place", minzoom: 4, filter: ["all", filters.hasName, ["match", ["get", "class"], ["ocean", "sea", "gulf", "bay", "lake"], true, false]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 4, 16, 8, 20, 12, 26, 15, 32], "symbol-placement": "point", "text-padding": 10 }, paint: waterLabelPaint },
    { id: "water-label-us-place", type: "symbol", source: "us_high", "source-layer": "place", minzoom: 6, filter: ["all", filters.hasName, ["==", ["get", "class"], "lake"]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 6, 14, 10, 18, 15, 24], "symbol-placement": "point", "text-padding": 8 }, paint: waterLabelPaintThin },
    { id: "water-label-us-major", type: "symbol", source: "us_high", "source-layer": "water_name", minzoom: 6, filter: ["all", filters.hasName, ["case", ["has", "rank"], ["<=", ["get", "rank"], 4], true]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": createUSMajorWaterSizeExpression(), "symbol-placement": "point", "text-padding": 8 }, paint: waterLabelPaintThin },
    { id: "water-label-us", type: "symbol", source: "us_high", "source-layer": "water_name", minzoom: 10, filter: ["all", filters.hasName, ["case", ["has", "rank"], [">", ["get", "rank"], 4], false]], layout: { "text-field": createTextField(), "text-font": waterFont, "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 12, 14, 15, 18], "symbol-placement": "point", "text-padding": 8 }, paint: waterLabelPaintThin },
  ];
}

// ============================================================================
// WATERWAY LABELS
// ============================================================================

export function createWaterwayLabelLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const waterwayLabelPaint = { "text-color": c.label.water.color, "text-halo-color": c.label.water.halo, "text-halo-width": 1.5, "text-halo-blur": 1, "text-opacity": 0.85 };
  
  // Use theme-configured font for water labels, with fallback to italic
  const waterFont = theme.labelFonts?.water ?? theme.labelFonts?.default ?? theme.fonts.italic;
  
  const baseLayout = { 
    "text-font": waterFont, 
    "symbol-placement": "line" as const, 
    "text-rotation-alignment": "map" as const, 
    "text-pitch-alignment": "viewport" as const, 
    "symbol-spacing": 200 
  };
  
  const sizeByClass = (river: number, canal: number, stream: number, ditch: number) => 
    ["match", ["get", "class"], "river", river, "canal", canal, "stream", stream, "ditch", ditch, "drain", ditch, stream];
  
  return [
    { id: "waterway-label-world", type: "symbol", source: "world_low", "source-layer": "waterway", minzoom: 6, maxzoom: 6.5, filter: ["all", filters.hasName], layout: { ...baseLayout, "text-field": createTextField(), "text-size": ["interpolate", ["linear"], ["zoom"], 6, sizeByClass(10, 8, 7, 6), 6.5, sizeByClass(12, 10, 8, 7)] }, paint: waterwayLabelPaint },
    { id: "waterway-label-world-mid", type: "symbol", source: "world_mid", "source-layer": "waterway", minzoom: 6, filter: ["all", filters.hasName], layout: { ...baseLayout, "text-field": createTextField(), "text-size": ["interpolate", ["linear"], ["zoom"], 6, sizeByClass(12, 10, 9, 8), 10, sizeByClass(16, 13, 11, 10)] }, paint: waterwayLabelPaint },
    { id: "waterway-label-us", type: "symbol", source: "us_high", "source-layer": "waterway", minzoom: 10, filter: ["all", filters.hasName], layout: { ...baseLayout, "text-field": createTextField(), "text-size": ["interpolate", ["linear"], ["zoom"], 10, sizeByClass(10, 8, 7, 6), 12, sizeByClass(12, 10, 8, 7), 15, sizeByClass(14, 11, 9, 8)] }, paint: waterwayLabelPaint },
  ];
}

