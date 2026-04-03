# Build System

Understanding how the My Custom Map Fixed map build system works.

## Overview

The map style is built from TypeScript source files, which are then compiled to JSON that MapLibre can read.

**Source files (TypeScript)** → **Build script** → **Generated files (JSON/JS)**

## Build Process

### 1. Build Styles

```bash
npm run build:styles
```

This runs `scripts/build-styles.ts`, which:

1. Imports the style generator function from `styles/myCustomMapFixedStyle.ts`
2. Calls it with configuration (CDN URLs, etc.)
3. **Inlines TileJSON**: fetches each source's `url` endpoint and replaces it with the full TileJSON content (`tiles`, `vector_layers`, `minzoom`, `maxzoom`, etc.), removing the `url` property. This eliminates 8 network round-trips MapLibre would otherwise make at startup to resolve TileJSON before tiles can load.
4. Formats the output JSON
5. Writes three files:
   - `style.generated.json` - Formatted MapLibre style
   - `style.json` - Copy of generated file (for compatibility)
   - `map-config.js` - JavaScript configuration for preview

If any TileJSON fetch fails during the build, the script throws a clear error identifying which URL failed and exits — no broken style is written silently.

### 2. Build Browser Utilities (`shared/utils`)

```bash
npm run build:utils
```

This runs the TypeScript compiler (`tsc --project tsconfig.browser.json`), which compiles **browser-facing** modules under `shared/utils/*.ts` to **`shared/utils/*.js`**. Those `.js` files are imported by `map.js` and `charts-dock-panel.js` at runtime.

- The emitted `.js` files are listed in `.gitignore`; regenerate them after pulling or editing the `.ts` sources.
- **`npm install`** runs the **`prepare`** script, which executes `npm run build:utils`, so a fresh clone gets compiled utilities without an extra step.

For both style JSON and utilities:

```bash
npm run build
```

This runs `build:utils` then `build:styles`.

### 3. Sprite URL: relative (default) vs absolute (`SPRITE_CDN`)

`npm run build:styles` writes **`"sprite": "sprites/basemap"`** (no host) so one `style.json` works on any host. **MapLibre GL JS requires an absolute sprite URL** at runtime; [`map.js`](../map.js) fetches the style, resolves `sprite` against the style JSON URL, then passes the patched spec to the map. Local `npm run serve` and production both load `sprites/basemap@2x.png` (etc.) from the **same origin and path prefix** as `style.json`, as long as you deploy the `sprites/` directory next to `style.json`.

If sprites are hosted elsewhere, set **`SPRITE_CDN`** to the absolute base (no trailing `/sprites`):

```bash
SPRITE_CDN=https://assets.storypath.studio npm run build:styles
```

`npm run build:styles:local` is shorthand for `SPRITE_CDN=http://localhost:8080` (absolute localhost URLs). `npm run dev` still runs `build:styles:local` before `serve`; for relative sprites you can use `npm run build:styles` once, then `npm run serve`.

### 4. Verify TileJSON (CDN / Worker)

```bash
npm run verify:tilejson
```

Fetches each TileJSON under `DATA_CDN` (default `https://data.storypath.studio`) and prints status and `vector_layers` when present. Use this to confirm Worker routing matches the vector schema expected by the style.

### 5. Build Shields (Optional)

```bash
npm run build:shields
```

This runs `scripts/build-shields.ts`, which:

1. Reads shield color configuration from `styles/theme.ts`
2. Generates SVG shields with custom colors
3. Converts SVG to PNG
4. Adds shields to the sprite sheet (`sprites/basemap.png`)
5. Updates sprite metadata (`sprites/basemap.json`)

## Source Files

### styles/theme.ts

Defines all colors, configuration, and theme data:

```typescript
export const myCustomMapFixedTheme = {
  background: "#1a1f2b",
  water: "#1e3a5f",
  // ... all colors
};

export const myCustomMapFixedSettings = {
  projection: "globe",
  view: { center: [-98, 39], zoom: 4.25 },
  // ... map configuration
};

export const myCustomMapFixedStarfield = {
  glowColors: { /* ... */ },
  // ... starfield configuration
};
```

### styles/myCustomMapFixedStyle.ts

The main style builder function:

```typescript
import { createBaseStyle } from "../shared/styles/baseStyle.js";
import { myCustomMapFixedTheme, myCustomMapFixedSettings } from "./theme.js";

export function createMyCustomMapFixedStyle(config: BaseStyleConfig) {
  return createBaseStyle(config, myCustomMapFixedTheme, myCustomMapFixedSettings);
}
```

### shared/styles/

Shared utilities for building styles:

- `baseStyle.ts` - Base style builder
- `layers/` - Layer definition builders
  - `water.ts` - Water bodies
  - `roads.ts` - Road network
  - `labels/` - All label types
  - `background.ts`, `land.ts`, etc.
- `expressions.ts` - MapLibre expression helpers

## Build Configuration

[scripts/build-styles.ts](scripts/build-styles.ts) calls `resolveStyleConfig()`:

- **Default** `ASSETS_BASE_URL`: `https://assets.storypath.studio` — used for `glyphsBaseUrl` (and as `spriteBaseUrl` when building an absolute sprite URL)
- **`GLYPHS_CDN`** — glyph PBF base URL
- **`SPRITE_CDN`** — if **set** (non-empty), `style.sprite` is `${SPRITE_CDN}/sprites/basemap`. If **unset**, `style.sprite` is **`sprites/basemap`** (relative to the style document URL)
- **`DATA_CDN`** — TileJSON / vector tiles (default `https://data.storypath.studio`)

```bash
npm run build:styles
```

See [docs/deploying.md](docs/deploying.md#2-override-cdn-urls-optional) for examples.

## Generated Files

### style.json

The main MapLibre style file. Contains:

- `version`: MapLibre style spec version (8)
- `sources`: Data sources with inlined tile URLs — each source has a `tiles` array and `vector_layers` (for vector sources) baked in at build time. There are no `url` properties pointing at TileJSON endpoints; MapLibre reads the `tiles` array directly.
- `sprite`: Sprite sheet base URL — relative `sprites/basemap` by default, or absolute when `SPRITE_CDN` is set at build time
- `glyphs`: Font glyph URL pattern
- `layers`: Array of layer definitions
- `projection`: Map projection type

### style.generated.json

Same as `style.json`, but clearly marked as generated.

### map-config.js

JavaScript file with map initialization config:

```javascript
window.mapProjection = "globe";
window.mapMinZoom = { mercator: 0, globe: 2 };
window.mapCenter = [-98, 39];
window.mapZoom = 4.25;
// ...
```

Used by `preview.html` to configure the map.

## TypeScript Compilation

**Style and tooling scripts** use **`tsx`** to run TypeScript directly (e.g. `scripts/build-styles.ts`) — no separate compile step for those.

**Browser utilities** under `shared/utils/` use **`tsc`** via `npm run build:utils` and `tsconfig.browser.json` (see [Build Browser Utilities](#2-build-browser-utilitiessharedutils) above).

Root TypeScript configuration is in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    // ...
  }
}
```

## Format JSON

The `scripts/format-json.ts` utility formats the generated JSON:

- Compact simple arrays/objects
- Proper indentation for expressions
- Consistent formatting

This makes the output readable and easier to debug.

## Sprite Building

Sprites are PNG image atlases with JSON metadata:

- `basemap.png` - 1x resolution sprite atlas
- `basemap.json` - 1x sprite metadata
- `basemap@2x.png` - 2x resolution sprite atlas (retina)
- `basemap@2x.json` - 2x sprite metadata

The sprite contains:
- POI icons (from shared assets)
- Highway shields (generated with custom colors)

## Development Workflow

1. Edit `styles/theme.ts`
2. Run `npm run build:styles`
3. Refresh browser
4. See changes immediately

No need to restart the dev server.

## Debugging

### Check generated style.json

Open `style.json` to see the full MapLibre style definition.

### Validate JSON

The build script will error if it generates invalid JSON.

### Check console

The browser console will show MapLibre errors if the style is invalid.

### Test in Maputnik

You can load `style.json` into [Maputnik](https://maputnik.github.io/) for visual editing.

## Advanced: Custom Layers

To add custom layers, edit `styles/myCustomMapFixedStyle.ts`:

```typescript
export function createMyCustomMapFixedStyle(config: BaseStyleConfig) {
  const baseStyle = createBaseStyle(config, myCustomMapFixedTheme, myCustomMapFixedSettings);
  
  // Add custom layer
  baseStyle.layers.push({
    id: "my-custom-layer",
    type: "fill",
    source: "my-source",
    paint: {
      "fill-color": "#ff0000",
    },
  });
  
  return baseStyle;
}
```

## Build Scripts Reference

### scripts/build-styles.ts

Main style builder. Reads TypeScript, generates JSON.

### scripts/build-shields.ts

Shield sprite builder. Reads theme colors, generates PNG sprites.

### scripts/format-json.ts

JSON formatter utility. Formats MapLibre style JSON.

## Troubleshooting

**Build fails with module error:**
- Run `npm install` to ensure dependencies are installed
- Check that all imports in source files are correct

**Generated style doesn't work:**
- Check browser console for MapLibre errors
- Validate `style.json` structure
- Ensure sprite and glyph URLs are accessible

**Shields not appearing:**
- Run `npm run build:shields` to rebuild sprites
- Check that shield colors are defined in `theme.ts`
- Verify sprite files exist in `sprites/` directory
