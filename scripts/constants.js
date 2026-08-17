export const MODULE_ID = "cinematic-combat-timeline";
export const MODULE_TITLE = "Cinematic Combat Timeline";

export const FLAGS = Object.freeze({
  ACTOR_CONFIG: "actorConfig",
  COUNTDOWNS: "countdowns"
});

export const SETTINGS = Object.freeze({
  ENABLED: "enabled",
  HIDDEN_COMBATANTS: "hiddenCombatants",
  PERMIT_NEXT_ROUND_PREVIEW: "permitNextRoundPreview",
  MAX_ENTRIES: "maxEntries",
  ALLOW_ACTOR_SHEET_OPEN: "allowActorSheetOpen",
  ENABLE_COUNTDOWNS: "enableCountdowns",
  ALLOW_PLAYER_COUNTDOWNS: "allowPlayerCountdowns",
  DEFAULT_ZERO_BEHAVIOR: "defaultZeroBehavior",
  SHOW_TIMELINE: "showTimeline",
  ANCHOR: "anchor",
  CUSTOM_POSITION: "customPosition",
  SCALE: "scale",
  VISIBLE_ENTRY_COUNT: "visibleEntryCount",
  CLIENT_NEXT_ROUND_PREVIEW: "clientNextRoundPreview",
  EXPANDED_LABELS: "expandedLabels",
  REDUCE_ANIMATION: "reduceAnimation",
  COLLAPSE_WHEN_INACTIVE: "collapseWhenInactive",
  PREFER_TOKEN_IMAGE: "preferTokenImage"
});

export const HIDDEN_POLICIES = Object.freeze({
  OMIT: "omit",
  ANONYMOUS: "anonymous"
});

export const ANCHORS = Object.freeze({
  UPPER_LEFT: "upper-left",
  MIDDLE_LEFT: "middle-left",
  UPPER_RIGHT: "upper-right",
  MIDDLE_RIGHT: "middle-right"
});

export const TIE_PLACEMENTS = Object.freeze({
  BEFORE: "before",
  AFTER: "after"
});

export const ZERO_BEHAVIORS = Object.freeze({
  REMAIN: "remain",
  HIDE: "hide",
  DISABLE: "disable",
  RESET: "reset"
});

export const COUNTDOWN_VISIBILITY = Object.freeze({
  EVERYONE: "everyone"
});

export const ASSET_PATHS = Object.freeze({
  UNKNOWN: `modules/${MODULE_ID}/assets/unknown-combatant.svg`,
  COUNTDOWN: `modules/${MODULE_ID}/assets/countdown.svg`
});

export const SELECTOR = Object.freeze({
  ROOT_ID: `${MODULE_ID}-root`,
  ROOT: `#${MODULE_ID}-root`,
  STYLE_ID: `${MODULE_ID}-dynamic-style`
});

export function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function localize(key, data = undefined) {
  if (!globalThis.game?.i18n) return key;
  return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

export function cloneData(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function hasFoundryUtilsPath(path) {
  return typeof globalThis.foundry?.utils?.getProperty === "function"
    ? foundry.utils.getProperty(globalThis, path) !== undefined
    : path.split(".").reduce((object, part) => object?.[part], globalThis) !== undefined;
}
