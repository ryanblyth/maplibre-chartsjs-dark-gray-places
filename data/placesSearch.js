import Fuse from "fuse.js";
import { loadPlacesIndex } from "./placesIndexLoader.js";

/** @type {Fuse<Record<string, unknown>> | null} */
let fuse = null;

/** @type {Map<string, Record<string, unknown>> | null} */
let geoidMap = null;

function buildFuseIfNeeded(places) {
  if (fuse) return;
  fuse = new Fuse(places, {
    keys: ["name", "stusps"],
    threshold: 0.4,
    includeScore: true,
  });
  geoidMap = new Map();
  for (const p of places) {
    if (p.geoid) geoidMap.set(String(p.geoid), p);
  }
}

/**
 * Load index and build Fuse (reuses cached fetch from placesIndexLoader).
 */
export async function ensurePlacesSearchReady() {
  const places = await loadPlacesIndex();
  buildFuseIfNeeded(places);
}

/**
 * @param {string} query
 * @param {number} limit
 * @returns {Array<Record<string, unknown>>}
 */
export function searchPlaces(query, limit = 10) {
  if (!fuse) {
    console.warn("placesSearch: call ensurePlacesSearchReady() first");
    return [];
  }
  if (!query || query.trim() === "") return [];
  const results = fuse.search(query.trim(), { limit });
  return results.map((r) => r.item);
}

