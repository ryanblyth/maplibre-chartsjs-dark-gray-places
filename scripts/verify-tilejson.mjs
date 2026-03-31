#!/usr/bin/env node
/**
 * Fetch TileJSON endpoints used by the basemap and print status + vector_layers (or raster-dem hints).
 * Use to verify Cloudflare Worker / CDN routing matches the archives the style expects.
 *
 * Usage: npm run verify:tilejson
 *        DATA_CDN=https://data.storypath.studio npm run verify:tilejson
 */

const DATA_CDN = process.env.DATA_CDN || "https://data.storypath.studio";

/** Paths from shared/styles/layers/sources.ts (TileJSON URLs = ${dataBaseUrl}/${path}.json) */
const TILEJSON_PATHS = [
  "world-labels_z0-10.json",
  "world_z0-6.json",
  "world_z6-10.json",
  "us_z0-15.json",
  "poi_us_z12-15.json",
  "ne_bathy_z0-6.json",
  "world_mtn_hillshade.json",
  "places/places_cb_2024_points_acs5_2024_density_z0.json",
  "places/places_cb_2024_500k_z5.json",
];

async function checkOne(url) {
  const res = await fetch(url, { redirect: "follow" });
  const status = res.status;
  let body = null;
  let err = null;
  try {
    const text = await res.text();
    body = JSON.parse(text);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  return { status, body, err };
}

function summarizeTileJson(path, { status, body, err }) {
  const line = `[${status}] ${path}`;
  if (status !== 200) {
    console.log(line + " — not OK");
    return;
  }
  if (err || !body || typeof body !== "object") {
    console.log(line + ` — invalid JSON: ${err || "empty"}`);
    return;
  }

  const tiles = body.tiles;
  const type = body.type || (body.vector_layers ? "vector (inferred)" : body.tilejson ? "tilejson" : "?");

  if (Array.isArray(body.vector_layers) && body.vector_layers.length) {
    const names = body.vector_layers.map((l) => l.id).filter(Boolean);
    console.log(line);
    console.log(`    type: ${type}  tiles: ${Array.isArray(tiles) ? tiles[0] || "(none)" : "(none)"}`);
    console.log(`    vector_layers (${names.length}): ${names.slice(0, 40).join(", ")}${names.length > 40 ? " …" : ""}`);
    return;
  }

  if (body.type === "raster-dem" || (body.tiles && body.encoding)) {
    console.log(line);
    console.log(`    raster-dem / hillshade  tiles: ${Array.isArray(tiles) ? tiles[0] : "(none)"}`);
    return;
  }

  console.log(line);
  console.log(`    (no vector_layers in JSON — MapLibre may read layers from tiles; check Worker)`);
  if (tiles && tiles[0]) {
    console.log(`    tiles[0]: ${tiles[0]}`);
  }
}

async function main() {
  console.log(`DATA_CDN=${DATA_CDN}\n`);
  for (const path of TILEJSON_PATHS) {
    const url = `${DATA_CDN.replace(/\/$/, "")}/${path}`;
    try {
      const result = await checkOne(url);
      summarizeTileJson(path, result);
    } catch (e) {
      console.log(`[error] ${path}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log("\nIf vector_layers is missing or layer names do not match the style (e.g. poi, water_name), fix Worker → PMTiles mapping.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
