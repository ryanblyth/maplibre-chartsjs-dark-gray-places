import { loadPlacesIndex } from "./placesIndexLoader.js";
import { loadPlacesAttributesByState } from "../shared/utils/placesData.js";

/**
 * @param {string} statefp - Two-digit state FIPS
 * @param {number} limit
 * @returns {Promise<Array<{ name: string; geoid: string; pop_total: number; stusps: string }>>}
 */
export async function getTopCitiesByState(statefp, limit = 10) {
  const padded = String(statefp).padStart(2, "0");
  const statePlaces = await loadPlacesIndex();
  const inState = statePlaces.filter(
    (p) => String(p.statefp ?? "").padStart(2, "0") === padded
  );

  if (inState.length === 0) {
    console.warn(`No places found for state ${padded}`);
    return [];
  }

  const stateAttrs = await loadPlacesAttributesByState(padded);
  const stateAbbr = inState[0]?.stusps || "";

  return inState
    .map((place) => {
      const attrs = stateAttrs[place.geoid];
      return {
        name: place.name,
        geoid: place.geoid,
        stusps: place.stusps || stateAbbr,
        pop_total:
          attrs && attrs.pop_total != null ? Number(attrs.pop_total) : 0,
      };
    })
    .filter((city) => city.pop_total > 0)
    .sort((a, b) => b.pop_total - a.pop_total)
    .slice(0, limit);
}
