/**
 * Place label layers (continents, countries, states, cities)
 */

import type { LayerSpecification, DataDrivenPropertyValueSpecification, FilterSpecification, ExpressionSpecification } from "maplibre-gl";
import type { Theme } from "../../theme.js";
import { createAbbreviatedTextField } from "../../baseStyle.js";
import { filters } from "../expressions.js";

// ============================================================================
// HELPER EXPRESSIONS
// ============================================================================

/** State name text field with line breaks for two-word states */
function createStateTextField(): DataDrivenPropertyValueSpecification<string> {
  return [
    "case",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "New York"], "NEW\nYORK",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "New Hampshire"], "NEW\nHAMPSHIRE",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "New Jersey"], "NEW\nJERSEY",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "New Mexico"], "NEW\nMEXICO",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "North Carolina"], "NORTH\nCAROLINA",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "North Dakota"], "NORTH\nDAKOTA",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "South Carolina"], "SOUTH\nCAROLINA",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "South Dakota"], "SOUTH\nDAKOTA",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "West Virginia"], "WEST\nVIRGINIA",
    ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "Rhode Island"], "RHODE\nISLAND",
    ["upcase", ["coalesce", ["get", "name:en"], ["get", "name"]]]
  ];
}

/** Place size expression for cities/towns/villages */
function createPlaceSizeExpression(): DataDrivenPropertyValueSpecification<number> {
  const rankSize = (
    r1: number,
    r2: number,
    r4: number,
    r6: number,
    r8: number,
    r10: number,
    def: number
  ): ExpressionSpecification => [
    "case",
    ["has", "rank"],
    [
      "case",
      ["<=", ["get", "rank"], 1], r1,
      ["<=", ["get", "rank"], 2], r2,
      ["<=", ["get", "rank"], 4], r4,
      ["<=", ["get", "rank"], 6], r6,
      ["<=", ["get", "rank"], 8], r8,
      ["<=", ["get", "rank"], 10], r10,
      def
    ],
    ["match", ["get", "class"], "city", r1 - 0.8, "town", r4, r6]
  ];
  
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    6, rankSize(10.4, 8.8, 7.6, 6.8, 7.2, 6, 5.6),
    10, rankSize(19, 16, 14, 12, 13, 11, 10),
    15, rankSize(22, 19, 16, 15, 16, 13, 12)
  ] as DataDrivenPropertyValueSpecification<number>;
}

/** US states filter */
const usStatesFilter = ["match", ["coalesce", ["get", "name:en"], ["get", "name"]], 
  "Alabama", true, "Alaska", true, "Arizona", true, "Arkansas", true, "California", true, 
  "Colorado", true, "Connecticut", true, "Delaware", true, "Florida", true, "Georgia", true, 
  "Hawaii", true, "Idaho", true, "Illinois", true, "Indiana", true, "Iowa", true, 
  "Kansas", true, "Kentucky", true, "Louisiana", true, "Maine", true, "Maryland", true, 
  "Massachusetts", true, "Michigan", true, "Minnesota", true, "Mississippi", true, "Missouri", true, 
  "Montana", true, "Nebraska", true, "Nevada", true, "New Hampshire", true, "New Jersey", true, 
  "New Mexico", true, "New York", true, "North Carolina", true, "North Dakota", true, "Ohio", true, 
  "Oklahoma", true, "Oregon", true, "Pennsylvania", true, "Rhode Island", true, "South Carolina", true, 
  "South Dakota", true, "Tennessee", true, "Texas", true, "Utah", true, "Vermont", true, 
  "Virginia", true, "Washington", true, "West Virginia", true, "Wisconsin", true, "Wyoming", true, 
  false
];

// ============================================================================
// PLACE LABEL LAYERS
// ============================================================================

export function createPlaceLabelLayers(theme: Theme): LayerSpecification[] {
  const c = theme.colors;
  const placeLabelPaint = { "text-color": c.label.place.color, "text-halo-color": c.label.place.halo, "text-halo-width": 2, "text-halo-blur": 1 };
  const placeLabelPaintThin = { ...placeLabelPaint, "text-halo-width": 1.5 };
  
  // Use theme-configured font for place labels, with fallback to default fonts
  const placeFont = theme.labelFonts?.place ?? theme.labelFonts?.default ?? theme.fonts.regular;
  
  return [
    // Continent labels
    { id: "continent-label", type: "symbol", source: "world_low", "source-layer": "place", minzoom: 0, maxzoom: 6.5, filter: ["all", ["==", ["get", "class"], "continent"], ["<=", ["zoom"], 2.5], ["!=", ["coalesce", ["get", "name:en"], ["get", "name"]], "America"]], layout: { "text-field": ["case", ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "North America"], "NORTH\nAMERICA", ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "South America"], "SOUTH\nAMERICA", ["upcase", ["coalesce", ["get", "name:en"], ["get", "name"]]]], "text-font": placeFont, "text-size": ["interpolate", ["linear"], ["zoom"], 0, 12, 2.5, 16], "text-transform": "none", "text-letter-spacing": 0.1, "text-offset": ["case", ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "North America"], ["literal", [2.0, 4.0]], ["==", ["coalesce", ["get", "name:en"], ["get", "name"]], "South America"], ["literal", [0, -2.0]], ["literal", [0, 0]]] }, paint: { ...placeLabelPaint, "text-opacity": 0.75 } },
    
    // Country labels (world_low)
    { id: "country-label-world", type: "symbol", source: "world_low", "source-layer": "place", minzoom: 0, maxzoom: 6.5, filter: ["all", ["==", ["get", "class"], "country"], [">", ["zoom"], 2.5]], layout: { "text-field": createAbbreviatedTextField(), "text-font": placeFont, "text-size": ["interpolate", ["linear"], ["zoom"], 2.5, 10, 3, 12, 6, 16], "text-transform": "uppercase", "text-letter-spacing": 0.1 }, paint: { ...placeLabelPaint, "text-opacity": 0.75 } },
    
    // Country labels (world_mid)
    { id: "country-label-world-mid", type: "symbol", source: "world_mid", "source-layer": "place", minzoom: 6, filter: ["all", ["==", ["get", "class"], "country"], [">", ["zoom"], 2.5]], layout: { "text-field": createAbbreviatedTextField(), "text-font": placeFont, "text-size": ["interpolate", ["linear"], ["zoom"], 6, 16, 10, 20], "text-transform": "uppercase", "text-letter-spacing": 0.1 }, paint: { ...placeLabelPaint, "text-opacity": 0.75 } },
    
    // Country labels (us_high)
    { id: "country-label", type: "symbol", source: "us_high", "source-layer": "place", minzoom: 6, filter: ["==", ["get", "class"], "country"], layout: { "text-field": createAbbreviatedTextField(), "text-font": placeFont, "text-size": ["interpolate", ["linear"], ["zoom"], 2, 12, 6, 18, 10, 24], "text-transform": "uppercase", "text-letter-spacing": 0.1 }, paint: { ...placeLabelPaint, "text-opacity": 0.75 } },
    
    // State labels (US states filter for world_low)
    { id: "state-label-us-world", type: "symbol", source: "world_low", "source-layer": "place", minzoom: 3.33, maxzoom: 6.5, filter: (["all", ["==", ["get", "class"], "state"], usStatesFilter] as unknown as FilterSpecification), layout: { "text-field": createStateTextField(), "text-font": placeFont, "text-size": ["interpolate", ["linear"], ["zoom"], 3.33, 8, 6, 12], "text-transform": "none", "text-letter-spacing": 0.05 }, paint: { ...placeLabelPaint, "text-opacity": 0.5 } },
    
    // State labels (us_high)
    { id: "state-label-us", type: "symbol", source: "us_high", "source-layer": "place", minzoom: 4, filter: ["==", ["get", "class"], "state"], layout: { "text-field": createStateTextField(), "text-font": placeFont, "text-size": ["interpolate", ["linear"], ["zoom"], 4, 8, 8, 16, 12, 18], "text-transform": "none", "text-letter-spacing": 0.05 }, paint: { ...placeLabelPaint, "text-opacity": 0.5 } },
    
    // City labels - rank 1-2 (world)
    { id: "city-label-world-rank1-2", type: "symbol", source: "world_low", "source-layer": "place", minzoom: 1, maxzoom: 6.5, filter: ["all", ["==", ["get", "class"], "city"], ["<=", ["coalesce", ["get", "rank"], 10], 2]], layout: { "text-field": createAbbreviatedTextField(), "text-font": placeFont, "text-size": ["interpolate", ["linear"], ["zoom"], 1, ["case", ["==", ["coalesce", ["get", "rank"], 1], 1], 10.8, 9], 3, ["case", ["==", ["coalesce", ["get", "rank"], 1], 1], 14.4, 12], 6, ["case", ["==", ["coalesce", ["get", "rank"], 1], 1], 16.8, 14]], "text-transform": "none", "text-letter-spacing": 0.05 }, paint: { ...placeLabelPaintThin, "text-opacity": 0.75 } },
    
    // City labels - rank 1-2 (us_high)
    { id: "city-label-us-rank1-2", type: "symbol", source: "us_high", "source-layer": "place", minzoom: 4, filter: ["all", filters.hasName as FilterSpecification, ["==", ["get", "class"], "city"], ["<=", ["coalesce", ["get", "rank"], 10], 2]] as FilterSpecification, layout: { "text-field": createAbbreviatedTextField(), "text-font": placeFont, "text-size": ["interpolate", ["linear"], ["zoom"], 4, ["case", ["==", ["coalesce", ["get", "rank"], 1], 1], 15, 12], 8, ["case", ["==", ["coalesce", ["get", "rank"], 1], 1], 25, 20], 12, ["case", ["==", ["coalesce", ["get", "rank"], 1], 1], 32, 26]], "text-transform": "none", "text-letter-spacing": 0.05 }, paint: { ...placeLabelPaintThin, "text-opacity": 0.75 } },
    
    // Settlement-level places only (city, town, village, hamlet, locality, suburb). Excludes neighbourhood/quarter.
    // Suburb restricted by rank (<=8) so suburban towns show but neighborhood-level suburb labels do not.
    { id: "city-label-us-all", type: "symbol", source: "us_high", "source-layer": "place", minzoom: 8, filter: ["all", filters.hasName as FilterSpecification, ["match", ["get", "class"], ["city", "town", "village", "hamlet", "locality", "suburb"], true, false], ["case", ["==", ["get", "class"], "suburb"], ["all", ["has", "rank"], ["<=", ["get", "rank"], 8]], true], ["case", ["==", ["get", "class"], "village"], ["case", ["has", "rank"], ["<=", ["get", "rank"], 15], true], true]] as FilterSpecification, layout: { "text-field": createAbbreviatedTextField(), "text-font": placeFont, "text-size": createPlaceSizeExpression(), "text-transform": "none", "text-letter-spacing": 0.05 }, paint: { ...placeLabelPaintThin, "text-opacity": 0.6 } }
  ];
}

