import {
  ASSET_PATHS,
  MODULE_ID,
  ZERO_BEHAVIORS,
  localize
} from "./constants.js?v=0.1.10";
import {
  getCombatTurns,
  getCurrentTurnIndex,
  getDefeatedState,
  getDispositionClass,
  getRound,
  getShortName,
  getVisibleName,
  isAnonymousCombatant,
  isStarted,
  shouldShowCombatant
} from "./combat-adapter.js?v=0.1.10";
import { buildImageStyle, getActorTimelineConfig, getCombatantImageData, normalizeColor } from "./image-adapter.js?v=0.1.10";
import { buildRoundSequence, getCountdowns, isCountdownRenderedInTimeline } from "./countdown-service.js?v=0.1.10";
import { getTimelineSettings } from "./settings.js?v=0.1.10";

function initiativeLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
}

function joinClasses(values) {
  return values.filter(Boolean).join(" ");
}

function countdownStyle(countdown) {
  return `--cct-accent: ${normalizeColor(countdown.accentColor, "#6fc6d6")}`;
}

function buildCombatantEntry(combatant, context) {
  const { currentTurnIndex, isPreview, settings, turnIndex } = context;
  if (!shouldShowCombatant(combatant, settings)) return null;

  const anonymous = isAnonymousCombatant(combatant, settings);
  const actorConfig = anonymous ? {
    icon: "",
    focalX: 50,
    focalY: 50,
    zoom: 1,
    flip: false,
    accentColor: "#8a8f98",
    shortName: ""
  } : getActorTimelineConfig(combatant.actor);
  const image = getCombatantImageData(combatant, actorConfig, settings, anonymous);
  const defeated = !anonymous && getDefeatedState(combatant);
  const visibleName = getVisibleName(combatant, settings);
  const shortName = getShortName(combatant, actorConfig, settings);
  const initiative = anonymous ? "" : initiativeLabel(combatant.initiative);
  const isCurrent = !isPreview && turnIndex === currentTurnIndex;
  const dispositionClass = getDispositionClass(combatant, anonymous);
  const nameLabel = anonymous ? localize("CCT.AnonymousCombatant") : visibleName;
  const tooltip = anonymous
    ? localize("CCT.AnonymousTooltip")
    : localize("CCT.CombatantTooltip", { name: visibleName, initiative: initiative || "-" });

  return {
    isCombatant: true,
    isCountdown: false,
    isDivider: false,
    key: `${isPreview ? "preview" : "round"}-combatant-${combatant.id}`,
    combatantId: anonymous ? "" : combatant.id,
    image: image.src,
    fallbackImage: image.fallback,
    label: settings.expandedLabels ? shortName : "",
    initiative,
    tooltip,
    ariaLabel: isCurrent
      ? localize("CCT.CurrentCombatantAria", { name: nameLabel })
      : localize("CCT.CombatantAria", { name: nameLabel }),
    style: buildImageStyle(actorConfig, actorConfig.accentColor),
    classes: joinClasses([
      "cct-entry",
      "cct-combatant",
      dispositionClass,
      isCurrent && "cct-current",
      isPreview && "cct-preview",
      defeated && "cct-defeated",
      anonymous && "cct-anonymous"
    ]),
    canInteract: !anonymous,
    showDefeated: defeated,
    showPreviewBadge: isPreview,
    showInitiative: Boolean(settings.expandedLabels && initiative),
    current: isCurrent
  };
}

function buildCountdownEntry(countdown, context) {
  const { isPreview, settings } = context;
  if (!isCountdownRenderedInTimeline(countdown, settings)) return null;
  const triggered = countdown.triggered || countdown.currentCount === 0;
  const hiddenAtZero = countdown.zeroBehavior === ZERO_BEHAVIORS.HIDE && triggered;
  if (hiddenAtZero && !game.user?.isGM) return null;
  const name = countdown.name;
  const initiative = initiativeLabel(countdown.initiative);
  const tooltip = localize("CCT.CountdownTooltip", {
    name,
    count: countdown.currentCount,
    initiative: initiative || "-"
  });

  return {
    isCombatant: false,
    isCountdown: true,
    isDivider: false,
    key: `${isPreview ? "preview" : "round"}-countdown-${countdown.id}`,
    countdownId: countdown.id,
    image: countdown.icon || ASSET_PATHS.COUNTDOWN,
    fallbackImage: ASSET_PATHS.COUNTDOWN,
    count: countdown.currentCount,
    label: settings.expandedLabels ? (countdown.shortLabel || countdown.name) : "",
    initiative,
    tooltip,
    ariaLabel: triggered
      ? localize("CCT.TriggeredCountdownAria", { name, count: countdown.currentCount })
      : localize("CCT.CountdownAria", { name, count: countdown.currentCount }),
    style: countdownStyle(countdown),
    classes: joinClasses([
      "cct-entry",
      "cct-countdown",
      isPreview && "cct-preview",
      triggered && "cct-triggered",
      countdown.active === false && "cct-inactive-countdown"
    ]),
    canEditCountdown: Boolean(game.user?.isGM),
    showPreviewBadge: isPreview,
    showInitiative: Boolean(settings.expandedLabels && initiative),
    triggered,
    active: countdown.active
  };
}

function buildDividerEntry() {
  return {
    isCombatant: false,
    isCountdown: false,
    isDivider: true,
    key: "next-round-divider",
    classes: "cct-round-divider",
    ariaLabel: localize("CCT.NextRoundPreview")
  };
}

function sequenceToEntries(sequence, context) {
  return sequence
    .map((item) => {
      if (item.type === "combatant") {
        return buildCombatantEntry(item.combatant, { ...context, turnIndex: item.turnIndex });
      }
      return buildCountdownEntry(item.countdown, context);
    })
    .filter(Boolean);
}

function currentSequenceIndex(sequence, currentTurnIndex) {
  if (!Number.isInteger(currentTurnIndex)) return 0;
  const index = sequence.findIndex((item) => item.type === "combatant" && item.turnIndex === currentTurnIndex);
  return index < 0 ? 0 : index;
}

export function buildTimelineState(combat) {
  const settings = getTimelineSettings();
  const started = isStarted(combat);
  const turns = getCombatTurns(combat);
  const round = getRound(combat);
  const currentTurnIndex = getCurrentTurnIndex(combat, turns);
  const countdowns = settings.enableCountdowns ? getCountdowns(combat).filter((countdown) => {
    if (countdown.zeroBehavior === ZERO_BEHAVIORS.HIDE && countdown.triggered && !game.user?.isGM) return false;
    return isCountdownRenderedInTimeline(countdown, settings);
  }) : [];
  const sequence = buildRoundSequence(turns, countdowns);
  const currentIndex = currentSequenceIndex(sequence, currentTurnIndex);
  const maxEntries = Math.max(3, Math.min(settings.visibleEntryCount, settings.maxEntries));
  const showPreview = settings.permitNextRoundPreview && settings.clientNextRoundPreview;

  const entries = [];
  if (combat && sequence.length) {
    entries.push(...sequenceToEntries(sequence.slice(currentIndex), {
      currentTurnIndex,
      isPreview: false,
      settings
    }));

    if (showPreview && entries.length < maxEntries) {
      const preview = sequenceToEntries(sequence, {
        currentTurnIndex,
        isPreview: true,
        settings
      });
      if (preview.length) {
        entries.push(buildDividerEntry());
        entries.push(...preview);
      }
    }
  }

  const visibleEntries = entries.slice(0, maxEntries);
  const currentEntry = visibleEntries.find((entry) => entry.current) ?? visibleEntries.find((entry) => entry.isCombatant) ?? null;
  const collapsed = !settings.showTimeline || (!started && settings.collapseWhenInactive);

  return {
    moduleId: MODULE_ID,
    enabled: settings.enabled,
    showTimeline: settings.showTimeline,
    hasCombat: Boolean(combat),
    started,
    collapsed,
    expandedLabels: settings.expandedLabels,
    reduceAnimation: settings.reduceAnimation,
    canCreateCountdown: Boolean(game.user?.isGM && combat && settings.enableCountdowns),
    anchor: settings.anchor,
    scale: settings.scale,
    roundLabel: combat ? localize("CCT.RoundLabel", { round: round || 0 }) : "",
    noCombatLabel: localize("CCT.NoCombat"),
    entries: visibleEntries,
    currentImage: currentEntry?.image || ASSET_PATHS.UNKNOWN,
    currentFallbackImage: currentEntry?.fallbackImage || ASSET_PATHS.UNKNOWN,
    currentAria: currentEntry?.ariaLabel || localize("CCT.OpenTimeline"),
    controls: {
      collapse: localize(collapsed ? "CCT.ExpandTimeline" : "CCT.CollapseTimeline"),
      labels: localize(settings.expandedLabels ? "CCT.HideLabels" : "CCT.ShowLabels"),
      anchor: localize("CCT.CycleAnchor"),
      scaleDown: localize("CCT.ScaleDown"),
      scaleUp: localize("CCT.ScaleUp"),
      addCountdown: localize("CCT.AddCountdown")
    }
  };
}
