import { PLACES_INDEX_URL } from "./dockDataConfig.js";

let places = null;

/**
 * @returns {Promise<Array<{ geoid: string; name: string; stusps?: string; statefp: string }>>}
 */
export async function loadPlacesIndex() {
  if (places) {
    return places;
  }

  const response = await fetch(PLACES_INDEX_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to load places index (${response.status}): ${response.statusText}`
    );
  }
  places = await response.json();
  return places;
}
