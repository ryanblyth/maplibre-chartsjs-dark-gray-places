/**
 * Base style configuration for MapLibre basemaps
 * 
 * Contains shared sources (world_labels) and utility functions
 * that all basemap styles can extend.
 */

import type {
  StyleSpecification,
  LayerSpecification,
  SourceSpecification,
  ExpressionSpecification,
  DataDrivenPropertyValueSpecification,
} from "maplibre-gl";

/** Configuration options for base style */
export interface BaseStyleConfig {
  /** Base URL for glyph files (e.g., "http://localhost:8080" or "https://data.storypath.studio") */
  glyphsBaseUrl: string;
  /** Glyphs path relative to glyphsBaseUrl (e.g., "glyphs" or "shared/assets/glyphs"). Defaults to "shared/assets/glyphs" for local dev */
  glyphsPath?: string;
  /** Base URL for sprite files (e.g., "http://localhost:8080") */
  spriteBaseUrl: string;
  /** Sprite path relative to spriteBaseUrl (e.g., "basemaps/dark-blue/sprites/basemap"). Defaults to "shared/assets/sprites/basemap" for backward compatibility */
  spritePath?: string;
  /** Base URL for PMTiles data (e.g., "https://data.storypath.studio") */
  dataBaseUrl: string;
}

/** Default configuration for local development */
export const defaultConfig: BaseStyleConfig = {
  glyphsBaseUrl: "http://localhost:8080",
  spriteBaseUrl: "http://localhost:8080",
  dataBaseUrl: "https://data.storypath.studio",
};

/**
 * Creates the global sources shared across all basemaps
 */
export function createGlobalSources(config: BaseStyleConfig): Record<string, SourceSpecification> {
  return {
    world_labels: {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/world-labels_z0-10.pmtiles`,
      minzoom: 0,
      maxzoom: 10,
    },
  };
}

/**
 * Creates the base style skeleton with shared configuration
 * 
 * This provides:
 * - version, glyphs, sprite URLs
 * - The global world_labels source
 * - An empty layers array (to be extended by basemaps)
 */
export function createBaseStyle(config: BaseStyleConfig = defaultConfig): StyleSpecification {
  // Use configurable sprite path, defaulting to shared location for backward compatibility
  const spritePath = config.spritePath || 'shared/assets/sprites/basemap';
  // Use configurable glyphs path, defaulting to shared/assets/glyphs for local dev
  const glyphsPath = config.glyphsPath || 'shared/assets/glyphs';
  return {
    version: 8,
    name: "Base Style",
    glyphs: `${config.glyphsBaseUrl}/${glyphsPath}/{fontstack}/{range}.pbf`,
    sprite: `${config.spriteBaseUrl}/${spritePath}`,
    sources: createGlobalSources(config),
    layers: [],
  };
}

/**
 * Utility: Creates a standard text field expression with English fallback
 */
export function createTextField(): ExpressionSpecification {
  return ["coalesce", ["get", "name:en"], ["get", "name"]];
}

/**
 * Utility: Creates the direction/street abbreviation text field expression
 * Used for road labels, city names, etc. to abbreviate common words
 */
export function createAbbreviatedTextField(): DataDrivenPropertyValueSpecification<string> {
  return [
    "let",
    "name", ["coalesce", ["get", "name:en"], ["get", "name"]],
    [
      "let",
      "dirReplaced", [
        "case",
        ["==", ["slice", ["var", "name"], 0, 6], "North "], ["concat", "N ", ["slice", ["var", "name"], 6]],
        ["==", ["slice", ["var", "name"], 0, 6], "South "], ["concat", "S ", ["slice", ["var", "name"], 6]],
        ["==", ["slice", ["var", "name"], 0, 5], "East "], ["concat", "E ", ["slice", ["var", "name"], 5]],
        ["==", ["slice", ["var", "name"], 0, 5], "West "], ["concat", "W ", ["slice", ["var", "name"], 5]],
        ["==", ["slice", ["var", "name"], 0, 6], "North"], ["concat", "N", ["slice", ["var", "name"], 6]],
        ["==", ["slice", ["var", "name"], 0, 6], "South"], ["concat", "S", ["slice", ["var", "name"], 6]],
        ["==", ["slice", ["var", "name"], 0, 5], "East"], ["concat", "E", ["slice", ["var", "name"], 5]],
        ["==", ["slice", ["var", "name"], 0, 5], "West"], ["concat", "W", ["slice", ["var", "name"], 5]],
        ["var", "name"]
      ],
      [
        "let",
        "len", ["length", ["var", "dirReplaced"]],
        [
          "case",
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 7], ["var", "len"]], " Avenue"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 7]], " Ave"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 7], ["var", "len"]], " Street"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 7]], " St"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 10], ["var", "len"]], " Boulevard"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 10]], " Blvd"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 6], ["var", "len"]], " Drive"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 6]], " Dr"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 5], ["var", "len"]], " Road"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 5]], " Rd"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 5], ["var", "len"]], " Lane"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 5]], " Ln"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 6], ["var", "len"]], " Court"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 6]], " Ct"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 7], ["var", "len"]], " Circle"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 7]], " Cir"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 8], ["var", "len"]], " Parkway"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 8]], " Pkwy"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 6], ["var", "len"]], " Place"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 6]], " Pl"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 8], ["var", "len"]], " Highway"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 8]], " Hwy"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 9], ["var", "len"]], " Turnpike"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 9]], " Tpke"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 6], ["var", "len"]], "Avenue"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 6]], "Ave"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 6], ["var", "len"]], "Street"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 6]], "St"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 9], ["var", "len"]], "Boulevard"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 9]], "Blvd"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 5], ["var", "len"]], "Drive"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 5]], "Dr"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 4], ["var", "len"]], "Road"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 4]], "Rd"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 4], ["var", "len"]], "Lane"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 4]], "Ln"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 5], ["var", "len"]], "Court"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 5]], "Ct"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 6], ["var", "len"]], "Circle"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 6]], "Cir"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 6], ["var", "len"]], "Parkway"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 6]], "Pkwy"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 5], ["var", "len"]], "Place"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 5]], "Pl"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 7], ["var", "len"]], "Highway"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 7]], "Hwy"],
          ["==", ["slice", ["var", "dirReplaced"], ["-", ["var", "len"], 8], ["var", "len"]], "Turnpike"], ["concat", ["slice", ["var", "dirReplaced"], 0, ["-", ["var", "len"], 8]], "Tpke"],
          ["var", "dirReplaced"]
        ]
      ]
    ]
  ];
}

/**
 * Merges base style with additional sources and layers
 */
export function mergeStyles(
  base: StyleSpecification,
  additionalSources: Record<string, SourceSpecification>,
  additionalLayers: LayerSpecification[]
): StyleSpecification {
  return {
    ...base,
    sources: {
      ...base.sources,
      ...additionalSources,
    },
    layers: [
      ...(base.layers || []),
      ...additionalLayers,
    ],
  };
}

// Re-export types for convenience
export type { StyleSpecification, LayerSpecification, SourceSpecification };

