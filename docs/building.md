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
3. Formats the output JSON
4. Writes three files:
   - `style.generated.json` - Formatted MapLibre style
   - `style.json` - Copy of generated file (for compatibility)
   - `map-config.js` - JavaScript configuration for preview

### 2. Build Shields (Optional)

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

The build script uses two configurations:

### Development Config (default)

```typescript
const localConfig = {
  glyphsBaseUrl: "https://data.storypath.studio",
  glyphsPath: "glyphs",
  spriteBaseUrl: "http://localhost:8080",
  dataBaseUrl: "https://data.storypath.studio",
};
```

- Sprites served from local dev server
- Glyphs and data from CDN

### Production Config

```bash
NODE_ENV=production npm run build:styles
```

```typescript
const productionConfig = {
  glyphsBaseUrl: "https://data.storypath.studio",
  glyphsPath: "glyphs",
  spriteBaseUrl: "http://localhost:8080",  // Update for production
  dataBaseUrl: "https://data.storypath.studio",
};
```

For production, update `spriteBaseUrl` to your CDN or hosting URL.

## Generated Files

### style.json

The main MapLibre style file. Contains:

- `version`: MapLibre style spec version (8)
- `sources`: Data sources (PMTiles URLs)
- `sprite`: Sprite sheet URL
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

The build uses `tsx` to run TypeScript directly, no separate compilation needed.

TypeScript configuration is in `tsconfig.json`:

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
