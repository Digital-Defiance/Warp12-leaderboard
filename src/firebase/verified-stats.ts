import type { AiSkillLevel, PlayerStatsDocument, RatedObjective } from './schema.js';
import {
  humanObjectiveTeiStats,
  normalizeLocalAiStats,
  unassistedMatchStats,
} from './schema.js';

const AI_SKILLS: readonly AiSkillLevel[] = [
  'ensign',
  'lieutenant',
  'commander',
];

const RATED_OBJECTIVES: readonly RatedObjective[] = ['go-out', 'points'];

/** Totals from server-maintained TEI pools only (no client-writable counters). */
export interface VerifiedFleetTotals {
  matchesCompleted: number;
  matchesWon: number;
  humanMatches: number;
  practiceAiMatches: number;
}

export function verifiedFleetTotals(
  stats: PlayerStatsDocument
): VerifiedFleetTotals {
  let humanMatches = 0;
  let humanWins = 0;
  for (const objective of RATED_OBJECTIVES) {
    const bucket = humanObjectiveTeiStats(stats, objective);
    humanMatches += bucket.unassistedMatches;
    humanWins += bucket.unassistedWins;
  }

  let practiceMatches = 0;
  let practiceWins = 0;
  const localAi = normalizeLocalAiStats(stats.localAi);
  for (const skill of AI_SKILLS) {
    const solo = unassistedMatchStats(localAi[skill]);
    practiceMatches += solo.matchesCompleted;
    practiceWins += solo.matchesWon;
  }

  return {
    matchesCompleted: humanMatches + practiceMatches,
    matchesWon: humanWins + practiceWins,
    humanMatches,
    practiceAiMatches: practiceMatches,
  };
}

export function verifiedFleetWinRate(totals: VerifiedFleetTotals): number {
  if (totals.matchesCompleted <= 0) {
    return 0;
  }
  return totals.matchesWon / totals.matchesCompleted;
}
