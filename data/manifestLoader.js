import { MANIFEST_URL } from "./dockDataConfig.js";

/**
 * @returns {Promise<{ vintage?: string } | null>}
 */
export async function loadManifest() {
  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
