# My Custom Map Fixed Map

A custom MapLibre basemap created from the dark-gray template. The development preview (`preview.html`) includes a **map plus a charts dock** (Chart.js, place search, census charts) and a **population density legend** (bottom-left, same ramp as place polygons). See [docs/density-legend.md](docs/density-legend.md).

## Quick Start

1. **Install dependencies** (also compiles browser utilities — see Scripts):
   ```bash
   npm install
   ```
   This runs `prepare`, which executes `npm run build:utils` and emits `shared/utils/*.js` from the TypeScript sources.

2. **Start the development server** (from the repository root, where `package.json` and `serve.js` live):
   ```bash
   npm run serve
   ```
   The console prints `Serving files from:` — that path should be this repo root. If `style.json` / `map-config.js` are missing or stale, run step 3 first.

3. **Rebuild the map style** when you change `styles/theme.ts` or need a fresh `style.json`:
   ```bash
   npm run build:styles
   ```

4. **View the preview:**
   Open [http://localhost:8080/preview.html](http://localhost:8080/preview.html) (or the same path on whatever port you set — see Troubleshooting).

**One-shot full build and serve:** `npm run dev` runs `build:utils`, then `build:styles:local`, then `serve`. By default, `npm run build:styles` writes a **relative** `sprite` URL (`sprites/basemap`) so MapLibre loads sprites from the same origin as `style.json` (works for local `serve` and production if you deploy `sprites/` next to `style.json`). `build:styles:local` sets `SPRITE_CDN=http://localhost:8080` for an **absolute** sprite base (optional; use if you prefer explicit localhost URLs).

## Project Structure

```
/
├── styles/              # TypeScript style definitions
│   ├── theme.ts        # Colors, fonts, and map configuration
│   └── myCustomMapFixedStyle.ts  # Main style builder
├── sprites/            # Icon sprite sheets
├── scripts/            # Build scripts
│   ├── build-styles.ts # Generate style.json
│   ├── build-shields.ts # Build highway shields
│   └── extract-place-centroids.js # Generate data/placeCentroids.js from PMTiles
├── shared/             # Shared utilities (layers, expressions, places/*.ts); `placesDensityPalette.js` + `densityLegendControl.js` — [density legend](docs/density-legend.md)
├── charts/             # Chart.js dock modules (preview.html)
├── data/               # Places index, manifest, search helpers, static centroids
├── docs/               # Documentation
├── preview.html        # Development preview page (map + charts dock)
├── style.css           # Preview page styles (linked from preview.html)
├── map.js              # Map bootstrap (source — not generated)
├── charts-dock-panel.js
├── charts-dock-drawer.js
├── charts-dock-resize.js
├── charts-dock-search.js
├── serve.js           # Development server
└── package.json       # Dependencies and scripts
```

## Customization

### Editing Colors and Styles

The main customization file is `styles/theme.ts`. This file contains:

- **Color palette**: Background, water, roads, labels, etc.
- **Map settings**: Projection (globe/mercator), initial view, zoom levels
- **Starfield settings**: Globe glow colors and star configuration
- **Layer visibility**: Which features to show/hide

After editing `theme.ts`, rebuild the styles:

```bash
npm run build:styles
```

See [docs/customizing.md](docs/customizing.md) for detailed customization guide.

### Building Styles

The build system converts TypeScript style sources into MapLibre-compatible JSON:

```bash
npm run build:styles
```

This generates:

- `style.json` - Main style file (used by the map)
- `style.generated.json` - Same content, formatted output
- `map-config.js` - Map initialization config

See [docs/building.md](docs/building.md) for build system details.

### Highway Shields

To customize highway shield colors and rebuild sprites:

```bash
npm run build:shields
```

Edit shield colors in `styles/theme.ts` under the `shields` section.

## Development Workflow

1. **Edit** `styles/theme.ts` to customize colors and settings
2. **Build** with `npm run build:styles`
3. **Refresh** browser to see changes
4. **Repeat** until satisfied

Tip: Keep the development server running and just rebuild styles as needed.

## Deployment

This map is designed to work with Cloudflare Pages or any static hosting.

### Assets Strategy

- **Local files**: Sprites (bundled in `sprites/`), preview HTML/JS modules, charts dock
- **CDN files**:
  - Glyphs (fonts): `https://assets.storypath.studio/glyphs/` (override with `GLYPHS_CDN` / `ASSETS_BASE_URL` when building)
  - Map sprites (icons): `style.json` `sprite` is **`sprites/basemap` by default** (relative path in JSON; `map.js` resolves it to an absolute URL for MapLibre). Deploy the `sprites/` folder beside `style.json`. For sprites on another host or path, build with **`SPRITE_CDN`** set to that base URL (absolute `sprite` in `style.json`).
  - Starfield script: `https://assets.storypath.studio/js/maplibre-gl-starfield.js`
  - PMTiles / TileJSON: External URLs in `style.json` (default `https://data.storypath.studio`)
  - Census places attributes, manifest, search index: `https://assets.storypath.studio/` (see `shared/utils/placesData.ts`, `data/dockDataConfig.js`)
  - Preview import map: Chart.js and Fuse load from `https://esm.sh/` (see [preview.html](preview.html))

### Using in Production

1. Build for production as needed: `NODE_ENV=production npm run build:styles` (and ensure `shared/utils/*.js` exist — run `npm run build:utils` or rely on `npm install` / CI).
2. Deploy the static set described in [docs/deploying.md](docs/deploying.md), including at minimum for the full preview: `preview.html`, `style.css`, `map.js`, `map-config.js`, `style.json`, `sprites/`, `charts/`, `data/`, `charts-dock-panel.js`, `charts-dock-drawer.js`, `charts-dock-resize.js`, `charts-dock-search.js`, and `shared/utils/*.js`.

See [docs/deploying.md](docs/deploying.md) for detailed deployment guide.

## Documentation

- [Customizing the Map](docs/customizing.md) - How to edit colors, layers, and settings
- [Build System](docs/building.md) - Understanding the build process
- [Deployment](docs/deploying.md) - Deploying to production
- [Places layer](docs/places-layer.md) - Places interactivity and popups

## Scripts

- `prepare` (runs on `npm install`) - `npm run build:utils` — compile `shared/utils/*.ts` to `.js`
- `npm run build:utils` - TypeScript compile for browser utilities only
- `npm run build:styles` - Build map style (default **relative** `sprite`: `sprites/basemap`; glyphs/data still use CDN defaults unless overridden)
- `npm run build:styles:local` - Same as `build:styles` but sets `SPRITE_CDN=http://localhost:8080` for an **absolute** sprite URL
- `npm run verify:tilejson` - Fetch TileJSONs from `DATA_CDN` and print `vector_layers` (CDN / Worker check)
- `npm run build:shields` - Rebuild highway shield sprites
- `node scripts/extract-place-centroids.js` - Regenerate `data/placeCentroids.js` from the places PMTiles point archive (run when place data changes)
- `npm run build` - `build:utils` then `build:styles`
- `npm run serve` - Start development server (default port 8080, override with `PORT`)
- `npm run dev` - `build:utils` + `build:styles:local` + `serve`

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## External Assets (CDN)

This map uses external CDN assets to reduce bundle size:

- **Glyphs** (fonts): Loaded from `https://assets.storypath.studio/glyphs/` (see `style.json`)
- **Sprites** (icons): Resolved from the `sprite` field in `style.json` (default relative path `sprites/basemap` next to `style.json`, or absolute if built with `SPRITE_CDN`)
- **Starfield**: Preview loads [`vendor/maplibre-gl-starfield.js`](vendor/maplibre-gl-starfield.js) (vendored; exposes `globalThis.MapLibreStarryBackground` for ES modules)
- **PMTiles / TileJSON**: Map data from URLs in `style.json` (default host `data.storypath.studio`)
- **Preview**: MapLibre and PMTiles from `unpkg.com`; glyphs and census JSON from `assets.storypath.studio`; sprites from the same origin as `style.json` when `sprite` is relative (default), or from `SPRITE_CDN` when built with `build:styles:local`; Chart.js and Fuse from `esm.sh` per `preview.html` import map

These are loaded on-demand and cached by the browser.

## Troubleshooting

**Map not rendering?**

- Check browser console for errors
- Ensure `style.json` exists and matches your build (run `npm run build:styles` after theme edits)
- Run `npm install` or `npm run build:utils` so `shared/utils/*.js` exists
- Verify the development server is running from the **repository root** (check `Serving files from:` in the terminal)

**`EADDRINUSE` / port 8080 already in use?**

- Another process (often an old `node serve.js`) is still bound to 8080. Stop it, or run `PORT=8081 npm run serve` and open `http://localhost:8081/preview.html`.
- Find the listener: `lsof -nP -iTCP:8080 -sTCP:LISTEN`

**Styles not updating?**

- Run `npm run build:styles` after editing `theme.ts`
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

**PMTiles errors (`ERR_HTTP2_PROTOCOL_ERROR`) after search fly-to?**

- This is a CDN/HTTP2 issue, not an app bug. Large camera animations trigger many concurrent tile requests that overwhelm the `data.storypath.studio` HTTP/2 connection. See [docs/places-layer.md](docs/places-layer.md#known-issue-pmtiles-tile-loading-errors-during-animation) for details and mitigations.
- Place centering itself is unaffected — coordinates come from the static `data/placeCentroids.js` module, not from tile queries.

**Missing sprites?**

- Ensure `sprites/` exists and is deployed **next to** `style.json` (default relative `sprite` resolves from the style URL)
- If sprites live on another host, rebuild with `SPRITE_CDN=https://your.cdn.example.com` (no trailing path; base only)

## License

[Your License Here]
