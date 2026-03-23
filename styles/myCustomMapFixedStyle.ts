/**
 * My Custom Map Fixed Basemap Style
 * 
 * A dark, blue-tinted basemap style for MapLibre GL.
 * 
 * This file is intentionally minimal - all layer logic lives in shared/styles/layers/.
 * To customize colors, fonts, or other visual properties, edit ./theme.ts
 */

import type { StyleSpecification } from "maplibre-gl";
import { createBasemapStyle } from "../shared/styles/layers/index.js";
import { type BaseStyleConfig, defaultConfig } from "../shared/styles/baseStyle.js";
import { myCustomMapFixedTheme } from "./theme.js";

/**
 * Creates the complete My Custom Map Fixed basemap style
 * 
 * @param config - Optional configuration for URLs (glyphs, sprites, data)
 * @returns Complete MapLibre StyleSpecification
 * 
 * @example
 * // Default configuration
 * const style = createMyCustomMapFixedStyle();
 * 
 * @example
 * // Custom data URL
 * const style = createMyCustomMapFixedStyle({ 
 *   dataBaseUrl: "https://my-cdn.com/tiles" 
 * });
 */
export function createMyCustomMapFixedStyle(config: BaseStyleConfig = defaultConfig): StyleSpecification {
  // Use basemap-specific sprite path
  const basemapConfig: BaseStyleConfig = {
    ...config,
    spritePath: 'sprites/basemap',
  };
  return createBasemapStyle(myCustomMapFixedTheme, basemapConfig);
}
