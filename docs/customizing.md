# Customizing Your Map

This guide explains how to customize the My Custom Map Fixed map.

## Color Customization

All colors are defined in `styles/theme.ts`. The theme file exports a `myCustomMapFixedTheme` object with color definitions.

### Background Colors

```typescript
export const myCustomMapFixedTheme = {
  background: "#1a1f2b",      // Map background
  backgroundFill: "#1e2330",  // Land fill color
  // ...
};
```

### Water Colors

```typescript
export const myCustomMapFixedTheme = {
  // ...
  water: "#1e3a5f",           // Ocean/lake color
  waterLabel: "#5a8ab8",      // Water label text
  // ...
};
```

### Road Colors

Roads are defined in the `roads` section with different colors for each class:

```typescript
export const myCustomMapFixedTheme = {
  // ...
  roads: {
    motorway: "#6b8199",      // Interstate/Freeway
    trunk: "#5f7389",         // Major highways
    primary: "#536479",       // Primary roads
    secondary: "#485669",     // Secondary roads
    // ...
  },
};
```

### Label Colors

```typescript
export const myCustomMapFixedTheme = {
  // ...
  labels: {
    country: "#8a95a3",       // Country names
    state: "#7a8593",         // State names
    city: "#6a7583",          // City names
    // ...
  },
};
```

## Map Configuration

Map behavior is controlled by `myCustomMapFixedSettings`:

### Projection

Choose between globe (3D) or mercator (flat) projection:

```typescript
export const myCustomMapFixedSettings = {
  projection: "globe",  // or "mercator"
  // ...
};
```

### Initial View

Set the starting position and zoom:

```typescript
export const myCustomMapFixedSettings = {
  // ...
  view: {
    center: [-98.0, 39.0],  // [longitude, latitude]
    zoom: 4.25,              // Initial zoom level
    pitch: 0,                // Camera tilt (0-60)
    bearing: 0,              // Rotation (0-360)
  },
};
```

### Zoom Levels

Control minimum zoom:

```typescript
export const myCustomMapFixedSettings = {
  // ...
  minZoom: {
    mercator: 0,  // Min zoom for flat projection
    globe: 2,     // Min zoom for globe projection
  },
};
```

## Starfield Customization

The globe projection includes a starfield background. Customize it:

```typescript
export const myCustomMapFixedStarfield = {
  glowColors: {
    inner: "rgba(120, 180, 255, 0.9)",   // Inner glow
    middle: "rgba(100, 150, 255, 0.7)",  // Middle glow
    outer: "rgba(70, 120, 255, 0.4)",    // Outer glow
    fade: "rgba(40, 80, 220, 0)",        // Fade to transparent
  },
  starCount: 200,              // Number of stars
  glowIntensity: 1.0,          // Glow brightness (0-1)
  glowSizeMultiplier: 1.5,     // Glow size
  glowBlurMultiplier: 0.15,    // Blur amount
};
```

## Highway Shield Colors

Customize highway shield colors:

```typescript
export const myCustomMapFixedTheme = {
  // ...
  shields: {
    interstate: {
      upperBackground: "#2a3444",
      lowerBackground: "#1e2530",
      strokeColor: "#4a5a6a",
      strokeWidth: 2,
    },
    usHighway: {
      background: "#1e2530",
      strokeColor: "#4a5a6a",
      strokeWidth: 3,
    },
    stateHighway: {
      background: "#1e2530",
      strokeColor: "#4a5a6a",
      strokeWidth: 2,
    },
  },
};
```

After changing shield colors, rebuild sprites:

```bash
npm run build:shields
```

## Layer Visibility

Control which map features are visible by editing layer definitions in `styles/myCustomMapFixedStyle.ts`.

Common layers you might want to show/hide:

- `landcover` layers - Forests, parks, etc.
- `bathymetry` layers - Ocean depth shading
- `hillshade` - Terrain shading
- `contours` - Elevation contours
- `ice` - Ice/glacier coverage
- `grid` - Latitude/longitude grid

To hide a layer, comment it out or remove it from the layers array.

## Applying Changes

After making any changes to `theme.ts` or style files:

1. **Rebuild styles:**
   ```bash
   npm run build:styles
   ```

2. **Rebuild shields** (if you changed shield colors):
   ```bash
   npm run build:shields
   ```

3. **Refresh browser** to see changes

## Tips

- **Start small**: Change one color at a time and rebuild to see the effect
- **Use contrast**: Ensure labels are readable against backgrounds
- **Test zoom levels**: Some colors work better at different zoom levels
- **Reference the source**: Look at the original `myCustomMapFixedTheme` for inspiration

## Advanced Customization

For advanced customization (adding/removing layers, changing data sources, etc.), you'll need to edit:

- `styles/myCustomMapFixedStyle.ts` - Main style builder
- `shared/styles/layers/` - Layer definitions

See the [Building Guide](building.md) for more details on the build system.
