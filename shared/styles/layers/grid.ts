/**
 * Grid layers (latitude and longitude lines)
 * 
 * Uses a PMTiles source with a single source-layer "graticules" containing
 * LineString features with properties:
 * - kind: "parallel" (latitude) or "meridian" (longitude)
 * - step: interval in degrees ("1", "5", "10", "30")
 * - value: coordinate value
 * 
 * PMTiles URL: pmtiles://{dataBaseUrl}/pmtiles/graticules.pmtiles
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";

// Default values
const DEFAULT_GRID_COLOR = "#4a5568";
const DEFAULT_OPACITY = 0.4;
const DEFAULT_INTERVAL = 10;
const DEFAULT_MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 10;
const DEFAULT_LABEL_OPACITY = 0.8;
const DEFAULT_LABEL_SIZE = { min: 10, max: 12 };
const OPACITY_FADE_FACTOR = 0.7; // Starting opacity multiplier for fade-in
const LABEL_SPACING = 300; // Pixels between labels along lines

/**
 * Creates a width expression from theme configuration
 */
function createWidthExpression(
  width: number | { min: number; max: number } | undefined,
  gridMinZoom: number,
  gridMaxZoom: number
): unknown {
  if (typeof width === 'number') {
    return width;
  }
  if (width) {
    return [
      "interpolate",
      ["linear"],
      ["zoom"],
      gridMinZoom, width.min,
      gridMaxZoom, width.max
    ];
  }
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    gridMinZoom, 0.5,
    gridMaxZoom, 1.0
  ];
}

/**
 * Creates a label size expression from theme configuration
 */
function createLabelSizeExpression(
  size: number | { min: number; max: number } | undefined,
  labelMinZoom: number,
  gridMaxZoom: number
): unknown {
  if (typeof size === 'number') {
    return size;
  }
  if (size) {
    return [
      "interpolate",
      ["linear"],
      ["zoom"],
      labelMinZoom, size.min,
      gridMaxZoom, size.max
    ];
  }
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    labelMinZoom, DEFAULT_LABEL_SIZE.min,
    gridMaxZoom, DEFAULT_LABEL_SIZE.max
  ];
}

/**
 * Creates a label field expression for coordinate display
 */
function createLabelField(direction: "lat" | "lon"): unknown {
  const suffix = direction === "lat" 
    ? ["case", [">", ["get", "value"], 0], "N", ["<", ["get", "value"], 0], "S", "°"]
    : ["case", [">", ["get", "value"], 0], "E", ["<", ["get", "value"], 0], "W", "°"];
  
  return [
    "concat",
    ["to-string", ["abs", ["get", "value"]]],
    "°",
    suffix
  ];
}

/**
 * Creates grid line layers for latitude and longitude
 * 
 * @param theme - Theme object with grid configuration
 * @returns Array of LayerSpecification objects, or empty array if grid is disabled
 */
export function createGridLayers(theme: Theme): LayerSpecification[] {
  if (!theme.grid?.enabled) {
    return [];
  }
  
  const grid = theme.grid;
  const layers: LayerSpecification[] = [];
  const gridMinZoom = grid.minZoom ?? DEFAULT_MIN_ZOOM;
  const gridMaxZoom = grid.maxZoom ?? DEFAULT_MAX_ZOOM;
  
  // Use theme-configured font for grid labels, with fallback to default fonts
  const gridFont = theme.labelFonts?.grid ?? theme.labelFonts?.default ?? theme.fonts.regular;
  
  // Helper function to create grid line and label layers
  function createGridLineLayers(
    kind: "parallel" | "meridian",
    config: typeof grid.latitude | typeof grid.longitude,
    defaultColor: string
  ): void {
    if (!config) return;
    
    const lineColor = config.color ?? defaultColor;
    const lineOpacity = config.opacity ?? DEFAULT_OPACITY;
    const interval = config.interval ?? DEFAULT_INTERVAL;
    const lineWidth = createWidthExpression(config.width, gridMinZoom, gridMaxZoom);
    
    // Build filter: kind + step interval
    const filter: unknown[] = [
      "all",
      ["==", ["get", "kind"], kind]
    ];
    if (interval) {
      filter.push(["==", ["get", "step"], String(interval)]);
    }
    
    const layerId = kind === "parallel" ? "grid-latitude" : "grid-longitude";
    
    // Create line layer
    layers.push({
      id: layerId,
      type: "line",
      source: "world-grid",
      "source-layer": "graticules",
      minzoom: gridMinZoom,
      maxzoom: gridMaxZoom + 1,
      filter,
      paint: {
        "line-color": lineColor,
        "line-width": lineWidth,
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          gridMinZoom, lineOpacity * OPACITY_FADE_FACTOR,
          gridMaxZoom, lineOpacity,
          gridMaxZoom + 1, 0.0
        ],
      }
    });
    
    // Create label layer if enabled
    if (config.label?.enabled) {
      const labelColor = config.label.color ?? lineColor;
      const labelOpacity = config.label.opacity ?? DEFAULT_LABEL_OPACITY;
      const labelMinZoom = config.label.minZoom ?? gridMinZoom;
      const labelSize = createLabelSizeExpression(config.label.size, labelMinZoom, gridMaxZoom);
      const labelField = createLabelField(kind === "parallel" ? "lat" : "lon");
      const labelLayerId = kind === "parallel" ? "grid-latitude-label" : "grid-longitude-label";
      
      layers.push({
        id: labelLayerId,
        type: "symbol",
        source: "world-grid",
        "source-layer": "graticules",
        minzoom: labelMinZoom,
        maxzoom: gridMaxZoom + 1,
        filter,
        layout: {
          "text-field": labelField,
          "text-font": gridFont,
          "text-size": labelSize,
          "symbol-placement": "line",
          "text-rotation-alignment": "map",
          "text-pitch-alignment": "viewport",
          "symbol-spacing": LABEL_SPACING,
        },
        paint: {
          "text-color": labelColor,
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            labelMinZoom, labelOpacity * OPACITY_FADE_FACTOR,
            gridMaxZoom, labelOpacity,
            gridMaxZoom + 1, 0.0
          ],
          "text-halo-color": "#000000",
          "text-halo-width": 1,
          "text-halo-blur": 0.5,
        }
      });
    }
  }
  
  // Create latitude (parallel) and longitude (meridian) layers
  createGridLineLayers("parallel", grid.latitude, DEFAULT_GRID_COLOR);
  createGridLineLayers("meridian", grid.longitude, DEFAULT_GRID_COLOR);
  
  return layers;
}

