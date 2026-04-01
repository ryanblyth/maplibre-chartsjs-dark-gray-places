/**
 * Build script for generating static JSON style file
 * 
 * Usage: npm run build:styles
 */

import { writeFileSync, mkdirSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createMyCustomMapFixedStyle } from "../styles/myCustomMapFixedStyle.js";
import type { BaseStyleConfig } from "../shared/styles/baseStyle.js";
import { formatJSON } from "./format-json.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

/** Default CDN for glyphs, sprites, and related static map assets (CORS must allow your origins). */
const DEFAULT_ASSETS_BASE = "https://assets.storypath.studio";

/** Standard TileJSON fields to inline from each source's url endpoint. */
const TILEJSON_FIELDS = [
  "tiles", "vector_layers", "minzoom", "maxzoom",
  "attribution", "bounds", "center", "fillzoom", "scheme", "tilejson",
];

function resolveStyleConfig(): BaseStyleConfig {
  const assetsBase = process.env.ASSETS_BASE_URL || DEFAULT_ASSETS_BASE;
  return {
    glyphsBaseUrl: process.env.GLYPHS_CDN || assetsBase,
    glyphsPath: "glyphs",
    spriteBaseUrl: process.env.SPRITE_CDN || assetsBase,
    spritePath: "sprites/basemap",
    dataBaseUrl: process.env.DATA_CDN || "https://data.storypath.studio",
  };
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
}

/**
 * Generate map-config.js from theme settings
 */
async function generateMapConfig(): Promise<void> {
  try {
    const themeModule = await import("../styles/theme.js");
    const settings = themeModule.myCustomMapFixedSettings;
    const starfield = themeModule.myCustomMapFixedStarfield;
    
    if (!settings) {
      console.log("  ⚠ No settings found, skipping map-config.js");
      return;
    }
    
    const mapConfigPath = join(projectRoot, "map-config.js");
    const projection = settings.projection || "globe";
    
    let minZoomMercator = 0;
    let minZoomGlobe = 2;
    if (settings.minZoom !== undefined) {
      if (typeof settings.minZoom === "number") {
        minZoomMercator = settings.minZoom;
        minZoomGlobe = settings.minZoom;
      } else {
        minZoomMercator = settings.minZoom.mercator ?? 0;
        minZoomGlobe = settings.minZoom.globe ?? 2;
      }
    }
    
    const view = settings.view;
    const center = view?.center || [-98.0, 39.0];
    const zoom = view?.zoom ?? 4.25;
    const pitch = view?.pitch ?? 0;
    const bearing = view?.bearing ?? 0;
    
    let starfieldConfigSection = "";
    if (starfield) {
      const glowColors = starfield.glowColors;
      starfieldConfigSection = `
// Starfield configuration
window.starfieldConfig = {
  glowColors: {
    inner: "${glowColors.inner}",
    middle: "${glowColors.middle}",
    outer: "${glowColors.outer}",
    fade: "${glowColors.fade}"
  },
  starCount: ${starfield.starCount},
  glowIntensity: ${starfield.glowIntensity},
  glowSizeMultiplier: ${starfield.glowSizeMultiplier},
  glowBlurMultiplier: ${starfield.glowBlurMultiplier}
};`;
    }
    
    const mapConfigContent = `/**
 * Map Configuration
 * 
 * Auto-generated from theme.ts settings.
 */

window.mapProjection = "${projection}";
window.mapMinZoom = {
  mercator: ${minZoomMercator},
  globe: ${minZoomGlobe}
};
window.mapCenter = [${center[0]}, ${center[1]}];
window.mapZoom = ${zoom};
window.mapPitch = ${pitch};
window.mapBearing = ${bearing};${starfieldConfigSection}
`;
    
    writeFileSync(mapConfigPath, mapConfigContent, "utf8");
    console.log(`  ✓ Generated map-config.js`);
  } catch (error) {
    console.warn("  ⚠ Could not generate map-config.js:", error instanceof Error ? error.message : error);
  }
}

async function inlineTileJsonSources(style: Record<string, any>): Promise<void> {
  const sources = style.sources as Record<string, any>;
  for (const [name, source] of Object.entries(sources)) {
    if (typeof source.url !== "string") continue;
    const url = source.url as string;
    console.log(`  ↓ Inlining TileJSON for source "${name}": ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`TileJSON fetch failed for source "${name}" (${url}): HTTP ${res.status}`);
    }
    const tileJson = await res.json() as Record<string, unknown>;
    for (const field of TILEJSON_FIELDS) {
      if (field in tileJson) source[field] = tileJson[field];
    }
    delete source.url;
  }
}

async function buildStyle(): Promise<void> {
  console.log("Building my-custom-map-fixed style...\n");
  
  const config = resolveStyleConfig();
  console.log(
    `Using style URLs (override with ASSETS_BASE_URL, GLYPHS_CDN, SPRITE_CDN, DATA_CDN)\n`
  );
  
  try {
    const style = createMyCustomMapFixedStyle(config);
    await inlineTileJsonSources(style);
    const outputPath = join(projectRoot, "style.generated.json");
    const styleJsonPath = join(projectRoot, "style.json");
    
    ensureDir(outputPath);
    const formatted = formatJSON(style);
    writeFileSync(outputPath, formatted + "\n", "utf8");
    console.log("  ✓ Written to style.generated.json");
    
    copyFileSync(outputPath, styleJsonPath);
    console.log("  ✓ Copied to style.json");
    
    await generateMapConfig();
    
    console.log("\n✓ Style built successfully!");
  } catch (error) {
    console.error("  ✗ Failed to build style:", error);
    process.exit(1);
  }
}

buildStyle().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
