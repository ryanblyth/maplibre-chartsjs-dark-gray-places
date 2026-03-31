# Fixing PMTiles HTTP/2 Errors with Cloudflare

## The Problem

When serving PMTiles archives through Cloudflare (proxying to an origin server),
large MapLibre camera animations (fly-to, ease-to) trigger dozens of
simultaneous tile requests. These requests use HTTP `Range` headers to fetch
byte ranges from the PMTiles archive. Under high concurrency, the browser
reports:

```
ERR_HTTP2_PROTOCOL_ERROR
ERR_CONNECTION_CLOSED
```

Tiles fail to load, leaving visual gaps on the map. MapLibre does not retry
failed tile requests, so the gaps persist until the user pans or zooms.

## Why It Happens

### 1. Cloudflare does not cache Range requests by default

PMTiles works by making HTTP Range requests to fetch specific byte ranges from
a single large archive file. Cloudflare's default caching behavior does **not**
cache responses to Range requests — every tile fetch passes through to the
origin server.

You can verify this by checking the `cf-cache-status` response header in
DevTools Network tab:

- `HIT` = served from Cloudflare edge cache (good)
- `MISS` = fetched from origin, now cached (ok on first request)
- `DYNAMIC` = not cached, always hits origin (this is the problem)

If you see `DYNAMIC` on PMTiles requests, caching is not working.

### 2. Origin server overwhelmed by concurrent requests

With no edge caching, a burst of 50–100+ concurrent Range requests during a
map animation all hit the origin simultaneously. Most small origin servers
cannot handle this and will:

- Reset HTTP/2 streams (→ `ERR_HTTP2_PROTOCOL_ERROR`)
- Close connections (→ `ERR_CONNECTION_CLOSED`)
- Time out (→ `Failed to fetch`)

### 3. HTTP/2 head-of-line blocking

All requests to the same origin share a single HTTP/2 TCP connection. If any
request stalls or the connection degrades, all in-flight requests on that
connection are affected — including tiles for the final destination that the
map actually needs.

## The Fix: PMTiles Cloudflare Worker

The Protomaps project provides an open-source Cloudflare Worker purpose-built
for serving PMTiles. Instead of the browser making Range requests directly, the
Worker:

1. Receives a standard tile request (e.g., `/tiles/{z}/{x}/{y}.mvt`)
2. Uses the PMTiles library to compute which byte range contains that tile
3. Fetches the byte range from origin (or Cloudflare R2)
4. Returns the tile as a normal HTTP response with proper cache headers
5. Cloudflare caches the response at the edge

After the first request for a tile, subsequent requests are served from
Cloudflare's edge cache with no origin contact.

### Resources

- **GitHub:** https://github.com/protomaps/PMTiles/tree/main/serverless/cloudflare
- **Docs:** https://docs.protomaps.com/deploy/cloudflare
- **Works on:** All Cloudflare plans including Free

## Deployment Steps

### Option A: PMTiles on Cloudflare R2 (recommended)

Store PMTiles files in R2 (Cloudflare's S3-compatible object storage) for
best performance — no external origin needed.

1. **Create an R2 bucket:**
   ```bash
   wrangler r2 bucket create pmtiles-data
   ```

2. **Upload PMTiles files:**
   ```bash
   wrangler r2 object put pmtiles-data/us_z0-15.pmtiles --file=./us_z0-15.pmtiles
   wrangler r2 object put pmtiles-data/places/places_cb_2024_500k_z5.pmtiles --file=./places_cb_2024_500k_z5.pmtiles
   # ... repeat for each archive
   ```

3. **Deploy the Worker:**

   Clone the PMTiles repo or create a new Worker project:
   ```bash
   git clone https://github.com/protomaps/PMTiles.git
   cd PMTiles/serverless/cloudflare
   ```

   Edit `wrangler.toml` to bind your R2 bucket:
   ```toml
   name = "pmtiles-worker"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   [[r2_buckets]]
   binding = "BUCKET"
   bucket_name = "pmtiles-data"
   ```

   Deploy:
   ```bash
   wrangler deploy
   ```

4. **Configure a custom domain (optional):**

   In the Cloudflare dashboard, go to Workers & Pages → your worker →
   Settings → Domains & Routes. Add a custom domain like
   `tiles.storypath.studio`.

5. **Update app tile source URLs:**

   In your MapLibre style sources, point at the Worker’s TileJSON URLs (HTTPS `*.json`), not legacy `pmtiles://` archive URLs:
   ```
   # Before (direct archive)
   pmtiles://https://data.storypath.studio/pmtiles/us_z0-15.pmtiles

   # After (TileJSON on same or Worker host)
   https://data.storypath.studio/us_z0-15.json
   ```

### Option B: PMTiles on existing origin (Worker as proxy)

If you prefer to keep files on your current origin server, the Worker can
proxy Range requests and cache the results.

1. **Deploy the Worker** with an `ORIGIN` environment variable pointing to
   your current PMTiles host:
   ```toml
   name = "pmtiles-worker"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   [vars]
   ORIGIN = "https://data.storypath.studio/pmtiles"
   ```

2. **Deploy and configure routing** as in Option A steps 3–5.

## Verifying the Fix

After deploying the Worker:

1. Open the map and trigger a search fly-to
2. Open DevTools → Network tab
3. Filter by the new tile domain (e.g., `tiles.storypath.studio`)
4. Check response headers:
   - `cf-cache-status: HIT` confirms edge caching is working
   - No `ERR_HTTP2_PROTOCOL_ERROR` errors
5. Tiles should render without gaps after the animation completes

## What This Looks Like in the App Code

The app-level change is updating MapLibre source `url` values to HTTPS TileJSON
endpoints (`https://…/*.json`). In this project, tile sources are defined in:

```
shared/styles/baseStyle.ts
shared/styles/layers/sources.ts
```

Run `npm run build:styles` to regenerate `style.json`. The browser still uses
the `pmtiles` MapLibre protocol (see `map.js`) when TileJSON or tiles reference
`pmtiles://` tile templates internally.

## Cost Considerations

- **R2 storage:** $0.015/GB/month (first 10 GB free)
- **R2 reads:** $0.36 per million requests (first 10 million free)
- **Workers:** 100,000 requests/day free, then $5/month for 10 million
- **Edge cache:** Free (reduces both R2 reads and Worker invocations)

For a typical map application, the free tiers cover development and moderate
production traffic.

## Interim App-Level Workarounds

While the Cloudflare Worker is the proper fix, these app-level workarounds
partially mitigate the issue:

| Workaround | What it does | Limitation |
|---|---|---|
| Static centroids file (`data/placeCentroids.js`) | Provides place coordinates without tile queries | Only fixes search centering, not visual tile gaps |
| `map.triggerRepaint()` after animation | Prompts MapLibre to re-request tiles | Doesn't help if connection is still degraded |
| Reduce `easeTo` duration | Fewer intermediate tile requests | May feel abrupt to users |
| Hide non-essential layers during animation | Fewer concurrent requests | Adds code complexity, brief visual gaps |

The static centroids file is already implemented in this project. See
[docs/places-layer.md](places-layer.md#search-fly-to-static-centroids) for
details.
