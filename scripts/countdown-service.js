import {
  ASSET_PATHS,
  COUNTDOWN_VISIBILITY,
  FLAGS,
  MODULE_ID,
  TIE_PLACEMENTS,
  ZERO_BEHAVIORS,
  clampNumber,
  cloneData
} from "./constants.js";
import { getTimelineSettings } from "./settings.js";
import { normalizeColor, normalizeFoundryPath } from "./image-adapter.js";

const MAX_PROCESSED_ROUNDS = 250;

function nowStamp() {
  return new Date().toISOString();
}

function makeId() {
  return globalThis.foundry?.utils?.randomID?.() ?? crypto.randomUUID();
}

function safeText(value, maxLength, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function asInteger(value, min, max, fallback) {
  return Math.round(clampNumber(value, min, max, fallback));
}

function asInitiative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function validTiePlacement(value) {
  return Object.values(TIE_PLACEMENTS).includes(value) ? value : TIE_PLACEMENTS.BEFORE;
}

function validZeroBehavior(value) {
  return Object.values(ZERO_BEHAVIORS).includes(value) ? value : getTimelineSettings().defaultZeroBehavior;
}

function validVisibility(_value) {
  return COUNTDOWN_VISIBILITY.EVERYONE;
}

function processedRoundsFrom(raw) {
  const rounds = Array.isArray(raw?.processedRounds) ? raw.processedRounds : [];
  return [...new Set(rounds.map((round) => Number(round)).filter((round) => Number.isInteger(round) && round > 0))]
    .sort((a, b) => a - b)
    .slice(-MAX_PROCESSED_ROUNDS);
}

export function normalizeCountdown(raw, combat) {
  const data = typeof raw === "object" && raw ? raw : {};
  const startingCount = asInteger(data.startingCount, 0, 999, 1);
  const currentCount = asInteger(data.currentCount, 0, 999, startingCount);
  const zeroBehavior = validZeroBehavior(data.zeroBehavior);
  const triggered = Boolean(data.triggered || (currentCount === 0 && zeroBehavior !== ZERO_BEHAVIORS.RESET));
  const createdAt = safeText(data.createdAt, 48, nowStamp());
  const updatedAt = safeText(data.updatedAt, 48, createdAt);

  return {
    id: safeText(data.id, 64, makeId()),
    combatId: safeText(data.combatId, 64, combat?.id ?? ""),
    name: safeText(data.name, 80, game.i18n.localize("CCT.Countdown.defaultName")),
    shortLabel: safeText(data.shortLabel, 10, ""),
    startingCount,
    currentCount,
    initiative: asInitiative(data.initiative),
    tiePlacement: validTiePlacement(data.tiePlacement),
    icon: normalizeFoundryPath(data.icon) || ASSET_PATHS.COUNTDOWN,
    accentColor: normalizeColor(data.accentColor, "#6fc6d6"),
    visibility: validVisibility(data.visibility),
    zeroBehavior,
    triggered,
    active: data.active !== false,
    lastProcessedRound: Number.isInteger(data.lastProcessedRound) ? data.lastProcessedRound : null,
    lastProcessedCycleKey: safeText(data.lastProcessedCycleKey, 96, ""),
    processedRounds: processedRoundsFrom(data),
    createdAt,
    updatedAt,
    createdBy: safeText(data.createdBy, 64, game.user?.id ?? ""),
    updatedBy: safeText(data.updatedBy, 64, game.user?.id ?? "")
  };
}

export function getCountdowns(combat) {
  if (!combat) return [];
  const raw = combat.getFlag?.(MODULE_ID, FLAGS.COUNTDOWNS);
  const values = Array.isArray(raw) ? raw : [];
  return values
    .map((countdown) => normalizeCountdown(countdown, combat))
    .filter((countdown) => countdown.combatId === combat.id);
}

export function isCountdownVisibleToUser(countdown, settings = getTimelineSettings()) {
  if (!countdown) return false;
  if (!settings.enableCountdowns) return false;
  if (!game.user?.isGM && !settings.allowPlayerCountdowns) return false;
  if (!game.user?.isGM && countdown.visibility !== COUNTDOWN_VISIBILITY.EVERYONE) return false;
  if (!game.user?.isGM && countdown.active === false) return false;
  if (countdown.zeroBehavior === ZERO_BEHAVIORS.HIDE && countdown.triggered && !game.user?.isGM) return false;
  return true;
}

export function isCountdownRenderedInTimeline(countdown, settings = getTimelineSettings()) {
  if (!isCountdownVisibleToUser(countdown, settings)) return false;
  if (!game.user?.isGM && countdown.zeroBehavior === ZERO_BEHAVIORS.HIDE && countdown.triggered) return false;
  return countdown.active || game.user?.isGM;
}

export async function saveCountdowns(combat, countdowns) {
  if (!game.user?.isGM) throw new Error("Only a GM may change countdown markers.");
  const sanitized = countdowns.map((countdown) => normalizeCountdown(countdown, combat));
  return combat.setFlag(MODULE_ID, FLAGS.COUNTDOWNS, cloneData(sanitized));
}

async function mutateCountdowns(combat, mutator) {
  if (!combat) throw new Error("No active combat is available.");
  if (!game.user?.isGM) throw new Error("Only a GM may change countdown markers.");
  const countdowns = getCountdowns(combat);
  const result = mutator(countdowns);
  await saveCountdowns(combat, countdowns);
  return result;
}

export async function createCountdown(combat, formData) {
  return mutateCountdowns(combat, (countdowns) => {
    const data = normalizeCountdown({
      ...formData,
      id: makeId(),
      combatId: combat.id,
      currentCount: formData.currentCount === "" || formData.currentCount === undefined
        ? formData.startingCount
        : formData.currentCount,
      visibility: COUNTDOWN_VISIBILITY.EVERYONE,
      createdAt: nowStamp(),
      updatedAt: nowStamp(),
      createdBy: game.user?.id ?? "",
      updatedBy: game.user?.id ?? ""
    }, combat);
    countdowns.push(data);
    return data;
  });
}

export async function updateCountdown(combat, countdownId, formData) {
  return mutateCountdowns(combat, (countdowns) => {
    const index = countdowns.findIndex((countdown) => countdown.id === countdownId);
    if (index < 0) throw new Error("Countdown marker was not found.");
    const existing = countdowns[index];
    const merged = normalizeCountdown({
      ...existing,
      ...formData,
      id: existing.id,
      combatId: combat.id,
      visibility: COUNTDOWN_VISIBILITY.EVERYONE,
      updatedAt: nowStamp(),
      updatedBy: game.user?.id ?? ""
    }, combat);
    countdowns[index] = merged;
    return merged;
  });
}

export async function deleteCountdown(combat, countdownId) {
  return mutateCountdowns(combat, (countdowns) => {
    const index = countdowns.findIndex((countdown) => countdown.id === countdownId);
    if (index >= 0) countdowns.splice(index, 1);
    return index >= 0;
  });
}

export async function adjustCountdown(combat, countdownId, delta) {
  return mutateCountdowns(combat, (countdowns) => {
    const countdown = countdowns.find((entry) => entry.id === countdownId);
    if (!countdown) return null;
    countdown.currentCount = asInteger(countdown.currentCount + delta, 0, 999, countdown.currentCount);
    countdown.triggered = countdown.currentCount === 0;
    countdown.updatedAt = nowStamp();
    countdown.updatedBy = game.user?.id ?? "";
    return countdown;
  });
}

export async function resetCountdown(combat, countdownId) {
  return mutateCountdowns(combat, (countdowns) => {
    const countdown = countdowns.find((entry) => entry.id === countdownId);
    if (!countdown) return null;
    countdown.currentCount = countdown.startingCount;
    countdown.triggered = countdown.currentCount === 0;
    countdown.active = true;
    countdown.processedRounds = [];
    countdown.lastProcessedRound = null;
    countdown.lastProcessedCycleKey = "";
    countdown.updatedAt = nowStamp();
    countdown.updatedBy = game.user?.id ?? "";
    return countdown;
  });
}

export async function setCountdownTriggered(combat, countdownId, triggered) {
  return mutateCountdowns(combat, (countdowns) => {
    const countdown = countdowns.find((entry) => entry.id === countdownId);
    if (!countdown) return null;
    countdown.triggered = Boolean(triggered);
    if (triggered) countdown.currentCount = 0;
    countdown.updatedAt = nowStamp();
    countdown.updatedBy = game.user?.id ?? "";
    return countdown;
  });
}

export async function setCountdownActive(combat, countdownId, active) {
  return mutateCountdowns(combat, (countdowns) => {
    const countdown = countdowns.find((entry) => entry.id === countdownId);
    if (!countdown) return null;
    countdown.active = Boolean(active);
    countdown.updatedAt = nowStamp();
    countdown.updatedBy = game.user?.id ?? "";
    return countdown;
  });
}

export function inferInitiativeDirection(turns) {
  const values = turns
    .map((combatant) => Number(combatant?.initiative))
    .filter((value) => Number.isFinite(value));
  if (values.length < 2) return "desc";
  return values[0] >= values[values.length - 1] ? "desc" : "asc";
}

function initiativeOf(combatant, direction) {
  const value = Number(combatant?.initiative);
  if (Number.isFinite(value)) return value;
  return direction === "desc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
}

export function getTurnPosition(turnIndex) {
  return Number.isInteger(turnIndex) && turnIndex >= 0 ? (turnIndex * 10) + 10 : Number.NEGATIVE_INFINITY;
}

export function getCountdownPosition(countdown, turns) {
  if (!turns.length) return 5;
  const direction = inferInitiativeDirection(turns);
  const initiative = Number(countdown.initiative);
  const equalIndexes = turns
    .map((combatant, index) => ({ index, initiative: Number(combatant?.initiative) }))
    .filter((entry) => Number.isFinite(entry.initiative) && entry.initiative === initiative)
    .map((entry) => entry.index);

  if (equalIndexes.length) {
    const insertIndex = countdown.tiePlacement === TIE_PLACEMENTS.AFTER
      ? Math.max(...equalIndexes) + 1
      : Math.min(...equalIndexes);
    return (insertIndex * 10) + 5;
  }

  const insertIndex = turns.findIndex((combatant) => {
    const combatantInitiative = initiativeOf(combatant, direction);
    return direction === "desc"
      ? combatantInitiative < initiative
      : combatantInitiative > initiative;
  });

  const safeIndex = insertIndex < 0 ? turns.length : insertIndex;
  return (safeIndex * 10) + 5;
}

export function buildRoundSequence(turns, countdowns) {
  const combatants = turns.map((combatant, index) => ({
    type: "combatant",
    id: combatant.id,
    combatant,
    turnIndex: index,
    position: getTurnPosition(index),
    secondary: index
  }));

  const markers = countdowns.map((countdown, index) => ({
    type: "countdown",
    id: countdown.id,
    countdown,
    turnIndex: null,
    position: getCountdownPosition(countdown, turns),
    secondary: 5000 + index
  }));

  return [...combatants, ...markers].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.secondary - b.secondary;
  });
}

export function markCountdownProcessed(countdown, round) {
  const processedRounds = processedRoundsFrom(countdown);
  if (!processedRounds.includes(round)) processedRounds.push(round);
  countdown.processedRounds = processedRounds.slice(-MAX_PROCESSED_ROUNDS);
  countdown.lastProcessedRound = round;
  countdown.lastProcessedCycleKey = `${countdown.combatId}:${round}:${countdown.initiative}:${countdown.tiePlacement}`;
}

export function applyCountdownTick(countdown, round) {
  markCountdownProcessed(countdown, round);
  if (countdown.currentCount > 0) countdown.currentCount -= 1;
  if (countdown.currentCount === 0) {
    countdown.triggered = true;
    if (countdown.zeroBehavior === ZERO_BEHAVIORS.DISABLE) countdown.active = false;
    if (countdown.zeroBehavior === ZERO_BEHAVIORS.RESET) {
      countdown.currentCount = countdown.startingCount;
      countdown.triggered = false;
      countdown.active = true;
    }
  }
  countdown.updatedAt = nowStamp();
  countdown.updatedBy = game.user?.id ?? "";
}
