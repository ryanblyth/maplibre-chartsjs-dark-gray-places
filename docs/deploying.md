# Deploying to Production

Guide for deploying the My Custom Map Fixed map to production.

## Overview

This map is designed to work with static hosting platforms like:

- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages
- Amazon S3 + CloudFront
- Any static file server

## Assets Strategy

The map uses a hybrid approach for assets:

### Local Assets (bundle with your app)

- **Sprites** - `sprites/` directory
  - `basemap.png` and `basemap.json`
  - `basemap@2x.png` and `basemap@2x.json`
  - These must be served from your domain

### External Assets (loaded from CDN)

- **Glyphs** (fonts) - `https://data.storypath.studio/glyphs/`
- **Starfield script** - `https://data.storypath.studio/js/maplibre-gl-starfield.js`
- **PMTiles data** - Map data URLs in `style.json`
- **Preview (`preview.html`)** - MapLibre / PMTiles from `unpkg.com`; Chart.js and Fuse from `https://esm.sh/` (see import map in `preview.html`)
- **Census / places data** - Attribute JSON and places index URLs under `https://data.storypath.studio/` (configured in `shared/utils/placesData.js`, `data/dockDataConfig.js`)

## Deployment Steps

### 1. Build for Production

Install dependencies (this runs `prepare`, which compiles `shared/utils/*.ts` → `.js`), then build styles:

```bash
npm ci
NODE_ENV=production npm run build:styles
```

Or run the full pipeline in one step:

```bash
npm ci
NODE_ENV=production npm run build
```

`npm run build` runs `build:utils` then `build:styles`. This ensures:

- `shared/utils/*.js` exists for browser imports from `map.js` and `charts-dock-panel.js`
- `style.json` - MapLibre style definition
- `map-config.js` - Map initialization config

### 2. Update Sprite URLs (if needed)

If you're hosting sprites on a CDN, update the sprite URL in `scripts/build-styles.ts`:

```typescript
const productionConfig = {
  glyphsBaseUrl: "https://data.storypath.studio",
  glyphsPath: "glyphs",
  spriteBaseUrl: "https://your-cdn.com",  // Your CDN URL
  dataBaseUrl: "https://data.storypath.studio",
};
```

Then rebuild:

```bash
NODE_ENV=production npm run build:styles
```

### 3. Files to Deploy

The repository root is the app root. For the **full preview** (map + charts dock + search), deploy at least:

```
/
├── preview.html
├── map.js                         # Map entry (source, not generated)
├── map-config.js
├── style.json
├── style.generated.json           # optional; not required at runtime if you only reference style.json
├── sprites/
│   ├── basemap.json
│   ├── basemap.png
│   ├── basemap@2x.json
│   └── basemap@2x.png
├── charts-dock-panel.js
├── charts-dock-search.js
├── charts/                        # Chart.js dock modules
├── data/                          # Places index URL, manifest, search helpers
└── shared/utils/
    ├── placesData.js              # Required — emitted by npm run build:utils
    ├── placesMapSetup.js
    ├── placesPopup.js
    └── …                          # other compiled .js peers of .ts sources
```

You do **not** need to deploy TypeScript sources (`shared/utils/*.ts`, `styles/`, `scripts/`) if the compiled `shared/utils/*.js` files are already on the host from your CI build (or committed — see `.gitignore`).

**Do NOT deploy:**

- `node_modules/`
- `styles/`, `scripts/` (source-only for builds)
- `shared/utils/*.ts` (optional to omit if `.js` is present)

**Hosting note:** A build command of **only** `npm run build:styles` does **not** produce `shared/utils/*.js`. Use `npm run build` or run `npm install` / `npm run build:utils` before publish so the browser can load `./shared/utils/placesMapSetup.js` and related modules.

## Platform-Specific Guides

### Cloudflare Pages

1. **Connect your repository** to Cloudflare Pages

2. **Build settings:**
   - Build command: `npm ci && npm run build` (or `npm install && npm run build`)
   - Build output directory: `/` (root)
   - Root directory: `/`

3. **Deploy!**

Your map will be available at `https://your-project.pages.dev`

### Netlify

1. **Connect your repository** to Netlify

2. **Build settings:**
   ```
   Build command: npm ci && npm run build
   Publish directory: /
   ```

3. **Deploy!**

### Vercel

1. **Import your repository** in Vercel

2. **Build settings:**
   ```
   Framework Preset: Other
   Build Command: npm ci && npm run build
   Output Directory: /
   ```

3. **Deploy!**

### GitHub Pages

1. **Build locally:**
   ```bash
   npm install
   npm run build
   ```

2. **Commit files to publish** (adjust to your policy — some artifacts may already be tracked):
   ```bash
   git add style.json style.generated.json map-config.js sprites/ shared/utils/*.js preview.html map.js charts/ data/ charts-dock-panel.js charts-dock-search.js
   git commit -m "Build for production"
   ```

3. **Push to GitHub and enable Pages** in repository settings

### Manual Deployment

1. **Build locally:**
   ```bash
   npm install
   NODE_ENV=production npm run build
   ```

2. **Upload files** to your server (see [Files to Deploy](#3-files-to-deploy) above): at minimum `preview.html`, `map.js`, `map-config.js`, `style.json`, `sprites/`, `charts/`, `data/`, dock scripts, and `shared/utils/*.js`.

3. **Configure your server:**
   - Enable CORS headers
   - Set proper MIME types
   - Enable gzip compression

## Server Configuration

### CORS Headers

Your server must send CORS headers for assets:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

### MIME Types

Ensure correct MIME types:

```
.json -> application/json
.png -> image/png
.js -> text/javascript
.html -> text/html
.pbf -> application/x-protobuf
```

### Compression

Enable gzip compression for:
- `.json` files (especially `style.json`)
- `.js` files
- `.html` files

## Using in Your Application

### HTML Integration

```html
<!DOCTYPE html>
<html>
<head>
  <link href="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script src="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js"></script>
  <script src="https://unpkg.com/pmtiles@4.3.0/dist/pmtiles.js"></script>
  <script src="https://data.storypath.studio/js/maplibre-gl-starfield.js"></script>
  <script src="./map-config.js"></script>
  <script>
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    
    const map = new maplibregl.Map({
      container: "map",
      style: "./style.json",
      center: window.mapCenter || [-98, 39],
      zoom: window.mapZoom || 4,
      projection: { type: window.mapProjection || "globe" }
    });
  </script>
</body>
</html>
```

### JavaScript Integration

```javascript
import maplibregl from 'maplibre-gl';
import * as pmtiles from 'pmtiles';

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const map = new maplibregl.Map({
  container: 'map',
  style: '/path/to/style.json',
  center: [-98, 39],
  zoom: 4
});
```

## CDN Assets

The map loads these assets from CDN:

### Glyphs (Fonts)

```
https://data.storypath.studio/glyphs/{fontstack}/{range}.pbf
```

These are loaded on-demand as the map needs different character ranges.

### Starfield Script

```
https://data.storypath.studio/js/maplibre-gl-starfield.js
```

Required for globe projection with starfield effect.

### PMTiles Data

Map data sources are referenced in `style.json`:

```json
{
  "sources": {
    "world_low": {
      "type": "vector",
      "url": "pmtiles://https://data.storypath.studio/pmtiles/world.pmtiles"
    }
  }
}
```

## Performance Optimization

### 1. Enable Caching

Set cache headers for static assets:

```
style.json -> Cache-Control: public, max-age=3600
sprites/* -> Cache-Control: public, max-age=31536000
```

### 2. Use CDN

Serve your `style.json` and `sprites/` from a CDN for better global performance.

### 3. Compress Assets

Enable gzip/brotli compression for:
- `style.json` (can be quite large)
- JavaScript files

### 4. Lazy Load

If the map isn't immediately visible, lazy load MapLibre and PMTiles libraries.

## Environment Variables

For different environments, you can use environment variables:

```typescript
// scripts/build-styles.ts
const productionConfig = {
  glyphsBaseUrl: process.env.GLYPHS_CDN || "https://data.storypath.studio",
  spriteBaseUrl: process.env.SPRITE_CDN || "http://localhost:8080",
  // ...
};
```

Then build with:

```bash
GLYPHS_CDN=https://my-cdn.com SPRITE_CDN=https://my-cdn.com npm run build:styles
```

## Monitoring

### Check Asset Loading

Monitor that all assets load correctly:
- Style JSON
- Sprites (check Network tab)
- Glyphs (loaded on-demand)
- PMTiles data

### Error Tracking

Use browser console to track MapLibre errors:

```javascript
map.on('error', (e) => {
  console.error('Map error:', e);
  // Send to error tracking service
});
```

## Troubleshooting

**Map not rendering:**
- Check `style.json` is accessible
- Ensure `shared/utils/*.js` exists (run `npm run build:utils` or `npm install` in CI)
- Verify sprite URLs are correct
- Check browser console for errors

**Sprites not loading:**
- Ensure sprites are deployed
- Check CORS headers
- Verify sprite path in `style.json`

**Fonts not showing:**
- Check glyph URL in `style.json`
- Verify CDN is accessible
- Check Network tab for 404s

**Slow loading:**
- Enable compression
- Use CDN for assets
- Check PMTiles URLs are reachable

## Security

### Content Security Policy

If using CSP, allow these domains (extend as needed for your CDNs):

```
connect-src 'self' https://data.storypath.studio https://esm.sh;
script-src 'self' https://unpkg.com https://data.storypath.studio https://esm.sh;
style-src 'self' https://unpkg.com;
img-src 'self' data: blob:;
```

The preview loads **Chart.js** and **Fuse** from **esm.sh** via the import map in `preview.html`. MapLibre and PMTiles load from **unpkg.com**. Tiles, glyphs, and census JSON use **data.storypath.studio** (and any other hosts in your `style.json` sources).

### HTTPS

Always serve your map over HTTPS in production.

## Updating

To update the map style:

1. Edit `styles/theme.ts`
2. Build: `npm run build:styles` (or `npm run build` if you also changed `shared/utils/*.ts`)
3. Deploy updated files
4. Browser caches will update based on cache headers

For changes to **places** TypeScript under `shared/utils/`, run `npm run build:utils` (or `npm run build`) and redeploy the updated `.js` files.

## Rollback

Keep previous versions of `style.json` for quick rollback if needed.

```bash
# Before deploying
cp style.json style.json.backup-$(date +%Y%m%d)
```
