/**
 * Shared MapLibre expressions for layer styling
 * 
 * These functions generate MapLibre expression arrays based on theme values.
 */

import type {
  ExpressionSpecification,
  FilterSpecification,
  DataDrivenPropertyValueSpecification,
} from "maplibre-gl";
import type { ThemeColors, ThemeWidths, ZoomWidths, RoadClassWidths } from "../theme.js";

/** MapLibre expression used as a layer filter (expression-filter form; not legacy JSON filters). */
export function expressionFilter(value: unknown): FilterSpecification {
  return value as ExpressionSpecification;
}

/** Combines expression-style filter fragments (each may be a full FilterSpecification) under `all`. */
export function allExpressionFilters(...parts: unknown[]): FilterSpecification {
  return ["all", ...parts] as ExpressionSpecification;
}

/** Combines expression-style filter fragments under `any`. */
export function anyExpressionFilters(...parts: unknown[]): FilterSpecification {
  return ["any", ...parts] as ExpressionSpecification;
}

// ============================================================================
// WIDTH EXPRESSION HELPERS
// ============================================================================

/** Converts ZoomWidths to interpolate expression */
export function zoomWidthExpr(widths: ZoomWidths): DataDrivenPropertyValueSpecification<number> {
  const zoomMap: Record<string, number> = {
    z0: 0, z3: 3, z6: 6, z8: 8, z10: 10, z12: 12, z14: 14, z15: 15
  };

  const entries = Object.entries(widths)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => [zoomMap[k], v] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const pairs: number[] = [];
  for (const [zoom, width] of entries) {
    pairs.push(zoom, width);
  }

  return ["interpolate", ["linear"], ["zoom"], ...pairs] as DataDrivenPropertyValueSpecification<number>;
}

/** Creates road width expression based on class at a given zoom */
function roadClassWidthAtZoom(widths: RoadClassWidths, zoomKey: keyof ZoomWidths): ExpressionSpecification {
  return [
    "match", ["get", "class"],
    "motorway", widths.motorway[zoomKey] ?? widths.default[zoomKey],
    "trunk", widths.trunk[zoomKey] ?? widths.default[zoomKey],
    "primary", widths.primary[zoomKey] ?? widths.default[zoomKey],
    "secondary", widths.secondary[zoomKey] ?? widths.default[zoomKey],
    "tertiary", widths.tertiary[zoomKey] ?? widths.default[zoomKey],
    "residential", widths.residential[zoomKey] ?? widths.default[zoomKey],
    "service", widths.service[zoomKey] ?? widths.default[zoomKey],
    "minor", widths.residential[zoomKey] ?? widths.default[zoomKey],
    "unclassified", widths.residential[zoomKey] ?? widths.default[zoomKey],
    widths.default[zoomKey] ?? 0.5
  ] as ExpressionSpecification;
}

/** Creates interpolated road width expression from theme */
export function roadWidthExpr(widths: RoadClassWidths): DataDrivenPropertyValueSpecification<number> {
  return [
    "interpolate", ["linear"], ["zoom"],
    6, roadClassWidthAtZoom(widths, "z6"),
    12, roadClassWidthAtZoom(widths, "z12"),
    15, roadClassWidthAtZoom(widths, "z15")
  ] as DataDrivenPropertyValueSpecification<number>;
}

/**
 * Creates road width expression with real-world scaling at high zoom levels.
 * 
 * At zoom levels below minZoom, uses linear interpolation (fixed pixel sizes).
 * At zoom levels >= minZoom, uses exponential base 2 (widths double each zoom level).
 * This makes roads scale proportionally to buildings and other features at high zoom.
 * 
 * @param widths - Road class widths from theme
 * @param minZoom - Zoom level where real-world scaling begins (default: 15)
 */
export function roadWidthExprRealWorld(widths: RoadClassWidths, minZoom: number = 15): DataDrivenPropertyValueSpecification<number> {
  const baseWidth = roadClassWidthAtZoom(widths, "z15");

  const z20Multiplier = Math.pow(2, 20 - minZoom);

  const z20Width = [
    "match", ["get", "class"],
    "motorway", (widths.motorway.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "trunk", (widths.trunk.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "primary", (widths.primary.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "secondary", (widths.secondary.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "tertiary", (widths.tertiary.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "residential", (widths.residential.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "service", (widths.service.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "minor", (widths.residential.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "unclassified", (widths.residential.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    (widths.default.z15 ?? 1) * z20Multiplier
  ] as ExpressionSpecification;

  return [
    "interpolate", ["exponential", 2], ["zoom"],
    6, roadClassWidthAtZoom(widths, "z6"),
    12, roadClassWidthAtZoom(widths, "z12"),
    minZoom, baseWidth,
    20, z20Width
  ] as DataDrivenPropertyValueSpecification<number>;
}

/** Creates interpolated road casing width expression from theme */
export function roadCasingWidthExpr(widths: RoadClassWidths): DataDrivenPropertyValueSpecification<number> {
  return [
    "interpolate", ["linear"], ["zoom"],
    6, roadClassWidthAtZoom(widths, "z6"),
    12, roadClassWidthAtZoom(widths, "z12"),
    15, roadClassWidthAtZoom(widths, "z15")
  ] as DataDrivenPropertyValueSpecification<number>;
}

/**
 * Creates road casing width expression with real-world scaling.
 * Casings scale the same as roads to maintain proportional outlines at high zoom.
 */
export function roadCasingWidthExprRealWorld(widths: RoadClassWidths, minZoom: number = 15): DataDrivenPropertyValueSpecification<number> {
  const baseWidth = roadClassWidthAtZoom(widths, "z15");
  const z20Multiplier = Math.pow(2, 20 - minZoom);

  const z20Width = [
    "match", ["get", "class"],
    "motorway", (widths.motorway.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "trunk", (widths.trunk.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "primary", (widths.primary.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "secondary", (widths.secondary.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "tertiary", (widths.tertiary.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "residential", (widths.residential.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "service", (widths.service.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "minor", (widths.residential.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    "unclassified", (widths.residential.z15 ?? widths.default.z15 ?? 1) * z20Multiplier,
    (widths.default.z15 ?? 1) * z20Multiplier
  ] as ExpressionSpecification;

  return [
    "interpolate", ["exponential", 2], ["zoom"],
    6, roadClassWidthAtZoom(widths, "z6"),
    12, roadClassWidthAtZoom(widths, "z12"),
    minZoom, baseWidth,
    20, z20Width
  ] as DataDrivenPropertyValueSpecification<number>;
}

// ============================================================================
// COLOR EXPRESSIONS
// ============================================================================

/** Creates landcover fill color expression */
export function landcoverFillColor(c: ThemeColors, landConfig?: { useOverrideColor?: boolean; overrideColor?: string }): DataDrivenPropertyValueSpecification<string> {
  if (landConfig?.useOverrideColor && landConfig?.overrideColor) {
    return landConfig.overrideColor;
  }

  return [
    "match", ["get", "class"],
    "wood", c.land.wood,
    "grass", c.land.grass,
    "scrub", c.land.scrub,
    "scrubland", c.land.scrub,
    "cropland", c.land.cropland,
    "farmland", c.land.farmland ?? c.land.cropland,
    "rock", c.land.rock ?? c.land.scrub,
    "sand", c.land.sand ?? c.land.default,
    "wetland", c.land.wetland ?? c.land.default,
    c.land.default
  ] as DataDrivenPropertyValueSpecification<string>;
}

/** Creates landuse fill color expression */
export function landuseFillColor(c: ThemeColors, landConfig?: { useOverrideColor?: boolean; overrideColor?: string }): DataDrivenPropertyValueSpecification<string> {
  if (landConfig?.useOverrideColor && landConfig?.overrideColor) {
    return landConfig.overrideColor;
  }

  return [
    "match", ["get", "class"],
    "park", c.landuse.park ?? c.landuse.default,
    "cemetery", c.landuse.cemetery,
    "pitch", c.landuse.pitch,
    "stadium", c.landuse.stadium ?? c.landuse.default,
    "residential", c.landuse.residential,
    "college", c.landuse.college ?? c.landuse.default,
    "commercial", c.landuse.commercial ?? c.landuse.default,
    "construction", c.landuse.construction ?? c.landuse.default,
    "dam", c.landuse.dam ?? c.landuse.default,
    "farmland", c.landuse.farmland ?? c.landuse.default,
    "grass", c.landuse.grass ?? c.landuse.default,
    "hospital", c.landuse.hospital ?? c.landuse.default,
    "industrial", c.landuse.industrial ?? c.landuse.default,
    "military", c.landuse.military ?? c.landuse.default,
    "neighbourhood", c.landuse.neighbourhood ?? c.landuse.default,
    "quarry", c.landuse.quarry ?? c.landuse.default,
    "quarter", c.landuse.quarter ?? c.landuse.default,
    "railway", c.landuse.railway ?? c.landuse.default,
    "retail", c.landuse.retail ?? c.landuse.default,
    "school", c.landuse.school ?? c.landuse.default,
    "suburb", c.landuse.suburb ?? c.landuse.default,
    "theme_park", c.landuse.theme_park ?? c.landuse.default,
    "track", c.landuse.track ?? c.landuse.default,
    "university", c.landuse.university ?? c.landuse.default,
    "zoo", c.landuse.zoo ?? c.landuse.default,
    c.landuse.default
  ] as DataDrivenPropertyValueSpecification<string>;
}

/** Road color expression (motorway, trunk, primary, secondary) */
export function roadColorExpr(c: ThemeColors): DataDrivenPropertyValueSpecification<string> {
  return [
    "match", ["get", "class"],
    "motorway", c.road.motorway,
    "trunk", c.road.trunk,
    "primary", c.road.primary,
    "secondary", c.road.secondary,
    c.road.other
  ] as DataDrivenPropertyValueSpecification<string>;
}

/** Road color expression with tertiary */
export function roadColorWithTertiaryExpr(c: ThemeColors): DataDrivenPropertyValueSpecification<string> {
  return [
    "match", ["get", "class"],
    "motorway", c.road.motorway,
    "trunk", c.road.trunk,
    "primary", c.road.primary,
    "secondary", c.road.secondary,
    "tertiary", c.road.tertiary,
    "residential", c.road.residential,
    "service", c.road.service,
    "minor", c.road.residential,
    "unclassified", c.road.residential,
    c.road.other
  ] as DataDrivenPropertyValueSpecification<string>;
}

/** Tunnel color expression */
export function tunnelColorExpr(c: ThemeColors): DataDrivenPropertyValueSpecification<string> {
  const tunnel = c.road.tunnel ?? {
    motorway: c.road.motorway,
    trunk: c.road.trunk,
    primary: c.road.primary,
    secondary: c.road.secondary,
    tertiary: c.road.tertiary,
    residential: c.road.residential,
    service: c.road.service,
    default: c.road.other,
  };
  return [
    "match", ["get", "class"],
    "motorway", tunnel.motorway,
    "trunk", tunnel.trunk,
    "primary", tunnel.primary,
    "secondary", tunnel.secondary,
    "tertiary", tunnel.tertiary,
    "residential", tunnel.residential,
    "service", tunnel.service,
    "minor", tunnel.residential,
    "unclassified", tunnel.residential,
    tunnel.default
  ] as DataDrivenPropertyValueSpecification<string>;
}

/** Bridge color expression */
export function bridgeColorExpr(c: ThemeColors): DataDrivenPropertyValueSpecification<string> {
  const bridge = c.road.bridge ?? {
    motorway: c.road.motorway,
    trunk: c.road.trunk,
    primary: c.road.primary,
    secondary: c.road.secondary,
    tertiary: c.road.tertiary,
    residential: c.road.residential,
    default: c.road.other,
    casing: c.road.casing,
  };
  return [
    "match", ["get", "class"],
    "motorway", bridge.motorway,
    "trunk", bridge.trunk,
    "primary", bridge.primary,
    "secondary", bridge.secondary,
    "tertiary", bridge.tertiary,
    "residential", bridge.residential,
    "minor", bridge.residential,
    "unclassified", bridge.residential,
    bridge.default
  ] as DataDrivenPropertyValueSpecification<string>;
}

// ============================================================================
// WATER COLOR EXPRESSIONS
// ============================================================================

/** Creates water fill color expression */
export function waterFillColor(c: ThemeColors, waterConfig?: { useOverrideColor?: boolean; overrideColor?: string }): DataDrivenPropertyValueSpecification<string> {
  if (waterConfig?.useOverrideColor && waterConfig?.overrideColor) {
    return waterConfig.overrideColor;
  }

  return [
    "match", ["get", "class"],
    "ocean", c.water.ocean ?? c.water.fill,
    "sea", c.water.sea ?? c.water.fill,
    "lake", c.water.lake ?? c.water.fill,
    "pond", c.water.pond ?? c.water.fill,
    "river", c.water.river ?? c.water.fill,
    "reservoir", c.water.reservoir ?? c.water.fill,
    "bay", c.water.bay ?? c.water.fill,
    "gulf", c.water.gulf ?? c.water.fill,
    c.water.default ?? c.water.fill
  ] as DataDrivenPropertyValueSpecification<string>;
}

/** Creates waterway line color expression */
export function waterwayLineColor(c: ThemeColors, waterConfig?: { useOverrideColorWaterway?: boolean; overrideColorWaterway?: string }): DataDrivenPropertyValueSpecification<string> {
  if (waterConfig?.useOverrideColorWaterway && waterConfig?.overrideColorWaterway) {
    return waterConfig.overrideColorWaterway;
  }

  return [
    "match", ["get", "class"],
    "river", c.water.river ?? c.water.line,
    "canal", c.water.canal ?? c.water.line,
    "stream", c.water.stream ?? c.water.line,
    "ditch", c.water.ditch ?? c.water.line,
    "drain", c.water.drain ?? c.water.line,
    c.water.default ?? c.water.line
  ] as DataDrivenPropertyValueSpecification<string>;
}

// ============================================================================
// BUILDING COLOR EXPRESSIONS
// ============================================================================

/** Creates building fill color expression */
export function buildingFillColor(c: ThemeColors, heightColorsMinZoom?: number): DataDrivenPropertyValueSpecification<string> {
  const heightBasedColor = [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "render_height"], 0],
    0, c.building.short ?? c.building.fill,
    10, c.building.medium ?? c.building.fill,
    50, c.building.tall ?? c.building.fill,
    150, c.building.skyscraper ?? c.building.fill,
    300, c.building.supertall ?? c.building.fill,
    600, c.building.megatall ?? c.building.fill
  ] as ExpressionSpecification;

  if (heightColorsMinZoom !== undefined) {
    const defaultColor = c.building.default ?? c.building.fill;
    return [
      "step",
      ["zoom"],
      defaultColor,
      heightColorsMinZoom - 0.001, heightBasedColor
    ] as DataDrivenPropertyValueSpecification<string>;
  }

  return heightBasedColor as DataDrivenPropertyValueSpecification<string>;
}

// ============================================================================
// COMMON FILTERS
// ============================================================================

export const filters = {
  hasName: expressionFilter(["any", ["has", "name"], ["has", "name:en"]]),
  majorRoad: expressionFilter(["all", ["!=", ["get", "brunnel"], "tunnel"], ["!=", ["get", "brunnel"], "bridge"], ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary"], true, false]]),
  normalRoad: expressionFilter(["all", ["!=", ["get", "brunnel"], "tunnel"], ["!=", ["get", "brunnel"], "bridge"], ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary", "residential", "service", "minor", "unclassified"], true, false], ["!=", ["get", "service"], "alley"], ["!=", ["get", "service"], "parking_aisle"]]),
  alley: expressionFilter(["all", ["!=", ["get", "brunnel"], "tunnel"], ["!=", ["get", "brunnel"], "bridge"], ["==", ["get", "class"], "service"], ["==", ["get", "service"], "alley"]]),
  parkingAisle: expressionFilter(["all", ["!=", ["get", "brunnel"], "tunnel"], ["!=", ["get", "brunnel"], "bridge"], ["==", ["get", "class"], "service"], ["==", ["get", "service"], "parking_aisle"]]),
  tunnel: expressionFilter(["==", ["get", "brunnel"], "tunnel"]),
  bridge: expressionFilter(["==", ["get", "brunnel"], "bridge"]),
  path: expressionFilter(["match", ["get", "class"], ["path", "track", "footway", "cycleway"], true, false]),
  railway: expressionFilter(["==", ["get", "class"], "rail"]),
  countryBoundary: expressionFilter(["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]]),
  maritimeBoundary: expressionFilter(["all", ["==", ["get", "admin_level"], 2], ["==", ["get", "maritime"], 1]]),
  stateBoundary: expressionFilter(["==", ["get", "admin_level"], 4]),
  marineClass: expressionFilter(["any", ["match", ["get", "class"], ["ocean", "sea", "gulf", "bay"], true, false], ["==", ["get", "class"], "lake"]]),
} satisfies Record<string, FilterSpecification>;
