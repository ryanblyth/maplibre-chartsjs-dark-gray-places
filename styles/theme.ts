/**
 * My Custom Map Fixed Basemap Theme
 * 
 * This file contains ALL configurable values for the my-custom-map-fixed basemap.
 * 
 * FILE STRUCTURE:
 * ============================================================================
 * 1. BASEMAP STYLE CONFIGURATIONS
 *    - All basemap styling (colors, widths, opacities, fonts, etc.)
 *    - These can be copied/pasted between themes to reuse basemap styles
 * 
 * 2. DATA OVERLAY CONFIGURATIONS
 *    - Data overlay styling (places layer, etc.)
 *    - These are typically theme-specific and may vary per implementation
 * 
 * 3. COMPLETE THEME ASSEMBLY
 *    - Final theme object that combines all configurations
 * ============================================================================
 * 
 * To create a new basemap, copy the BASEMAP STYLE CONFIGURATIONS section
 * and adjust the values. Then add your own DATA OVERLAY CONFIGURATIONS.
 */

import { 
  fonts, 
  type Theme, 
  type ThemeColors, 
  type ThemeWidths, 
  type ThemeOpacities,
  type ThemePOIs,
  type ThemeSettings,
  type ThemeLabelFonts,
  type ThemePlaces
} from "../shared/styles/index.js";

// ============================================================================
// BASEMAP STYLE CONFIGURATIONS
// ============================================================================
//
// This section contains all basemap styling configurations:
// - Settings, fonts, colors, widths, opacities
// - Basemap layers (roads, water, land, buildings, etc.)
// - Visual effects (hillshade, bathymetry, contours, etc.)
//
// These configurations can be copied/pasted between themes to reuse
// basemap styles. Simply copy everything from this section through
// the AEROWAY CONFIGURATION section.
//
// ============================================================================

// ============================================================================
// SETTINGS
// ============================================================================

export const myCustomMapFixedSettings: ThemeSettings = {
  /** Map projection type - "mercator" for flat map, "globe" for 3D globe */
  projection: "globe",
  
  /** Minimum zoom level - different for globe vs mercator */
  minZoom: {
    mercator: 0,  // Flat map can go to z0
    globe: 2,     // Globe needs higher min zoom for better appearance
  },
  /**
   * When true, road widths scale proportionally to real-world sizes at zoom 15+.
   * Roads will double in pixel width with each zoom level to match map scale.
   * This makes roads proportional to buildings at high zoom levels.
   * 
   * Set to true to enable, false to use fixed pixel widths.
   */
  realWorldScale: true,
  
  /**
   * The zoom level at which real-world scaling begins.
   * Below this zoom, roads use fixed pixel widths.
   */
  realWorldScaleMinZoom: 16,
  
  /**
   * Initial map view configuration.
   * Controls where the map is centered, the zoom level, camera tilt, and rotation when it first loads.
   */
  view: {
    /** Initial center point [longitude, latitude] */
    center: [-98.0, 39.0],
    /** Initial zoom level */
    zoom: 4.25,
    /** Camera tilt angle in degrees (0-60, default 0). 0 = straight down, higher = more tilted */
    pitch: 0,
    /** Rotation angle in degrees (0-360, default 0). 0 = north, 90 = east, 180 = south, 270 = west */
    bearing: 0,
  },
};

// ============================================================================
// LABEL FONTS
// ============================================================================

/**
 * Per-label-type font configuration.
 * 
 * Available fonts (from CDN at https://data.storypath.studio/glyphs/):
 * 
 * Noto Sans (default):
 *   - "Noto Sans Regular"
 *   - "Noto Sans SemiBold"
 *   - "Noto Sans Italic"
 * 
 * Cormorant Garamond:
 *   - "Cormorant Garamond Regular"
 *   - "Cormorant Garamond SemiBold"
 *   - "Cormorant Garamond Italic"
 *   - "Cormorant Garamond Bold"
 *   - "Cormorant Garamond Bold Italic"
 * 
 * IM FELL English:
 *   - "IM FELL English Regular"
 *   - "IM FELL English Italic"
 *   - "IM FELL English SC Regular" (small caps)
 * 
 * Junicode:
 *   - "Junicode Regular"
 *   - "Junicode Bold"
 *   - "Junicode Italic"
 */
export const myCustomMapFixedLabelFonts: ThemeLabelFonts = {
  /** Default font for all labels (fallback when specific label fonts not set) */
  default: ["Noto Sans Regular"],
  
  /** Font for place labels (continents, countries, cities, etc.) */
  place: ["Noto Sans Regular"],
  
  /** Font for road labels */
  road: ["Noto Sans Regular"],
  
  /** Font for water labels (oceans, lakes, rivers) - uses italic by default */
  water: ["Noto Sans Italic"],
  
  /** Font for POI labels */
  poi: ["Noto Sans Regular"],
  
  /** Font for grid labels (latitude/longitude) */
  grid: ["Noto Sans Regular"],
};

// ============================================================================
// COLORS
// ============================================================================

export const myCustomMapFixedColors: ThemeColors = {
  // Background
  background: "#303030",
  
  // Land/terrain - Harmonious monochrome grays based on #212121
  land: {
    wood: "#2e2e2e",      // Slightly darker gray
    grass: "#353535",     // Slightly lighter gray
    scrub: "#3a3a3a",     // Lighter gray
    cropland: "#3b3b3b",   // Lighter gray
    farmland: "#3b3b3b",   // Same as cropland
    rock: "#373737",      // Very slightly lighter gray
    sand: "#3c3c3c",      // Lighter gray
    wetland: "#343434",   // Slightly darker gray
    default: "#303030",   // Neutral gray - default/unknown
  },
  
  // Landuse - Harmonious monochrome grays based on #212121
  landuse: {
    park: "#3a3a3a",        // Lighter gray
    cemetery: "#3a3a3a",    // Lighter gray
    pitch: "#3a3a3a",       // Lighter gray
    stadium: "#3a3a3a",     // Lighter gray
    residential: "#343434", // Slightly lighter gray
    // Additional landuse classes - subtle gray variations
    college: "#3a3a3a",     // Lighter gray
    commercial: "#3a3a3a",  // Lighter gray
    construction: "#343434", // Neutral gray
    dam: "#343434",         // Neutral gray
    farmland: "#3b3b3b",     // Matches land.cropland
    grass: "#353535",       // Matches land.grass
    hospital: "#3a3a3a",    // Lighter gray
    industrial: "#343434",  // Neutral gray
    military: "#2f2f2f",    // Darker gray
    neighbourhood: "#343434", // Neutral gray
    quarry: "#343434",      // Neutral gray
    quarter: "#343434",     // Neutral gray
    railway: "#343434",     // Neutral gray
    retail: "#3a3a3a",      // Lighter gray
    school: "#3a3a3a",      // Lighter gray
    suburb: "#343434",      // Neutral gray
    theme_park: "#3a3a3a",  // Lighter gray
    track: "#3a3a3a",       // Lighter gray
    university: "#3a3a3a",   // Lighter gray
    zoo: "#3a3a3a",         // Lighter gray
    default: "#303030",     // Neutral gray - default
  },
  
  // Water - Harmonious monochrome grays (darker than background)
  water: {
    fill: "#1e1e1e",      // Darker gray
    line: "#2f2f2f",      // Slightly lighter than fill
    labelColor: "#424242", // Lighter gray for labels
    labelHalo: "#2f2f2f",  // Dark halo
    // Water class colors - subtle gray variations
    ocean: "#1e1e1e",      // Base dark gray - ocean (matches fill)
    sea: "#1e1e1e",       // Slightly lighter gray - sea
    lake: "#1e1e1e",      // Slightly lighter gray - lake
    pond: "#1e1e1e",      // Slightly lighter gray - pond
    river: "#1e1e1e",     // Matches line color - river
    canal: "#1e1e1e",     // Same as river - canal
    stream: "#1e1e1e",    // Slightly lighter gray - stream
    ditch: "#1e1e1e",     // Slightly lighter gray - ditch
    drain: "#1e1e1e",     // Same as ditch - drain
    bay: "#1e1e1e",       // Same as sea - bay
    gulf: "#1e1e1e",      // Same as sea - gulf
    reservoir: "#1e1e1e", // Same as lake - reservoir
    default: "#1e1e1e",   // Default water color (matches fill)
  },
  
  // Boundaries - Harmonious monochrome grays (subtle, low-contrast)
  boundary: {
    country: "#9a9a9a",      // Subtle lighter gray
    state: "#6e6e6e",         // Slightly darker gray
  },
  
  // Roads - Harmonious monochrome grays with progressive lightness for hierarchy
  road: {
    motorway: "#5e5e5e",      // Lightest gray for visibility
    trunk: "#595959",         // Slightly darker
    primary: "#545454",       // Progressively darker
    secondary: "#4f4f4f",     // Progressively darker
    tertiary: "#4a4a4a",      // Progressively darker
    residential: "#454545",  // Progressively darker
    service: "#404040",       // Progressively darker
    parkingAisle: "#3d3d3d",  // Darkest road color
    other: "#404040", 
    casing: "#252525",        // Very dark gray for outlines
    
    // Tunnel colors - COMMENTED OUT: tunnels inherit road colors by default
    // Uncomment to override with custom tunnel colors:
    // tunnel: {
    //   motorway: "#364252",
    //   trunk: "#323c4a",
    //   primary: "#2f3947",
    //   secondary: "#2b3441",
    //   tertiary: "#29323e",
    //   residential: "#27303b",
    //   service: "#252d38",
    //   default: "#242b35",
    // },
    
    // Bridge colors - COMMENTED OUT: bridges inherit road colors by default
    // Uncomment to override with custom bridge colors:
    // bridge: {
    //   motorway: "#3f4a5b",
    //   trunk: "#3a4655",
    //   primary: "#374252",
    //   secondary: "#343e4c",
    //   tertiary: "#303a47",
    //   residential: "#2d3542",
    //   default: "#2a3240",
    //   casing: "#0f1520",
    // },
    
    // Tunnel casing color - COMMENTED OUT: uses road casing color by default
    // tunnelCasing: "#0a0e13",
  },
  
  // Paths - Harmonious monochrome gray
  path: "#292929",
  
  // Railway - Harmonious monochrome gray
  railway: "#282828",
  
  // Buildings - Harmonious monochrome grays with height-based variations
  building: {
    fill: "#303030",      // Slightly lighter than background
    outline: "#252525",   // Darker gray for outline
    // Height-based building colors (buildings don't have class property)
    // Colors vary by building height (render_height) - subtle gradient from dark to slightly lighter
    short: "#303030",      // Base gray - short buildings (0-10m)
    medium: "#353535",     // Slightly lighter gray - medium buildings (10-50m)
    tall: "#3a3a3a",       // Lighter gray - tall buildings (50-150m)
    skyscraper: "#3f3f3f", // Lighter gray - skyscrapers (150-300m)
    supertall: "#444444",  // Even lighter gray - supertall buildings (300-600m)
    megatall: "#494949",   // Lightest gray - megatall buildings (600m+)
    default: "#303030",    // Default building color (matches short)
  },
  
  // Labels - Harmonious monochrome grays with good contrast
  label: {
    place: {
      color: "#f7eddf",      // Light gray for good contrast
      halo: "#1a1020",       // Very dark halo (width set in shared/styles/layers/labels/place.ts)
    },
    road: {
      major: { color: "#b1b1b1", opacity: 0.8 },      // Light gray
      secondary: { color: "#b1b1b1", opacity: 0.7 },  // Medium gray
      tertiary: { color: "#b1b1b1", opacity: 0.7 },   // Darker gray
      other: { color: "#b1b1b1", opacity: 0.7 },      // Darker gray
      halo: "#313131",       // Very dark halo
    },
    water: {
      color: "#c1c1c1",      // Medium gray for labels
      halo: "#313131",       // Dark halo matching water fill
    },
    poi: {
      iconColor: "#a1a1a1",           // Medium gray for icons
      iconSize: 0.8,                   // Slightly smaller icons
      textColor: "#a1a1a1",            // Light gray for labels
      textHalo: "#313131",             // Very dark halo for contrast
      textHaloWidth: 1.5,
    },
  },
};

// ============================================================================
// LINE WIDTHS (at different zoom levels)
// ============================================================================

export const myCustomMapFixedWidths: ThemeWidths = {
  // Boundary widths
  boundary: {
    country: { z0: 0.4, z6: 1.2, z10: 2.0, z15: 2.5 },
    state: { z0: 0.2, z6: 0.8, z10: 1.2, z15: 1.5 },
  },
  
  // Water line widths
  water: {
    line: { z0: 0.1, z6: 0.4, z10: 0.8, z15: 1.0 },
  },
  
  // Road widths by class
  road: {
    motorway: { z6: 1, z12: 3, z15: 10 },
    trunk: { z6: 0.8, z12: 2.75, z15: 10 },
    primary: { z6: 0.7, z12: 2, z15: 10 },
    secondary: { z6: 0.6, z12: 1.5, z15: 7.5 },
    tertiary: { z6: 0.5, z12: 1.5, z15: 6 },
    residential: { z6: 0.4, z12: 1, z15: 4 },
    service: { z6: 0.2, z12: 1, z15: 4 },
    default: { z6: 0.4, z12: 1, z15: 4 },
  },
  
  // Road casing widths (slightly larger than road - using same zoom stops)
  // Note: Casing currently uses fixed scaling, not real-world scaling
  roadCasing: {
    motorway: { z6: 1.5, z12: 4, z15: 11 },
    trunk: { z6: 1.2, z12: 3.5, z15: 11 },
    primary: { z6: 1.0, z12: 2.8, z15: 11 },
    secondary: { z6: 0.9, z12: 2.2, z15: 8.5 },
    tertiary: { z6: 0.8, z12: 2.2, z15: 7 },
    residential: { z6: 0.7, z12: 1.8, z15: 5 },
    service: { z6: 0.5, z12: 1.5, z15: 5 },
    default: { z6: 0.7, z12: 1.8, z15: 5 },
  },
  
  // Tunnel widths (legacy - kept for reference)
  tunnel: { z10: 0.4, z12: 1.0, z14: 1.6 },
  tunnelCasing: { z10: 0.5, z12: 1.2, z14: 2.0 },
  
  // Tunnel road class widths - COMMENTED OUT: tunnels inherit road widths by default
  // Uncomment to override with custom tunnel widths:
  // tunnelRoad: {
  //   motorway: { z6: 1, z12: 3, z15: 10 },
  //   trunk: { z6: 0.8, z12: 2.75, z15: 10 },
  //   primary: { z6: 0.7, z12: 2, z15: 10 },
  //   secondary: { z6: 0.6, z12: 1.5, z15: 7.5 },
  //   tertiary: { z6: 0.5, z12: 1.5, z15: 6 },
  //   residential: { z6: 0.4, z12: 1, z15: 4 },
  //   service: { z6: 0.2, z12: 1, z15: 4 },
  //   default: { z6: 0.4, z12: 1, z15: 4 },
  // },
  
  // Bridge widths (legacy - kept for reference)
  bridge: { z10: 0.5, z12: 1.1, z14: 1.8 },
  bridgeCasing: { z10: 0.6, z12: 1.3, z14: 2.2 },
  
  // Bridge road class widths - COMMENTED OUT: bridges inherit road widths by default
  // Uncomment to override with custom bridge widths:
  // bridgeRoad: {
  //   motorway: { z6: 2, z12: 6, z15: 20 },
  //   trunk: { z6: 1.6, z12: 5.5, z15: 20 },
  //   primary: { z6: 1.4, z12: 4, z15: 20 },
  //   secondary: { z6: 1.2, z12: 3, z15: 15 },
  //   tertiary: { z6: 1, z12: 3, z15: 12 },
  //   residential: { z6: 0.8, z12: 2, z15: 8 },
  //   service: { z6: 0.4, z12: 2, z15: 8 },
  //   default: { z6: 0.8, z12: 2, z15: 8 },
  // },
  
  // Path widths
  path: { z12: 0.2, z14: 0.6 },
  
  // Railway widths
  railway: { z10: 0.3, z14: 0.8 },
};

// ============================================================================
// OPACITIES
// ============================================================================

export const myCustomMapFixedOpacities: ThemeOpacities = {
  landcover: 0.6,
  landuse: 0.6,
  building: 0.9,
  
  boundary: {
    country: { z0: 0.25, z3: 0.25, z6: 0.75, z10: 0.8 },
    state: 0.6,
    maritime: 0,  // Hidden by default
  },
  
  tunnel: 0.7,
  
  label: {
    place: 0.9,
    water: 0.9,
    waterway: 0.85,
  },
};

// ============================================================================
// HIGHWAY SHIELDS
// ============================================================================

// To build shield icons and styles, run: npx tsx scripts/build-shields.ts && npm run build:styles

export const myCustomMapFixedShields = {
  /** Whether to show highway shields */
  enabled: true,
  
  /** Global minimum zoom for all shields */
  minZoom: 6,
  
  /** Interstate shields (I-70, I-95, etc.) */
  interstate: {
    enabled: true,
    sprite: "shield-interstate-custom",
    textColor: "#a1a1a1",                 // Light blue-gray text
    minZoom: 6,
    textPadding: [5, 5, 5, 5] as [number, number, number, number],  // [top, right, bottom, left]
    textSize: [6, 9, 14, 13] as [number, number, number, number],  // [minZoom, minSize, maxZoom, maxSize]
    textFont: ["Noto Sans SemiBold"],     // Font family
    // Custom shield appearance - subtle two-tone for dark theme
    upperBackground: "#444444",           // Slightly lighter dark blue
    lowerBackground: "#444444",           // Darker blue background
    strokeColor: "#444444",               // Subtle blue-gray border
    strokeWidth: 2,
  },
  
  /** US Highway shields (US-1, US-66, etc.) */
  usHighway: {
    enabled: true,
    sprite: "shield-ushighway-custom",
    textColor: "#a1a1a1",                 // Light blue-gray text
    minZoom: 7,
    textPadding: [5, 5, 5, 5] as [number, number, number, number],  // [top, right, bottom, left]
    textSize: [6, 9, 14, 13] as [number, number, number, number],  // [minZoom, minSize, maxZoom, maxSize]
    textFont: ["Noto Sans SemiBold"],     // Font family
    // Custom shield appearance - subtle for dark theme
    background: "#444444",                // Dark blue background
    strokeColor: "#444444",               // Subtle blue-gray border
    strokeWidth: 2.5,
  },
  
  /** State Highway shields */
  stateHighway: {
    enabled: true,
    sprite: "shield-state-custom",
    textColor: "#a1a1a1",                 // Light blue-gray text
    minZoom: 8,
    textPadding: [4, 4, 4, 4] as [number, number, number, number],  // [top, right, bottom, left]
    textSize: [8, 8, 14, 12] as [number, number, number, number],  // [minZoom, minSize, maxZoom, maxSize]
    textFont: ["Noto Sans SemiBold"],     // Font family
    // Custom shield appearance - subtle oval for dark theme
    background: "#444444",                // Dark blue background
    strokeColor: "#444444",               // Subtle blue-gray border
    strokeWidth: 1,                       // Border thickness (adjustable - reduce if cutoff occurs)
  },
};

// ============================================================================
// STARFIELD CONFIGURATION
// ============================================================================

export const myCustomMapFixedStarfield = {
  /** Starfield glow colors - monochrome grays for my-custom-map-fixed theme */
  glowColors: {
    inner: "rgba(200, 200, 200, 0.9)",   // Light gray
    middle: "rgba(150, 150, 150, 0.7)",  // Medium gray
    outer: "rgba(100, 100, 100, 0.4)",   // Dark gray
    fade: "rgba(50, 50, 50, 0)"          // Very dark gray
  },
  /** Number of stars in the starfield */
  starCount: 200,
  /** Glow intensity (0.0 to 1.0) */
  glowIntensity: 0.5,
  /** Glow size multiplier relative to globe */
  glowSizeMultiplier: 1.25,
  /** Glow blur multiplier */
  glowBlurMultiplier: 0.1,
};

// ============================================================================
// POI CONFIGURATION
// ============================================================================

export const myCustomMapFixedPOIs: ThemePOIs = {
  /** Whether to show POIs at all */
  enabled: true,
  
  /** Global minimum zoom for all POIs */
  minZoom: 12,
  
  /** Airport POI settings */
  airport: {
    enabled: true,
    minZoom: 12,
  },
  
  /** Airfield POI settings */
  airfield: {
    enabled: true,
    minZoom: 12,
  },
  
  /** Hospital POI settings */
  hospital: {
    enabled: true,
    minZoom: 12,
  },
  
  /** Museum POI settings */
  museum: {
    enabled: true,
    minZoom: 12,
  },
  
  /** Zoo POI settings */
  zoo: {
    enabled: true,
    minZoom: 12,
  },
  
  /** Stadium POI settings */
  stadium: {
    enabled: true,
    minZoom: 12,
  },
  
  /** Park POI settings */
  park: {
    enabled: true,
    minZoom: 12,
  },
  
  /** Railway station POI settings */
  rail: {
    enabled: true,
    minZoom: 12,
  },
  
  /** School/College/University POI settings */
  school: {
    enabled: true,
    minZoom: 12,
  },
};

// ============================================================================
// BATHYMETRY CONFIGURATION
// ============================================================================

export const myCustomMapFixedBathymetry = {
  /** Whether to show bathymetry at all */
  enabled: true,
  
  /** Minimum zoom level to show bathymetry */
  minZoom: 0,
  
  /** Maximum zoom level to show bathymetry (fades out after this) */
  maxZoom: 7,
  
  /** Opacity range */
  opacity: {
    min: 0.7,  // Opacity at minZoom
    max: 0.9,  // Opacity at maxZoom
  },
  
  /** Custom colors for each depth level */
  colors: {
    shallow: "#1f1f1f",  // 0m - shallowest (lighter than water)
    shelf: "#1e1e1e",    // 200m - shelf
    slope: "#1e1e1e",    // 1000m - slope
    deep1: "#1d1d1d",    // 2000m - deep1
    deep2: "#1c1c1c",    // 4000m - deep2
    abyss: "#1b1b1b",    // 6000m - abyss
    trench: "#1a1a1a",   // 10000m - trench (deepest)
  },
  
  /** Custom opacity for each depth level */
  depthOpacities: {
    shallow: 0.3,    // 0m - shallowest (most transparent)
    shelf: 0.35,     // 200m
    slope: 0.45,     // 1000m
    deep1: 0.55,     // 2000m
    deep2: 0.7,     // 4000m
    abyss: 0.85,     // 6000m
    trench: 1,    // 10000m - deepest (most opaque)
  },
};

// ============================================================================
// CONTOURS CONFIGURATION
// ============================================================================

export const myCustomMapFixedContours = {
  /** Whether to show contours at all */
  enabled: false,
  
  /** Minimum zoom level to show contours */
  minZoom: 4,
  
  /** Maximum zoom level to show contours (fades out after this) */
  maxZoom: 10,
  
  /** Major contour line styling (800m intervals) */
  major: {
    color: "#4a5568",  // Medium gray
    width: {
      min: 0.5,  // Width at minZoom
      max: 1.5,  // Width at maxZoom
    },
    opacity: 0.6,
    minZoom: 4,  // Major contours start at z4
  },
  
  /** Minor contour line styling (350m intervals) */
  minor: {
    color: "#3a4455",  // Darker gray
    width: {
      min: 0.25,  // Width at minZoom
      max: 0.75,  // Width at maxZoom
    },
    opacity: 0.4,
    minZoom: 6,  // Minor contours start at z6
  },
};

// ============================================================================
// ICE CONFIGURATION
// ============================================================================

export const myCustomMapFixedIce = {
  /** Whether to show ice at all */
  enabled: false,
  
  /** Minimum zoom level to show ice */
  minZoom: 0,
  
  /** Maximum zoom level to show ice (fades out after this) */
  maxZoom: 6,
  
  /** Base opacity range */
  opacity: {
    min: 0.7,  // Opacity at minZoom
    max: 0.9,  // Opacity at maxZoom
  },
  
  /** Glaciated areas (glaciers, ice caps) */
  glaciated: {
    color: "#e8f4f8",  // Light blue-white
    opacity: 0.9,
  },
  
  /** Ice shelves */
  iceShelves: {
    color: "#d0e8f0",  // Slightly darker blue-white
    opacity: 0.9,
  },
  
  /** Ice edge (outline) - set to null or enabled: false to disable */
  iceEdge: {
    enabled: false,  // Outline of ice shelves (Antarctica only)
    color: "#a0c8d8",  // Medium blue-gray (matches original design)
    width: 1.0,  // Increased from 0.5 for better visibility
    opacity: 0.8,  // Increased from 0.6 for better visibility
  },
};

// ============================================================================
// HILLSHADE CONFIGURATION
// ============================================================================

export const myCustomMapFixedHillshade = {
  /** Whether to show hillshade at all */
  enabled: true,
  
  /** Minimum zoom level to show hillshade */
  minZoom: 0,
  
  /** Maximum zoom level to show hillshade (fades out after this) */
  maxZoom: 12,
  
  /** Base opacity for hillshade (0.0 to 1.0) */
  opacity: 0.25,
  
  /** Illumination direction (0-360 degrees, where 0 is north, 90 is east) */
  illuminationDirection: 335,  // Northwest (typical for natural lighting)
  
  /** Illumination anchor - "map" (fixed to map) or "viewport" (fixed to viewport) */
  illuminationAnchor: "viewport" as const,
  
  /** Exaggeration factor for terrain relief (0.0 to 1.0, higher = more dramatic) */
  exaggeration: 0.25,
  
  /** Shadow color (darker areas) */
  shadowColor: "#252525",
  
  /** Highlight color (lighter areas) */
  highlightColor: "#303030",
  
  /** Accent color (mid-tones) */
  accentColor: "#252525",
};

// ============================================================================
// GRID CONFIGURATION
// ============================================================================

export const myCustomMapFixedGrid = {
  /** Whether to show grid lines at all */
  enabled: false,
  
  /** Minimum zoom level to show grid lines */
  minZoom: 0,
  
  /** Maximum zoom level to show grid lines (fades out after this) */
  maxZoom: 10,
  
  /** Latitude lines (horizontal) styling */
  latitude: {
    color: "#6b7280",  // Lighter gray for better visibility
    width: {
      min: 1.0,  // Width at minZoom (increased for visibility)
      max: 1.5,  // Width at maxZoom
    },
    opacity: 0.6,  // Increased opacity for better visibility
    interval: 10,  // Lines every 10 degrees
    label: {
      enabled: false,  // Enable labels for latitude lines
      color: "#9ca3af",  // Light gray for labels
      size: {
        min: 10,  // Size at minZoom
        max: 12,  // Size at maxZoom
      },
      opacity: 0.8,
      minZoom: 2,  // Show labels starting at zoom 2
    },
  },
  
  /** Longitude lines (vertical) styling */
  longitude: {
    color: "#6b7280",  // Lighter gray for better visibility
    width: {
      min: 1.0,  // Width at minZoom (increased for visibility)
      max: 1.5,  // Width at maxZoom
    },
    opacity: 0.6,  // Increased opacity for better visibility
    interval: 10,  // Lines every 10 degrees
    label: {
      enabled: false,  // Enable labels for longitude lines
      color: "#9ca3af",  // Light gray for labels
      size: {
        min: 10,  // Size at minZoom
        max: 12,  // Size at maxZoom
      },
      opacity: 0.8,
      minZoom: 2,  // Show labels starting at zoom 2
    },
  },
};

// ============================================================================
// BOUNDARY CONFIGURATION
// ============================================================================

export const myCustomMapFixedBoundary = {
  /** Whether to show country boundaries */
  country: true,  // Set to false to hide country boundaries
  /** Whether to show state boundaries */
  state: true,  // Set to false to hide state boundaries
  /** Whether to show maritime boundaries */
  maritime: false,  // Set to false to hide maritime boundaries
  /** Whether to hide boundaries over water areas (only show on land) */
  hideOverWater: true,  // Set to true to hide boundaries over water
};

// ============================================================================
// BUILDING CONFIGURATION
// ============================================================================

export const myCustomMapFixedBuildings = {
  /** Whether to show buildings at all */
  enabled: true,  // Set to false to hide all buildings
  /** Minimum zoom level to show buildings */
  minZoom: 13,  // Buildings start appearing at zoom 13 (PMTiles data availability)
  /** Maximum zoom level to show buildings (fades out after this) */
  maxZoom: undefined,  // No maximum zoom (buildings show at all zoom levels)
  /** Zoom level where height-based colors start (before this, uses default color) */
  heightColorsMinZoom: 14,  // Height-based colors start at zoom 14 (height data available from z14+), default color before that
};

// ============================================================================
// LAND CONFIGURATION
// ============================================================================

export const myCustomMapFixedLand = {
  /** 
   * Whether to make all landcover layers transparent (sets opacity to 0, layers still exist but are invisible).
   * Uses transparency instead of removing layers to allow runtime toggling via map.setPaintProperty().
   * Note: Removing layers would be more efficient (no tiles loaded, no processing), but transparency
   * enables dynamic control without rebuilding the style.
   */
  transparent: false,  // Set to true to make all landcover transparent (opacity 0)
  /** Whether to use a single override color for all landcover types */
  useOverrideColor: false,  // Set to true to use overrideColor for all landcover types
  /** Override color to use for all landcover types when useOverrideColor is true */
  overrideColor: "#0f141b",  // Default landcover color - used when useOverrideColor is true (matches land.default)
};

// ============================================================================
// LANDUSE CONFIGURATION
// ============================================================================

export const myCustomMapFixedLanduse = {
  /** 
   * Whether to make all landuse layers transparent (sets opacity to 0, layers still exist but are invisible).
   * Uses transparency instead of removing layers to allow runtime toggling via map.setPaintProperty().
   * Note: Removing layers would be more efficient (no tiles loaded, no processing), but transparency
   * enables dynamic control without rebuilding the style.
   */
  transparent: false,  // Set to true to make all landuse transparent (opacity 0)
  /** Whether to use a single override color for all landuse types */
  useOverrideColor: false,  // Set to true to use overrideColor for all landuse types
  /** Override color to use for all landuse types when useOverrideColor is true */
  overrideColor: "#0e131a",  // Default landuse color - used when useOverrideColor is true (matches landuse.default)
};

// ============================================================================
// WATER CONFIGURATION
// ============================================================================

export const myCustomMapFixedWater = {
  /** 
   * Whether to make all water fill layers transparent (sets opacity to 0, layers still exist but are invisible).
   * Uses transparency instead of removing layers to allow runtime toggling via map.setPaintProperty().
   * Note: Removing layers would be more efficient (no tiles loaded, no processing), but transparency
   * enables dynamic control without rebuilding the style.
   */
  transparent: false,  // Set to true to make all water fills transparent (opacity 0)
  /** 
   * Whether to make all waterway (line) layers transparent (sets opacity to 0, layers still exist but are invisible).
   * Uses transparency instead of removing layers to allow runtime toggling via map.setPaintProperty().
   * Note: Removing layers would be more efficient (no tiles loaded, no processing), but transparency
   * enables dynamic control without rebuilding the style.
   */
  transparentWaterway: false,  // Set to true to make all waterways transparent (opacity 0)
  /** Whether to use a single override color for all water fill types */
  useOverrideColor: false,  // Set to true to use overrideColor for all water fill types
  /** Override color to use for all water fill types when useOverrideColor is true */
  overrideColor: "#0a2846",  // Default water fill color - used when useOverrideColor is true (matches water.fill)
  /** Whether to use a single override color for all waterway (line) types */
  useOverrideColorWaterway: false,  // Set to true to use overrideColorWaterway for all waterway types
  /** Override color to use for all waterway types when useOverrideColorWaterway is true */
  overrideColorWaterway: "#103457",  // Default waterway line color - used when useOverrideColorWaterway is true (matches water.line)
};

// ============================================================================
// AEROWAY CONFIGURATION
// ============================================================================

export const myCustomMapFixedAeroway = {
  /** Whether to show aeroway features at all */
  enabled: false,
  
  /** Runway line styling */
  runway: {
    color: "#4a5568",        // Medium gray for runways
    width: 0.5,              // Thin lines
    opacity: 0.8,
    majorLength: 2500,       // Minimum length (meters) for major runways shown at z6-7
  },
  
  /** Apron polygon styling */
  apron: {
    fillColor: "#4a5568",    // Dark gray fill
    fillOpacity: 0.3,         // Thin fill (semi-transparent)
    outlineColor: "#5a6578",  // Medium gray outline
    outlineWidth: 0.3,        // Thin outline
  },
  
  /** Taxiway line styling */
  taxiway: {
    color: "#6a7588",        // Slightly lighter gray than runways
    width: 0.4,              // Slightly thinner than runways
    opacity: 0.7,
  },
  
  /** Helipad point styling */
  helipad: {
    fillColor: "#6a7588",    // Medium gray fill
    fillOpacity: 0.6,
    outlineColor: "#7a8598", // Lighter gray outline
    outlineWidth: 0.3,
    size: 4,                 // Circle radius in pixels
  },
  
  /** Airport label styling */
  label: {
    color: "#b8c8e0",        // Light blue-gray text (matches place labels)
    haloColor: "#0b0f14",    // Dark halo for contrast
    haloWidth: 0,
    opacity: 0.9,
    majorSize: { min: 10, max: 12 },      // Font size for major airports (z8-9)
    detailedSize: { min: 10, max: 12 },   // Font size for detailed labels (z13+)
  },
};

// ============================================================================
// END OF BASEMAP STYLE CONFIGURATIONS
// ============================================================================
//
// Everything above this line is basemap styling and can be copied
// between themes. Everything below is data overlays and theme assembly.
//
// ============================================================================

// ============================================================================
// DATA OVERLAY CONFIGURATIONS
// ============================================================================
//
// This section contains data overlay styling configurations:
// - Places layer (city boundaries, demographic data overlays, etc.)
//
// These configurations are typically theme-specific and may vary
// per implementation. They overlay on top of the basemap.
//
// ============================================================================

// ============================================================================
// PLACES CONFIGURATION
// ============================================================================

export const myCustomMapFixedPlaces: ThemePlaces = {
  /** Whether to show places layer at all */
  enabled: true,
  /** Toggle low-zoom points/dots */
  pointsEnabled: true,
  /** Toggle polygons (fills/lines) */
  polygonsEnabled: true,
  /** Minimum zoom level to show ploygon places */
  minZoom: 5,
  /** Low-zoom places point styling (dots/clusters) */
  points: {
    /** Radius for non-cluster points; named zoom stops { z0: 1, z5: 1, z6_5: 0 } */
    radius: { z0: .25, z3: 1, z6_5: 3 },
    /** Stroke width for points/clusters; named zoom stops { z0: 1, z5: 1, z6_5: 0 } */
    strokeWidth: { z0: 0, z6_5: 0 },
    /** Stroke color for points/clusters */
    strokeColor: "#111822",
    /** Opacity stops for point crossfade { z0: 1, z5: 1, z6_5: 0 } */
    opacity: { z0: 1, z5: 1, z6_5: 0 },
  },
  /** Polygon styling for place boundaries */
  fill: {
    color: "#6a7588",  // Medium gray to match theme (fallback when density data unavailable)
    opacity: 1,      // Base fill opacity (0.0-1.0). Adjust to control transparency.
                        // This is the base opacity; population-based styling can add up to 0.2 more.
                        // To make places more opaque, increase this value (e.g., 0.3, 0.5, or 1.0).
  },
  /** Outline styling for place boundaries */
  outline: {
    color: "#8a9598",  // Lighter gray for borders (fallback when density data unavailable)
    width: { z5: 0.5, z10: 1.0, z15: 1.5 },
    opacity: 0.6,      // Outline opacity (0.0-1.0). Adjust to control boundary line visibility.
                        // To make boundaries more visible, increase (e.g., 0.8 or 1.0).
                        // To make boundaries more subtle, decrease (e.g., 0.3 or 0.4).
  },
  /** Interactivity configuration */
  interactivity: {
    enabled: true,
    autoDetectStates: true,
    popupMaxHeight: "400px",
  },
  /** 
   * Whether to render places boundaries above city/place labels
   * - true (default): Places boundaries render on top of city labels
   * - false: Places boundaries render below city labels (labels visible on top)
   */
  renderAboveLabels: false,
  /** Population density color configuration */
  // { threshold: 100, fillColor: "#efc47e", outlineColor: "#c9a366" } with border color
  // { threshold: 100, fillColor: "#efc47e"} with default border color
  densityColors: {
    defaultFillColor: "#ecda9a",      // Default for < 100
    defaultOutlineColor: "#c4b87a",  // Darker version of default fill
    ranges: [
      { threshold: 100, fillColor: "#f6e6b8"},
      { threshold: 300, fillColor: "#f3d28f"},
      { threshold: 1000, fillColor: "#f0bd6b"},
      { threshold: 2000, fillColor: "#f2a14a"},
      { threshold: 3000, fillColor: "#f08a2a"},
      { threshold: 4000, fillColor: "#ef6800"},
      { threshold: 5000, fillColor: "#f04f1a"},
      { threshold: 7500, fillColor: "#f03a34"},
      { threshold: 10000, fillColor: "#ee2b4e"},
      { threshold: 15000, fillColor: "#e21f64"},
      { threshold: 25000, fillColor: "#c81b78"},
    ],
  },
};

// ============================================================================
// END OF DATA OVERLAY CONFIGURATIONS
// ============================================================================

// ============================================================================
// COMPLETE THEME ASSEMBLY
// ============================================================================
//
// This section combines all basemap and data overlay configurations
// into the final theme object.
//
// ============================================================================

export const myCustomMapFixedTheme: Theme = {
  name: "My Custom Map Fixed Basemap",
  fonts,
  labelFonts: myCustomMapFixedLabelFonts,
  colors: myCustomMapFixedColors,
  widths: myCustomMapFixedWidths,
  opacities: myCustomMapFixedOpacities,
  settings: myCustomMapFixedSettings,
  shields: myCustomMapFixedShields,
  pois: myCustomMapFixedPOIs,
  bathymetry: myCustomMapFixedBathymetry,
  contours: myCustomMapFixedContours,
  ice: myCustomMapFixedIce,
  hillshade: myCustomMapFixedHillshade,
  grid: myCustomMapFixedGrid,
  boundary: myCustomMapFixedBoundary,
  buildings: myCustomMapFixedBuildings,
  land: myCustomMapFixedLand,
  landuse: myCustomMapFixedLanduse,
  water: myCustomMapFixedWater,
  aeroway: myCustomMapFixedAeroway,
  places: myCustomMapFixedPlaces,
  starfield: myCustomMapFixedStarfield,
};
