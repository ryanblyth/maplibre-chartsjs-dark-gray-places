/**
 * Road layers (world, US, tunnels, bridges)
 */

import type { LayerSpecification } from "maplibre-gl";
import type { Theme } from "../theme.js";
import { 
  roadColorExpr, 
  roadColorWithTertiaryExpr, 
  buildingFillColor, 
  tunnelColorExpr, 
  bridgeColorExpr, 
  filters,
  roadWidthExpr,
  roadWidthExprRealWorld,
  roadCasingWidthExpr,
  roadCasingWidthExprRealWorld,
  zoomWidthExpr
} from "./expressions.js";
import type { RoadClassWidths } from "../theme.js";

/** Helper to get road width expression based on theme settings */
function getRoadWidthExpr(widths: RoadClassWidths, theme: Theme): unknown {
  if (theme.settings?.realWorldScale) {
    const minZoom = theme.settings.realWorldScaleMinZoom ?? 15;
    return roadWidthExprRealWorld(widths, minZoom);
  }
  return roadWidthExpr(widths);
}

// Casing width helper - currently uses fixed scaling (not real-world)
// Real-world casing scaling can be revisited in the future if needed
function getRoadCasingWidthExpr(widths: RoadClassWidths, _theme: Theme): unknown {
  return roadCasingWidthExpr(widths);
}

export function createWorldRoadLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const roadColor = roadColorExpr(c);
  
  return [
    { id: "road-world", type: "line", source: "world_low", "source-layer": "transportation", minzoom: 0, maxzoom: 6.5, filter: filters.majorRoad, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": roadColor, "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.2, 6, 0.6] } },
    { id: "road-world-mid", type: "line", source: "world_mid", "source-layer": "transportation", minzoom: 6, filter: filters.majorRoad, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": roadColor, "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 10, 1.0] } },
  ];
}

export function createUSRoadLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const w = theme.widths;
  const o = theme.opacities;
  
  // Use road colors by default for tunnels/bridges, with optional overrides
  const roadColor = roadColorWithTertiaryExpr(c);
  const tunnelColor = c.road.tunnel ? tunnelColorExpr(c) : roadColor;
  const bridgeColor = c.road.bridge ? bridgeColorExpr(c) : roadColor;
  
  // Use road casing color for tunnel/bridge casings, or override if specified
  const tunnelCasingColor = c.road.tunnelCasing || c.road.casing;
  const bridgeCasingColor = c.road.bridge?.casing || c.road.casing;
  
  // Use tunnel/bridge-specific widths if defined, otherwise inherit from road
  const tunnelWidths = w.tunnelRoad || w.road;
  const bridgeWidths = w.bridgeRoad || w.road;
  
  // Get width expressions (uses real-world scaling if enabled in theme settings)
  const roadWidth = getRoadWidthExpr(w.road, theme);
  const tunnelWidth = getRoadWidthExpr(tunnelWidths, theme);
  const bridgeWidth = getRoadWidthExpr(bridgeWidths, theme);
  const casingWidth = getRoadCasingWidthExpr(w.roadCasing, theme);
  
  // Building configuration
  const buildingConfig = theme.buildings;
  const buildingMinZoom = buildingConfig?.minZoom ?? 6;
  const buildingMaxZoom = buildingConfig?.maxZoom;
  const buildingHeightColorsMinZoom = buildingConfig?.heightColorsMinZoom;
  
  /**
   * Creates a building layer specification
   * @param id - Layer ID
   * @param minzoom - Minimum zoom level for the layer
   * @returns Building layer specification or null if buildings are disabled
   */
  const createBuildingLayer = (id: string, minzoom: number): LayerSpecification | null => {
    if (buildingConfig?.enabled === false) {
      return null;
    }
    
    const buildingPaint: any = {
      "fill-color": buildingFillColor(c, buildingHeightColorsMinZoom),
      "fill-outline-color": c.building.outline,
      "fill-opacity": o.building
    };
    
    // Add fade-out opacity if maxZoom is set
    if (buildingMaxZoom !== undefined) {
      buildingPaint["fill-opacity"] = [
        "interpolate",
        ["linear"],
        ["zoom"],
        minzoom, o.building,
        buildingMaxZoom, o.building,
        buildingMaxZoom + 1, 0.0
      ];
    }
    
    const buildingLayer: any = {
      id,
      type: "fill",
      source: "us_high",
      "source-layer": "building",
      minzoom,
      paint: buildingPaint
    };
    
    // Only add maxzoom if it's defined (JSON doesn't support undefined)
    if (buildingMaxZoom !== undefined) {
      buildingLayer.maxzoom = buildingMaxZoom + 1;
    }
    
    return buildingLayer;
  };
  
  const layers: LayerSpecification[] = [
    // Tunnel layers - inherit road widths and colors (can be overridden in theme)
    { id: "road-tunnel-casing", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.tunnel, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": tunnelCasingColor, "line-width": casingWidth, "line-opacity": o.tunnel } },
    { id: "road-tunnel", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.tunnel, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": tunnelColor, "line-width": tunnelWidth, "line-dasharray": [2, 2] } },
    
    // Road casing - provides outline to separate overlapping roads
    { id: "road-casing", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.normalRoad, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.road.casing, "line-width": casingWidth } },
    
    // Paths
    { id: "paths", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.path, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.path, "line-width": zoomWidthExpr(w.path) } },
    
    // Bridge layers - inherit road widths and colors (can be overridden in theme)
    // Bridge casing commented out - can be re-enabled if needed for highway interchanges
    // { id: "road-bridge-casing", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.bridge, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": bridgeCasingColor, "line-width": casingWidth } },
    { id: "road-bridge", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.bridge, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": bridgeColor, "line-width": bridgeWidth } },
    
    // Railway
    { id: "railway", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.railway, paint: { "line-color": c.railway, "line-width": zoomWidthExpr(w.railway) } },
  ];
  
  // Building layer (uses helper function to avoid duplication)
  const buildingLayer = createBuildingLayer("building", buildingMinZoom);
  if (buildingLayer) {
    layers.push(buildingLayer);
  }
  
  return layers;
}

export function createUSOverlayRoadLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const w = theme.widths;
  const o = theme.opacities;
  const roadColor = roadColorWithTertiaryExpr(c);
  
  // Use road colors by default for bridges, with optional overrides
  const bridgeColor = c.road.bridge ? bridgeColorExpr(c) : roadColor;
  
  // Use bridge-specific widths if defined, otherwise inherit from road
  const bridgeWidths = w.bridgeRoad || w.road;
  
  // Get width expressions (uses real-world scaling if enabled in theme settings)
  const roadWidth = getRoadWidthExpr(w.road, theme);
  const bridgeWidth = getRoadWidthExpr(bridgeWidths, theme);
  const casingWidth = getRoadCasingWidthExpr(w.roadCasing, theme);
  const bridgeCasingColor = c.road.bridge?.casing || c.road.casing;
  
  // Building configuration
  const buildingConfig = theme.buildings;
  const buildingMaxZoom = buildingConfig?.maxZoom;
  
  /**
   * Creates a building layer specification
   * @param id - Layer ID
   * @param minzoom - Minimum zoom level for the layer
   * @returns Building layer specification or null if buildings are disabled
   */
  const createBuildingLayer = (id: string, minzoom: number): LayerSpecification | null => {
    if (buildingConfig?.enabled === false) {
      return null;
    }
    
    const buildingHeightColorsMinZoom = buildingConfig?.heightColorsMinZoom;
    const buildingPaint: any = {
      "fill-color": buildingFillColor(c, buildingHeightColorsMinZoom),
      "fill-outline-color": c.building.outline,
      "fill-opacity": o.building
    };
    
    // Add fade-out opacity if maxZoom is set
    if (buildingMaxZoom !== undefined) {
      buildingPaint["fill-opacity"] = [
        "interpolate",
        ["linear"],
        ["zoom"],
        minzoom, o.building,
        buildingMaxZoom, o.building,
        buildingMaxZoom + 1, 0.0
      ];
    }
    
    const buildingLayer: any = {
      id,
      type: "fill",
      source: "us_high",
      "source-layer": "building",
      minzoom,
      paint: buildingPaint
    };
    
    // Only add maxzoom if it's defined (JSON doesn't support undefined)
    if (buildingMaxZoom !== undefined) {
      buildingLayer.maxzoom = buildingMaxZoom + 1;
    }
    
    return buildingLayer;
  };
  
  const layers: LayerSpecification[] = [];
  
  // US buildings (high zoom) - always starts at zoom 13 per PMTiles data availability
  const buildingUsLayer = createBuildingLayer("building-us", 13);
  if (buildingUsLayer) {
    layers.push(buildingUsLayer);
  }
  
  return [
    ...layers,
    // US roads (excluding alleys, tunnels, bridges - they have their own layers)
    { id: "road-casing-us", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.normalRoad, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.road.casing, "line-width": casingWidth } },
    { id: "road-us", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.normalRoad, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": roadColor, "line-width": roadWidth } },
    
    // Alleys - only appear at zoom 14+
    { id: "road-alley", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 14, filter: filters.alley, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.road.service, "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.3, 15, 0.6, 18, 1.2] } },
    
    // Parking aisles - only appear at zoom 15+ (even later than alleys)
    { id: "road-parking-aisle", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 15, filter: filters.parkingAisle, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.road.parkingAisle || c.road.service, "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.2, 16, 0.4, 18, 0.8] } },
    
    // Other roads (catch-all for unhandled road classes)
    { id: "road-other", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 14, filter: ["all", ["!=", ["get", "brunnel"], "tunnel"], ["!=", ["get", "brunnel"], "bridge"], ["!", ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary", "residential", "service", "minor", "unclassified"], true, false]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.road.other, "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.3, 15, 0.5] } },
    
    // US Bridges - rendered on TOP of everything
    // Bridge casing commented out - can be re-enabled if needed for highway interchanges
    // { id: "road-bridge-casing-us", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.bridge, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": bridgeCasingColor, "line-width": casingWidth } },
    { id: "road-bridge-us", type: "line", source: "us_high", "source-layer": "transportation", minzoom: 6, filter: filters.bridge, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": bridgeColor, "line-width": bridgeWidth } },
  ];
}
