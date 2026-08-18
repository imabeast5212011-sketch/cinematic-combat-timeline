import { getCombatTurns } from "./combat-adapter.js?v=0.1.14";
import { getTimelineSettings } from "./settings.js?v=0.1.14";
import {
  applyCountdownTick,
  getCountdownPosition,
  getCountdowns,
  getTurnPosition,
  saveCountdowns
} from "./countdown-service.js?v=0.1.14";

function activeGmIds() {
  return (game.users?.contents ?? Array.from(game.users ?? []))
    .filter((user) => user?.active && user?.isGM)
    .map((user) => user.id)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function isAuthoritativeGm() {
  if (!game.user?.isGM) return false;
  const [firstGmId] = activeGmIds();
  return firstGmId === game.user.id;
}

function isForwardProgression(prior, current) {
  if (!prior || !current) return false;
  const priorRound = Number(prior.round) || 0;
  const currentRound = Number(current.round) || 0;
  if (currentRound > priorRound) return true;
  if (currentRound < priorRound) return false;
  const priorTurn = Number.isInteger(prior.turn) ? prior.turn : -1;
  const currentTurn = Number.isInteger(current.turn) ? current.turn : -1;
  return currentTurn > priorTurn;
}

function crossedRoundsForPosition(position, turns, prior, current) {
  const rounds = [];
  const priorRound = Math.max(0, Number(prior.round) || 0);
  const currentRound = Number(current.round) || 0;
  if (currentRound <= 0) return rounds;

  for (let round = Math.max(1, priorRound || 1); round <= currentRound; round += 1) {
    const startAfter = round === priorRound && Number.isInteger(prior.turn)
      ? getTurnPosition(prior.turn)
      : Number.NEGATIVE_INFINITY;
    const endAt = round === currentRound && Number.isInteger(current.turn)
      ? getTurnPosition(current.turn)
      : (turns.length * 10) + 10;
    if (position > startAfter && position <= endAt) rounds.push(round);
  }
  return rounds;
}

export async function processCountdownProgression(combat, prior, current) {
  const settings = getTimelineSettings();
  if (!settings.enabled || !settings.enableCountdowns || !combat || !isAuthoritativeGm()) return;
  if (!isForwardProgression(prior, current)) return;

  const turns = getCombatTurns(combat);
  if (!turns.length) return;

  const countdowns = getCountdowns(combat);
  let changed = false;

  for (const countdown of countdowns) {
    if (!countdown.active) continue;
    const position = getCountdownPosition(countdown, turns);
    const crossedRounds = crossedRoundsForPosition(position, turns, prior, current);
    for (const round of crossedRounds) {
      if (countdown.processedRounds.includes(round)) continue;
      applyCountdownTick(countdown, round);
      changed = true;
      break;
    }
  }

  if (changed) await saveCountdowns(combat, countdowns);
}
