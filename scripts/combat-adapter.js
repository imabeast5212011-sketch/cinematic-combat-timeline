import { HIDDEN_POLICIES } from "./constants.js?v=0.1.13";

export function getViewedCombat() {
  return game.combats?.viewed ?? game.combat ?? game.combats?.active ?? null;
}

export function getCombatTurns(combat) {
  if (!combat) return [];
  if (Array.isArray(combat.turns)) return combat.turns;
  const combatants = combat.combatants?.contents ?? Array.from(combat.combatants ?? []);
  return combatants;
}

export function getCurrentTurnIndex(combat, turns = getCombatTurns(combat)) {
  if (!combat) return null;
  const turn = Number.isInteger(combat.turn) ? combat.turn : combat.current?.turn;
  if (!Number.isInteger(turn)) {
    const combatantId = combat.combatant?.id ?? combat.current?.combatantId;
    return combatantId ? turns.findIndex((combatant) => combatant.id === combatantId) : null;
  }
  return turn >= 0 && turn < turns.length ? turn : null;
}

export function getRound(combat) {
  return Number.isInteger(combat?.round) ? combat.round : combat?.current?.round ?? 0;
}

export function isStarted(combat) {
  return Boolean(combat && getRound(combat) > 0 && Number.isInteger(getCurrentTurnIndex(combat)));
}

export function isHiddenCombatant(combatant) {
  return Boolean(combatant?.hidden || combatant?.token?.hidden || combatant?.token?.object?.document?.hidden);
}

export function shouldShowCombatant(combatant, settings) {
  if (!combatant) return false;
  if (!isHiddenCombatant(combatant)) return true;
  if (game.user?.isGM) return true;
  return settings.hiddenCombatants !== HIDDEN_POLICIES.OMIT;
}

export function isAnonymousCombatant(combatant, settings) {
  return !game.user?.isGM
    && isHiddenCombatant(combatant)
    && settings.hiddenCombatants === HIDDEN_POLICIES.ANONYMOUS;
}

export function getVisibleName(combatant, settings) {
  if (isAnonymousCombatant(combatant, settings)) return game.i18n.localize("CCT.AnonymousCombatant");
  return combatant?.name || combatant?.token?.name || combatant?.actor?.name || game.i18n.localize("CCT.UnknownCombatant");
}

export function getShortName(combatant, actorConfig, settings) {
  if (isAnonymousCombatant(combatant, settings)) return game.i18n.localize("CCT.AnonymousShort");
  return actorConfig.shortName || getVisibleName(combatant, settings);
}

export function getDispositionClass(combatant, anonymous) {
  if (anonymous) return "cct-disposition-anonymous";
  const disposition = Number(combatant?.token?.disposition ?? combatant?.token?.object?.document?.disposition);
  if (disposition < 0) return "cct-disposition-hostile";
  if (disposition > 0) return "cct-disposition-friendly";
  if (disposition === 0) return "cct-disposition-neutral";
  if (combatant?.actor?.type === "character") return "cct-disposition-player";
  return "cct-disposition-unknown";
}

export function getDefeatedState(combatant) {
  if (combatant?.defeated) return true;
  const statuses = combatant?.token?.statuses
    ?? combatant?.token?.object?.document?.statuses
    ?? combatant?.token?.object?.statuses;
  if (statuses && typeof statuses.has === "function") {
    const defeated = CONFIG?.specialStatusEffects?.DEFEATED;
    return statuses.has(defeated) || statuses.has("dead") || statuses.has("unconscious");
  }
  return false;
}

export function getTokenObject(combatant) {
  return combatant?.token?.object ?? canvas?.tokens?.placeables?.find((token) => token.document?.id === combatant?.tokenId) ?? null;
}

export function canUseCombatantToken(combatant) {
  const tokenDocument = combatant?.token;
  const tokenObject = getTokenObject(combatant);
  return Boolean(tokenObject && (game.user?.isGM || tokenDocument?.isOwner || combatant?.actor?.isOwner));
}

export function selectCombatantToken(combatant) {
  if (!canUseCombatantToken(combatant)) return false;
  const tokenObject = getTokenObject(combatant);
  tokenObject?.control?.({ releaseOthers: true });
  return true;
}

export function panToCombatantToken(combatant) {
  const tokenObject = getTokenObject(combatant);
  if (!tokenObject || !(game.user?.isGM || combatant?.token?.isOwner || combatant?.actor?.isOwner)) return false;
  canvas?.animatePan?.({
    x: tokenObject.center?.x ?? tokenObject.x,
    y: tokenObject.center?.y ?? tokenObject.y
  });
  return true;
}

export function openCombatantActor(combatant) {
  if (!combatant?.actor || !(game.user?.isGM || combatant.actor.isOwner)) return false;
  const sheet = combatant.actor.sheet;
  if (!sheet?.render) return false;
  try {
    sheet.render(true);
  } catch (_error) {
    sheet.render({ force: true });
  }
  return true;
}
