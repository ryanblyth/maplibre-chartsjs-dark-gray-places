/**
 * Shared constants for the charts dock modules.
 */

export const STORAGE_KEYS = {
  DRAWER_OPEN: "charts-dock-drawer-open",
  SHOW_VALUES: "charts-dock-show-values",
  LIGHT_THEME: "charts-dock-light",
  PANEL_WIDTH: "charts-dock-panel-width-px",
};

export const COMPACT_BREAKPOINT = 768;

/** Touch swipe thresholds (charts dock drawer + density legend); keep in sync everywhere. */
export const TOUCH_SWIPE_GESTURE = {
  THRESHOLD_PX: 60,
  THRESHOLD_RATIO: 0.3,
  VELOCITY_MIN: 0.5,
  DIRECTION_LOCK_PX: 10,
};
