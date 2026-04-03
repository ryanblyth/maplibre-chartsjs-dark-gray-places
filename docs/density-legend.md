# Population density legend (preview UI)

The development preview shows a **MapLibre `IControl`** in the bottom-left that explains the place **population density** color ramp: labels, swatches, collapse/expand, and touch swipe-to-dismiss (and swipe-up to open when collapsed).

## Registration

The control is added in [`map.js`](../map.js):

```js
map.addControl(new DensityLegendControl(), "bottom-left");
```

Implementation: [`shared/densityLegendControl.js`](../shared/densityLegendControl.js).

## Single source of truth (colors and thresholds)

Ramp thresholds and fill colors live in [`shared/placesDensityPalette.js`](../shared/placesDensityPalette.js). The same object is imported by:

- [`styles/theme.ts`](../styles/theme.ts) — builds the map `fill-color` step expression for place polygons.
- [`densityLegendControl.js`](../shared/densityLegendControl.js) — builds legend rows and swatch colors.

Change the ramp in **one place** (`placesDensityPalette.js`), then rebuild styles (`npm run build:styles`) so the map and legend stay aligned.

## UI behavior

- **Toggle** — “Hide legend” / “Show legend” collapses or expands the ramp; `aria-controls` targets `#density-legend-panel` on the slide element.
- **Vertical swipe** — Uses [`dock-constants.js`](../dock-constants.js) `TOUCH_SWIPE_GESTURE` (same threshold/velocity idea as [`charts-dock-drawer.js`](../charts-dock-drawer.js), axis is vertical).
- **DOM shape (charts-dock-style)** — Outer [`.density-legend`](../style.css), then [`.density-legend__slide`](../style.css) (swipe `transform` + `max-height` collapse), then [`.density-legend__inner`](../style.css) (padding only), then the toggle as a **sibling** of the slide so the button does not move with the swipe preview.

## Styling and compositing

- **Outer `.density-legend`** uses **`background: transparent`** so only **`.density-legend__slide`** paints the dark fill. Two opaque layers on parent + child can composite badly during `transform` and look like content sliding ahead of the box.
- **`.density-legend__inner`** keeps **`padding: 8px 10px 6px`** through swipe and collapse so content does not jump horizontally. Do not zero inner padding in the collapsed state; clipping comes from the slide’s `max-height` and `overflow`.

Preview styles: [`.density-legend*` in `style.css`](../style.css).

## Touch close: avoid double motion

On a **committed** swipe-to-close, inline `transform` is cleared with **`transition: none`** before applying the collapsed class. Otherwise the stylesheet’s `transform` transition would animate back to `translate3d(0,0,0)` and then `max-height` would run—visible as bounce up, then slide down. See the close `touchend` branch in `densityLegendControl.js`.

## Related docs

- [customizing.md](customizing.md) — general `theme.ts` and preview customization.
- [places-layer.md](places-layer.md) — places layer and density-related tiles (map data, not this control).
