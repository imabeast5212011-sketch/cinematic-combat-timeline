import { ASSET_PATHS, FLAGS, MODULE_ID, clampNumber } from "./constants.js?v=0.1.12";
import { isAnonymousCombatant } from "./combat-adapter.js?v=0.1.12";

const SAFE_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const UNSAFE_PATH_PATTERN = /(?:^\/|^[a-z]:|\\|(?:^|\/)\.\.(?:\/|$)|^\w+:)/i;

export function isSafeColor(value) {
  return typeof value === "string" && SAFE_COLOR_PATTERN.test(value.trim());
}

export function normalizeColor(value, fallback = "#d6b35a") {
  return isSafeColor(value) ? value.trim() : fallback;
}

export function isSafeFoundryPath(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 240) return false;
  return !UNSAFE_PATH_PATTERN.test(trimmed);
}

export function normalizeFoundryPath(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return isSafeFoundryPath(trimmed) ? trimmed : "";
}

export function getActorTimelineConfig(actor) {
  const raw = actor?.getFlag?.(MODULE_ID, FLAGS.ACTOR_CONFIG) ?? {};
  const config = typeof raw === "object" && raw ? raw : {};
  return {
    icon: normalizeFoundryPath(config.icon),
    focalX: clampNumber(config.focalX, 0, 100, 50),
    focalY: clampNumber(config.focalY, 0, 100, 50),
    zoom: clampNumber(config.zoom, 1, 3, 1),
    flip: Boolean(config.flip),
    accentColor: normalizeColor(config.accentColor, ""),
    shortName: typeof config.shortName === "string" ? config.shortName.trim().slice(0, 24) : ""
  };
}

function getTokenImage(combatant) {
  return normalizeFoundryPath(
    combatant?.img
    || combatant?.token?.texture?.src
    || combatant?.token?.object?.document?.texture?.src
    || ""
  );
}

function getActorImage(combatant) {
  return normalizeFoundryPath(combatant?.actor?.img || "");
}

export function getCombatantImageData(combatant, actorConfig, settings, anonymous) {
  if (anonymous || isAnonymousCombatant(combatant, settings)) {
    return { src: ASSET_PATHS.UNKNOWN, fallback: ASSET_PATHS.UNKNOWN };
  }

  const custom = normalizeFoundryPath(actorConfig.icon);
  const token = getTokenImage(combatant);
  const actor = getActorImage(combatant);
  const ordered = settings.preferTokenImage
    ? [custom, token, actor]
    : [custom, actor, token];
  const src = ordered.find(Boolean) || ASSET_PATHS.UNKNOWN;
  return { src, fallback: ASSET_PATHS.UNKNOWN };
}

export function buildImageStyle(actorConfig, accentColor = "") {
  const scale = clampNumber(actorConfig.zoom, 1, 3, 1);
  const flip = actorConfig.flip ? -1 : 1;
  const color = normalizeColor(accentColor || actorConfig.accentColor, "#d6b35a");
  return [
    `--cct-fit-x: ${actorConfig.focalX}%`,
    `--cct-fit-y: ${actorConfig.focalY}%`,
    `--cct-zoom: ${scale}`,
    `--cct-flip: ${flip}`,
    `--cct-accent: ${color}`
  ].join("; ");
}
