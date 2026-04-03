/**
 * Single source of truth for incorporated-places population density fill ramp.
 * Consumed by styles/theme.ts (style build) and shared/densityLegendControl.js (preview UI).
 */

export const placesDensityPaletteBase = {
  defaultFillColor: "#dff8f3",
  ranges: [
    { threshold: 100, fillColor: "#c7f3ef" },
    { threshold: 300, fillColor: "#a7eaf7" },
    { threshold: 1000, fillColor: "#87dbfb" },
    { threshold: 2000, fillColor: "#66c9f6" },
    { threshold: 3000, fillColor: "#5ab2f0" },
    { threshold: 4000, fillColor: "#6d97ee" },
    { threshold: 5000, fillColor: "#8a7ef2" },
    { threshold: 7500, fillColor: "#a86bea" },
    { threshold: 10000, fillColor: "#c95fdc" },
    { threshold: 15000, fillColor: "#df57bd" },
    { threshold: 25000, fillColor: "#cf438d" },
  ],
};
