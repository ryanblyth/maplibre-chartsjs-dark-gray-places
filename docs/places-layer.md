# Places Data Layer

Interactive places (incorporated cities) data layer with click popups showing demographic attributes.

## Overview

The places layer displays boundaries of incorporated places (cities, towns, villages) with:
- Semi-transparent fills colored by theme
- Data-driven opacity based on population
- Interactive click popups showing all attribute data
- Hover cursor styling
- Automatic state data pre-loading

## Quick Start

### 1. Enable Places Layer

The places layer is already enabled in the theme configuration. See `styles/theme.ts`:

```typescript
export const myCustomMapFixedPlaces: ThemePlaces = {
  enabled: true,
  minZoom: 5,
  // ... fill and outline configuration
  interactivity: {
    enabled: true,
    autoDetectStates: true,
    popupMaxHeight: "400px",
  },
};
```

### 2. Build Styles

```bash
npm run build:styles
```

This generates `style.json` with the places source and layers.

### 3. Initialize Interactivity

In this repository, **`preview.html`** loads **`map.js`**, which imports `initializePlacesInteractivity` from `./shared/utils/placesMapSetup.js` (compiled from `placesMapSetup.ts`). Use that file as the reference wiring for the preview.

For a TypeScript/ES Module environment:

```typescript
import { initializePlacesInteractivity } from './shared/utils/placesMapSetup.js';

map.on('load', async () => {
  await initializePlacesInteractivity(map, {
    enableHover: true,
    popupOffset: 10
  });
});
```

See `preview.html` for a complete working example.

## Data Sources

- **Places polygons (map source, TileJSON)**: `https://data.storypath.studio/places/places_cb_2024_500k_z5.json`
- **Attributes**: `https://data.storypath.studio/attrs/places/acs5_2024/attrs_by_state/attrs_places_acs5_2024_${statefp}.json`
- **Manifest**: `https://data.storypath.studio/attrs/places/acs5_2024/manifest.json`

## Architecture

```
Map Initialization
  ↓
Detect Visible States (or use configured list)
  ↓
Pre-load Attribute Data (JSON by state)
  ↓
Update Map Feature States (for data-driven styling)
  ↓
Setup Click Handlers
  ↓
User Clicks Place → Show Popup with All Attributes
```

## API Reference

### `initializePlacesInteractivity(map, options)`

Main initialization function that sets up all places interactivity.

**Parameters:**
- `map`: MapLibre Map instance
- `options`: Configuration object (optional)

**Options:**
```typescript
{
  statesToLoad?: string[];        // Override auto-detection with specific state FIPS codes
  enableHover?: boolean;           // Show pointer cursor on hover (default: true)
  popupOffset?: number;            // Popup offset in pixels (default: 10)
  sourceId?: string;               // Source ID (default: "places-source")
  sourceLayer?: string;            // Source layer name (default: "places")
  layerIds?: string[];             // Layer IDs to make interactive
  onInitComplete?: (states, data) => void;  // Callback after initialization
  onPlaceClick?: (geoid, attrs) => void;    // Callback on place click
}
```

**Returns:** `Promise<void>`

**Example:**
```typescript
await initializePlacesInteractivity(map, {
  enableHover: true,
  popupOffset: 10,
  onInitComplete: (states, data) => {
    console.log(`Loaded ${states.length} states`);
    console.log(`Total places: ${Object.keys(data).length}`);
  },
  onPlaceClick: (geoid, attrs) => {
    console.log(`Clicked: ${geoid}`, attrs);
  }
});
```

### `loadPlacesAttributesByState(statefp)`

Load attribute data for a single state.

**Parameters:**
- `statefp`: Two-digit state FIPS code (e.g., "06" for California)

**Returns:** `Promise<PlacesAttributeData>`

**Example:**
```typescript
import { loadPlacesAttributesByState } from './shared/utils/placesData.js';

const data = await loadPlacesAttributesByState("06");
console.log(data["0644000"]); // Los Angeles attributes
```

### `loadPlacesAttributesByStates(statefps)`

Load attribute data for multiple states.

**Parameters:**
- `statefps`: Array of two-digit state FIPS codes

**Returns:** `Promise<PlacesAttributeData>`

### `getVisibleStates(map)`

Detect which states are visible in the current viewport.

**Parameters:**
- `map`: MapLibre Map instance

**Returns:** `string[]` - Array of state FIPS codes

### `updateMapFeatureStates(map, data, sourceId?, sourceLayer?)`

Update map feature states with attribute data for data-driven styling.

**Parameters:**
- `map`: MapLibre Map instance
- `data`: Places attribute data
- `sourceId`: Source ID (optional, default: "places-source")
- `sourceLayer`: Source layer (optional, default: "places")

## Styling

### Low-zoom points vs polygons

- Low-zoom points are drawn from `places-low-source` and fade out around z6.5, while polygons fade in.
- Theme toggles:
  - `places.pointsEnabled` / `places.polygonsEnabled`
- Point styling (supports single value, stop array, or named-stop object like `{ z0: 1, z6_5: 3 }`):
  - `places.points.radius`
  - `places.points.strokeWidth`
  - `places.points.strokeColor`
  - `places.points.opacity` (literal opacity stops; no density multiplier applied)
- Polygon styling:
  - `places.minZoom` (polygons start at this zoom; default 5)
  - Polygons crossfade in from z5–6.5; outlines stay visible with a low start opacity.

### Popup Styling

The popup uses dark theme styling that matches the map. Customize in your HTML:

```css
.maplibregl-popup-content {
  background: #2a2a2a;
  color: #e0e0e0;
  max-height: 400px;
  overflow-y: auto;
}

.places-popup-title {
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
}

.places-popup-attrs {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
}
```

### Place label halo width

- Place label halos use fixed widths set in `shared/styles/layers/labels/place.ts` (`text-halo-width` 2px and 1.5px variants). These widths are not theme-configurable; change them in that layer file if you need different halo sizes.

### Data-Driven Fill Opacity

Places with higher populations get increased opacity:

```typescript
// In places.ts layer factory
"fill-opacity": [
  "+",
  0.15,  // Base opacity from theme
  [
    "case",
    ["!=", ["feature-state", "pop_total"], null],
    [
      "interpolate", ["linear"], ["feature-state", "pop_total"],
      0, 0,           // No boost for 0 population
      10000, 0.05,    // Small boost for 10k+
      50000, 0.1,     // Medium boost for 50k+
      100000, 0.15,   // Larger boost for 100k+
      500000, 0.2     // Max boost for 500k+
    ],
    0
  ]
]
```

## Customization

### Theme Configuration

Edit `styles/theme.ts`:

```typescript
export const myCustomMapFixedPlaces: ThemePlaces = {
  enabled: true,
  minZoom: 5,
  fill: {
    color: "#6a7588",  // Change fill color
    opacity: 0.15,     // Change base opacity
  },
  outline: {
    color: "#8a9598",  // Change outline color
    width: { z5: 0.5, z10: 1.0, z15: 1.5 },
    opacity: 0.6,
  },
  interactivity: {
    enabled: true,
    autoDetectStates: true,
    popupMaxHeight: "400px",
  },
};
```

### Popup label/attribute configuration

Control labels, visibility, and ordering with `popupAttributeConfig` when initializing interactivity. Keys are attribute names (snake_case).

- `label`: override display text
- `hidden`: set `true` to omit the attribute
- `order`: lower numbers render first; falls back to default priority when unset

```typescript
await initializePlacesInteractivity(map, {
  popupAttributeConfig: {
    pop_total: { label: "Population", order: 1 },
    median_hh_income: { label: "Median Household Income", order: 2 },
    pct_bach_plus: { label: "% Bachelor's or Higher", order: 5 },
    pct_carpool: { hidden: true } // remove from popup
  }
});
```

If you call `setupPlacesClickHandler` directly, pass the same config as `popupAttributeConfig`.

### Pre-load Specific States

Instead of auto-detection:

```typescript
await initializePlacesInteractivity(map, {
  statesToLoad: ["06", "36", "48"],  // CA, NY, TX only
});
```

### Custom Popup Content

Use the lower-level functions for custom popups:

```typescript
import { 
  loadPlacesAttributesByState,
  updateMapFeatureStates 
} from './shared/utils/placesData.js';
import { setupPlacesClickHandler } from './shared/utils/placesPopup.js';

const data = await loadPlacesAttributesByState("06");
updateMapFeatureStates(map, data);

// Custom click handler
setupPlacesClickHandler(map, data, {
  onClickCallback: (geoid, attrs) => {
    // Your custom popup logic here
    console.log(geoid, attrs);
  }
});
```

## State FIPS Codes

Common state FIPS codes:

- `01` - Alabama
- `06` - California
- `12` - Florida
- `17` - Illinois
- `36` - New York
- `42` - Pennsylvania
- `48` - Texas

See `shared/utils/placesData.ts` for the complete list.

## Attribute Data Format

The JSON files contain demographic data keyed by 7-digit GEOID:

```json
{
  "0100124": {
    "name": "Abbeville",
    "state_name": "Alabama",
    "pop_total": 2688,
    "median_hh_income": 31250,
    "median_age": 42.5,
    ...
  }
}
```

Common attributes:
- `pop_total` - Total population
- `median_hh_income` - Median household income
- `median_age` - Median age
- `name` - Place name
- `state_name` - State name

## Performance Considerations

- **Initial Load**: Pre-loads visible states (typically 5-10 states = 5-10 KB total)
- **Caching**: Loaded data is cached to avoid redundant requests
- **Feature States**: Uses MapLibre feature states for efficient data-driven styling
- **Incremental Loading**: Can load additional states as user pans

## Troubleshooting

### No popups appearing

1. Check console for errors
2. Ensure `npm run build:styles` has been run
3. Verify places layer is enabled in theme
4. Check that attribute data is loading (see Network tab)

### Popups show "No data available"

- The state's attribute data hasn't been loaded yet
- Check visible states with `getVisibleStates(map)`
- Manually load the state: `await loadPlacesAttributesByState("06")`

### TypeScript errors

- Run `npm run build:styles` to regenerate types
- Check that all imports are correct
- The theme type system may need TypeScript language server restart

## Examples

### Example 1: Basic Setup

```html
<script type="module">
  import { initializePlacesInteractivity } from './shared/utils/placesMapSetup.js';
  
  map.on('load', async () => {
    await initializePlacesInteractivity(map);
  });
</script>
```

### Example 2: Custom State List

```typescript
// Only load data for West Coast states
await initializePlacesInteractivity(map, {
  statesToLoad: ["06", "41", "53"],  // CA, OR, WA
  onInitComplete: (states, data) => {
    console.log(`Loaded ${Object.keys(data).length} places`);
  }
});
```

### Example 3: Dynamic Loading

```typescript
// Load additional states as user pans
map.on('moveend', async () => {
  const visibleStates = getVisibleStates(map);
  const newStates = visibleStates.filter(s => !isCached(s));
  
  if (newStates.length > 0) {
    await loadAdditionalStates(map, newStates);
  }
});
```

## Related Files

- `shared/styles/layers/places.ts` - Layer definitions
- `shared/styles/theme.ts` - ThemePlaces interface
- `shared/utils/placesData.ts` - Data loading utilities
- `shared/utils/placesPopup.ts` - Popup formatting and display
- `shared/utils/placesMapSetup.ts` - High-level initialization
- `styles/theme.ts` - Theme configuration
- `preview.html` - Working example

## Search Fly-To: Static Centroids

When a user selects a place from the search panel, the map animates to that
place at zoom 9.  Obtaining the target coordinates requires a lookup — the
search index only carries GEOID, name, and state, not coordinates.

### Why a static centroids file is needed

The original implementation tried to resolve coordinates at runtime by querying
MapLibre's in-memory tile data (`querySourceFeatures` on the `places-low-source`
point tiles and `places-source` polygon tiles).  This failed reliably because:

1. **HTTP/2 connection overload.**  The PMTiles archives are served from
   `data.storypath.studio` over a single HTTP/2 connection.  A large camera
   animation (e.g. z4.25 → z9 across the continent) triggers dozens of
   simultaneous tile requests for multiple sources (base map, labels, places
   polygons, places points).  The CDN resets or closes HTTP/2 streams when the
   concurrent load is too high, producing `ERR_HTTP2_PROTOCOL_ERROR` and
   `ERR_CONNECTION_CLOSED` errors in the browser.

2. **Tiles requested during animation are throwaway.**  MapLibre cancels
   in-flight tile requests as the viewport changes each frame.  This is normal,
   but the burst of requests still saturates the HTTP/2 connection, causing
   collateral failures on the tiles needed for the *final* destination.

3. **MapLibre does not retry failed tiles.**  Once a tile fetch fails, the tile
   stays in an error state.  `querySourceFeatures` returns nothing for that
   tile, and `map.areTilesLoaded()` never returns `true`.  This blocks any
   logic that depends on tile data being available after the animation.

The net effect: the map would animate to the *state centroid* (a coarse
fallback) instead of the actual place, then never refine because the tile
queries returned empty results.

### The fix: `data/placeCentroids.js`

A static ES module maps every 7-digit GEOID to `[lng, lat]`:

```js
export const placeCentroidsByGeoid = {
  "0820000": [-104.963379, 39.75788],   // Denver
  "1245000": [-80.222168, 25.780107],   // Miami
  "4819000": [-96.786804, 32.814978],   // Dallas
  // … 32,600+ entries
};
```

This file is imported by `map.js` and used by `getCachedPlaceCoords(geoid)`.
Because it's a regular JS import (not a tile fetch), it's available
immediately — no network requests, no race conditions, no CDN dependency.

### Regenerating centroids

The file is generated by a Node.js build script that reads the PMTiles point
archive directly:

```bash
node scripts/extract-place-centroids.js
```

The script uses the `pmtiles`, `@mapbox/vector-tile`, and `pbf` packages
(dev dependencies) to:

1. Open the **binary** PMTiles archive at (TileJSON is not a substitute for this step — the script reads `.pmtiles` bytes):
   `https://data.storypath.studio/pmtiles/places/places_cb_2024_points_acs5_2024_density_z0.pmtiles`
2. Fetch tiles at z0–z5 (21 tiles total — fast, ~7 seconds)
3. Decode vector tile features and extract GEOID + coordinates
4. Write `data/placeCentroids.js` as a sorted ES module export

Re-run the script whenever the places PMTiles source is updated with new
place boundaries or centroids.

### Known issue: PMTiles tile loading errors during animation

The `ERR_HTTP2_PROTOCOL_ERROR` / `ERR_CONNECTION_CLOSED` errors on
`data.storypath.studio` are **not an application bug**.  They are caused by the
CDN or reverse proxy dropping HTTP/2 streams under high concurrent load.

**Impact:** After a search fly-to, some map tiles (base map, labels, place
polygons) may be missing or blank.  The map is centered correctly (thanks to
the static centroids), but visual tile gaps can appear until the user pans or
zooms to trigger fresh tile requests.

**Potential mitigations (server-side):**

- Increase `http2_max_concurrent_streams` on the origin/proxy
- Place a CDN (e.g. Cloudflare) in front of the PMTiles origin with better
  HTTP/2 stream handling
- Split PMTiles archives across multiple origins to distribute connection load

**Potential mitigations (client-side):**

- Add a retry wrapper around the PMTiles fetch adapter so failed tiles are
  re-requested after a short backoff
- After animation completes, call `map.triggerRepaint()` or briefly adjust
  zoom to prompt MapLibre to re-request failed tiles
- Hide non-essential tile layers (e.g. world labels) during long camera
  animations to reduce the request burst

## Related Files

- `data/placeCentroids.js` - Static GEOID → [lng, lat] lookup (generated)
- `scripts/extract-place-centroids.js` - Build script for centroids
- `data/stateCentroids.js` - State-level centroid fallbacks
- `map.js` - `focusMapOnGeoid()`, `getCachedPlaceCoords()`, `flyToPlaceCoords()`
- `shared/styles/layers/sources.ts` - PMTiles source definitions

## Future Enhancements

- Highlight clicked feature temporarily
- Add loading spinner for on-demand data
- Filter places by attribute values
- Legend showing data ranges
- Chart integration (demographic breakdowns)
- Export place data (CSV, GeoJSON)
- Add PMTiles fetch retry logic to recover from HTTP/2 stream errors
