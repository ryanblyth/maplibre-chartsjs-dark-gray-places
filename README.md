# My Custom Map Fixed Map

A custom MapLibre basemap created from the dark-gray template.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the map style:**
   ```bash
   npm run build:styles
   ```

3. **Start the development server:**
   ```bash
   npm run serve
   ```

4. **View the map:**
   Open [http://localhost:8080/preview.html](http://localhost:8080/preview.html)

## Project Structure

```
/
├── styles/              # TypeScript style definitions
│   ├── theme.ts        # Colors, fonts, and map configuration
│   └── myCustomMapFixedStyle.ts  # Main style builder
├── sprites/            # Icon sprite sheets
├── scripts/            # Build scripts
│   ├── build-styles.ts # Generate style.json
│   └── build-shields.ts # Build highway shields
├── shared/             # Shared utilities (layers, expressions)
├── charts/             # Chart.js dock modules (preview.html)
├── data/               # Places index, manifest, search helpers
├── docs/               # Documentation
├── preview.html        # Development preview page (map + charts dock)
├── map.js              # Map bootstrap
├── charts-dock-panel.js
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

The build system converts TypeScript source files into MapLibre-compatible JSON:

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

- **Local files**: Sprites (bundled in `sprites/`)
- **CDN files**: 
  - Glyphs (fonts): `https://data.storypath.studio/glyphs/`
  - Starfield script: `https://data.storypath.studio/js/maplibre-gl-starfield.js`
  - PMTiles data: External URLs in `style.json`

### Using in Production

1. Build the styles: `npm run build:styles`
2. Deploy these files:
   - `style.json`
   - `sprites/` directory
   - `preview.html` (or your custom HTML)
   - `map.js` (if generated)

See [docs/deploying.md](docs/deploying.md) for detailed deployment guide.

## Documentation

- [Customizing the Map](docs/customizing.md) - How to edit colors, layers, and settings
- [Build System](docs/building.md) - Understanding the build process
- [Deployment](docs/deploying.md) - Deploying to production

## Scripts

- `npm run build:styles` - Build map style from TypeScript source
- `npm run build:shields` - Rebuild highway shield sprites
- `npm run serve` - Start development server
- `npm run dev` - Build and serve (convenience command)

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## External Assets (CDN)

This map uses external CDN assets to reduce bundle size:

- **Glyphs** (fonts): Loaded from `https://data.storypath.studio/glyphs/`
- **Starfield**: Loaded from `https://data.storypath.studio/js/maplibre-gl-starfield.js`
- **PMTiles data**: Map data loaded from external URLs

These are loaded on-demand and cached by the browser.

## Troubleshooting

**Map not rendering?**
- Check browser console for errors
- Ensure you've run `npm run build:styles`
- Verify development server is running

**Styles not updating?**
- Run `npm run build:styles` after editing `theme.ts`
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

**Missing sprites?**
- Ensure `sprites/` directory exists
- Check that sprite paths in `style.json` are correct

## License

[Your License Here]
