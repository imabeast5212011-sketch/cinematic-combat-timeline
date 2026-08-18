import { ANCHORS, HIDDEN_POLICIES, MODULE_ID, SETTINGS, ZERO_BEHAVIORS } from "./constants.js?v=0.1.14";

let settingsChangeCallback = null;

function registerSetting(key, data) {
  game.settings.register(MODULE_ID, key, {
    config: true,
    ...data,
    onChange: (value) => {
      data.onChange?.(value);
      settingsChangeCallback?.(key, value);
    }
  });
}

export function registerSettings(onChange) {
  settingsChangeCallback = onChange;

  registerSetting(SETTINGS.ENABLED, {
    name: "CCT.Settings.enabled.name",
    hint: "CCT.Settings.enabled.hint",
    scope: "world",
    type: Boolean,
    default: true
  });

  registerSetting(SETTINGS.HIDDEN_COMBATANTS, {
    name: "CCT.Settings.hiddenCombatants.name",
    hint: "CCT.Settings.hiddenCombatants.hint",
    scope: "world",
    type: String,
    default: HIDDEN_POLICIES.OMIT,
    choices: {
      [HIDDEN_POLICIES.OMIT]: "CCT.Settings.hiddenCombatants.choices.omit",
      [HIDDEN_POLICIES.ANONYMOUS]: "CCT.Settings.hiddenCombatants.choices.anonymous"
    }
  });

  registerSetting(SETTINGS.PERMIT_NEXT_ROUND_PREVIEW, {
    name: "CCT.Settings.permitNextRoundPreview.name",
    hint: "CCT.Settings.permitNextRoundPreview.hint",
    scope: "world",
    type: Boolean,
    default: true
  });

  registerSetting(SETTINGS.MAX_ENTRIES, {
    name: "CCT.Settings.maxEntries.name",
    hint: "CCT.Settings.maxEntries.hint",
    scope: "world",
    type: Number,
    default: 8,
    range: { min: 3, max: 16, step: 1 }
  });

  registerSetting(SETTINGS.ALLOW_ACTOR_SHEET_OPEN, {
    name: "CCT.Settings.allowActorSheetOpen.name",
    hint: "CCT.Settings.allowActorSheetOpen.hint",
    scope: "world",
    type: Boolean,
    default: true
  });

  registerSetting(SETTINGS.ENABLE_COUNTDOWNS, {
    name: "CCT.Settings.enableCountdowns.name",
    hint: "CCT.Settings.enableCountdowns.hint",
    scope: "world",
    type: Boolean,
    default: true
  });

  registerSetting(SETTINGS.ALLOW_PLAYER_COUNTDOWNS, {
    name: "CCT.Settings.allowPlayerCountdowns.name",
    hint: "CCT.Settings.allowPlayerCountdowns.hint",
    scope: "world",
    type: Boolean,
    default: true
  });

  registerSetting(SETTINGS.DEFAULT_ZERO_BEHAVIOR, {
    name: "CCT.Settings.defaultZeroBehavior.name",
    hint: "CCT.Settings.defaultZeroBehavior.hint",
    scope: "world",
    type: String,
    default: ZERO_BEHAVIORS.REMAIN,
    choices: {
      [ZERO_BEHAVIORS.REMAIN]: "CCT.ZeroBehavior.remain",
      [ZERO_BEHAVIORS.HIDE]: "CCT.ZeroBehavior.hide",
      [ZERO_BEHAVIORS.DISABLE]: "CCT.ZeroBehavior.disable",
      [ZERO_BEHAVIORS.RESET]: "CCT.ZeroBehavior.reset"
    }
  });

  registerSetting(SETTINGS.SHOW_TIMELINE, {
    name: "CCT.Settings.showTimeline.name",
    hint: "CCT.Settings.showTimeline.hint",
    scope: "client",
    type: Boolean,
    default: true
  });

  registerSetting(SETTINGS.ANCHOR, {
    name: "CCT.Settings.anchor.name",
    hint: "CCT.Settings.anchor.hint",
    scope: "client",
    type: String,
    default: ANCHORS.MIDDLE_RIGHT,
    choices: {
      [ANCHORS.UPPER_LEFT]: "CCT.Anchor.upperLeft",
      [ANCHORS.MIDDLE_LEFT]: "CCT.Anchor.middleLeft",
      [ANCHORS.UPPER_RIGHT]: "CCT.Anchor.upperRight",
      [ANCHORS.MIDDLE_RIGHT]: "CCT.Anchor.middleRight"
    }
  });

  registerSetting(SETTINGS.CUSTOM_POSITION, {
    name: "CCT.Settings.customPosition.name",
    hint: "CCT.Settings.customPosition.hint",
    scope: "client",
    type: Object,
    default: null,
    config: false
  });

  registerSetting(SETTINGS.SCALE, {
    name: "CCT.Settings.scale.name",
    hint: "CCT.Settings.scale.hint",
    scope: "client",
    type: Number,
    default: 1,
    range: { min: 0.75, max: 1.5, step: 0.05 }
  });

  registerSetting(SETTINGS.VISIBLE_ENTRY_COUNT, {
    name: "CCT.Settings.visibleEntryCount.name",
    hint: "CCT.Settings.visibleEntryCount.hint",
    scope: "client",
    type: Number,
    default: 8,
    range: { min: 3, max: 16, step: 1 }
  });

  registerSetting(SETTINGS.CLIENT_NEXT_ROUND_PREVIEW, {
    name: "CCT.Settings.clientNextRoundPreview.name",
    hint: "CCT.Settings.clientNextRoundPreview.hint",
    scope: "client",
    type: Boolean,
    default: true
  });

  registerSetting(SETTINGS.EXPANDED_LABELS, {
    name: "CCT.Settings.expandedLabels.name",
    hint: "CCT.Settings.expandedLabels.hint",
    scope: "client",
    type: Boolean,
    default: false
  });

  registerSetting(SETTINGS.REDUCE_ANIMATION, {
    name: "CCT.Settings.reduceAnimation.name",
    hint: "CCT.Settings.reduceAnimation.hint",
    scope: "client",
    type: Boolean,
    default: false
  });

  registerSetting(SETTINGS.COLLAPSE_WHEN_INACTIVE, {
    name: "CCT.Settings.collapseWhenInactive.name",
    hint: "CCT.Settings.collapseWhenInactive.hint",
    scope: "client",
    type: Boolean,
    default: true
  });

  registerSetting(SETTINGS.PREFER_TOKEN_IMAGE, {
    name: "CCT.Settings.preferTokenImage.name",
    hint: "CCT.Settings.preferTokenImage.hint",
    scope: "client",
    type: Boolean,
    default: true
  });
}

export function getSetting(key) {
  return game.settings.get(MODULE_ID, key);
}

export async function setClientSetting(key, value) {
  return game.settings.set(MODULE_ID, key, value);
}

export function getTimelineSettings() {
  const worldMax = Number(getSetting(SETTINGS.MAX_ENTRIES)) || 8;
  return {
    enabled: Boolean(getSetting(SETTINGS.ENABLED)),
    showTimeline: Boolean(getSetting(SETTINGS.SHOW_TIMELINE)),
    hiddenCombatants: getSetting(SETTINGS.HIDDEN_COMBATANTS),
    permitNextRoundPreview: Boolean(getSetting(SETTINGS.PERMIT_NEXT_ROUND_PREVIEW)),
    maxEntries: worldMax,
    allowActorSheetOpen: Boolean(getSetting(SETTINGS.ALLOW_ACTOR_SHEET_OPEN)),
    enableCountdowns: Boolean(getSetting(SETTINGS.ENABLE_COUNTDOWNS)),
    allowPlayerCountdowns: Boolean(getSetting(SETTINGS.ALLOW_PLAYER_COUNTDOWNS)),
    defaultZeroBehavior: getSetting(SETTINGS.DEFAULT_ZERO_BEHAVIOR),
    anchor: getSetting(SETTINGS.ANCHOR),
    customPosition: getSetting(SETTINGS.CUSTOM_POSITION),
    scale: Number(getSetting(SETTINGS.SCALE)) || 1,
    visibleEntryCount: Math.min(Number(getSetting(SETTINGS.VISIBLE_ENTRY_COUNT)) || 8, worldMax),
    clientNextRoundPreview: Boolean(getSetting(SETTINGS.CLIENT_NEXT_ROUND_PREVIEW)),
    expandedLabels: Boolean(getSetting(SETTINGS.EXPANDED_LABELS)),
    reduceAnimation: Boolean(getSetting(SETTINGS.REDUCE_ANIMATION)),
    collapseWhenInactive: Boolean(getSetting(SETTINGS.COLLAPSE_WHEN_INACTIVE)),
    preferTokenImage: Boolean(getSetting(SETTINGS.PREFER_TOKEN_IMAGE))
  };
}
