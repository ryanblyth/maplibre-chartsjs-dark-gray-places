/**
 * Shared source definitions for basemaps
 */

import type { SourceSpecification } from "maplibre-gl";
import type { BaseStyleConfig } from "../baseStyle.js";
import type { Theme } from "../theme.js";

/**
 * Creates the standard basemap sources (world_low, world_mid, us_high)
 * These are used by all basemaps that follow the same tile structure.
 * 
 * @param config - Base style configuration
 * @param theme - Theme object (optional, used to check if bathymetry is enabled)
 */
export function createBasemapSources(config: BaseStyleConfig, theme?: Theme): Record<string, SourceSpecification> {
  const sources: Record<string, SourceSpecification> = {
    world_low: {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/world_z0-6.pmtiles`,
      minzoom: 0,
    },
    world_mid: {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/world_z6-10.pmtiles`,
      minzoom: 6,
    },
    us_high: {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/us_z0-15.pmtiles`,
      minzoom: 6,
      maxzoom: 15,
    },
    poi_us: {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/poi_us_z12-15.pmtiles`,
      minzoom: 12,
      maxzoom: 15,
    },
  };
  
  // Only add bathymetry source if enabled in theme
  if (theme?.bathymetry?.enabled) {
    sources["ne-bathy"] = {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/ne_bathy_z0-6.pmtiles`,
      minzoom: 0,
      maxzoom: 6,
    };
  }
  
  // Only add contours source if enabled in theme
  if (theme?.contours?.enabled) {
    sources["world-contours"] = {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/world_contours_z4-10_mj800_mn350_minz6.pmtiles`,
      minzoom: 4,
      maxzoom: 10,
    };
  }
  
  // Only add ice source if enabled in theme
  if (theme?.ice?.enabled) {
    sources["ne-ice"] = {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/ne_ice_z0-6.pmtiles`,
      minzoom: 0,
      maxzoom: 6,
    };
  }
  
  // Only add grid source if enabled in theme
  if (theme?.grid?.enabled) {
    sources["world-grid"] = {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/graticules.pmtiles`,
      minzoom: theme.grid.minZoom ?? 0,
      maxzoom: theme.grid.maxZoom ?? 10,
    };
  }
  
  // Only add hillshade source if enabled in theme
  if (theme?.hillshade?.enabled) {
    sources["world-hillshade"] = {
      type: "raster-dem",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/world_mtn_hillshade.pmtiles`,
      minzoom: theme.hillshade.minZoom ?? 0,
      maxzoom: theme.hillshade.maxZoom,
    };
  }
  
  // Only add aeroway source if enabled in theme
  if (theme?.aeroway?.enabled) {
    sources["aeroway-world"] = {
      type: "vector",
      url: `pmtiles://${config.dataBaseUrl}/pmtiles/aeroway-world.pmtiles`,
      minzoom: 6,
      maxzoom: 15,
    };
  }
  
  // Only add places source if enabled in theme
  if (theme?.places?.enabled) {
    sources["places-low-source"] = {
      type: "vector",
      url: "pmtiles://https://data.storypath.studio/pmtiles/places/places_cb_2024_points_acs5_2024_density_z0.pmtiles",
      minzoom: 0,
      maxzoom: 7,
    };
    sources["places-source"] = {
      type: "vector",
      url: "pmtiles://https://data.storypath.studio/pmtiles/places/places_cb_2024_500k_z5.pmtiles",
      promoteId: "GEOID",
      minzoom: 5,
      // Note: PMTiles files may have internal maxzoom - if features don't appear until z13,
      // the file might only contain features at higher zoom levels despite the filename
    };
  }
  
  return sources;
}

