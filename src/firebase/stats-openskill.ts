import type { AiSkillLevel } from './schema.js';
import type { RatedObjective } from './schema.js';
import type { StoredRating } from './schema.js';

/**
 * Leaderboard stats utilities - TEI rating helpers.
 * 
 * NOTE: All rating calculations happen server-side in Cloud Functions using OpenSkill.
 * This file provides read-only helpers and display utilities.
 * 
 * The leaderboard calculator is UNOFFICIAL - it provides rough estimates
 * but does not actually update Firebase. Only Cloud Functions can write ratings.
 */

/** Default starting rating for new players (μ=25, σ=8.33 → display ~0, grade P). */
export const DEFAULT_RATING: StoredRating = {
  mu: 25,
  sigma: 8.333333333333334,
  matches: 0,
  displayRating: 0,
  displayGrade: 'P00',
};

/**
 * AI anchor ratings (read-only reference).
 * These are the fixed skill estimates used server-side for rating AI opponents.
 * Values here are for display/calculator purposes only.
 */
export const AI_ANCHORS = {
  points: {
    ensign: { mu: 18.0, sigma: 2.0, matches: 9999, displayRating: 12, displayGrade: 'I12' },
    lieutenant: { mu: 26.5, sigma: 1.8, matches: 9999, displayRating: 21, displayGrade: 'V21' },
    commander: { mu: 35.0, sigma: 1.5, matches: 9999, displayRating: 30, displayGrade: 'V30' },
  },
  goOut: {
    ensign: { mu: 17.5, sigma: 2.2, matches: 9999, displayRating: 11, displayGrade: 'I11' },
    lieutenant: { mu: 28.0, sigma: 2.0, matches: 9999, displayRating: 22, displayGrade: 'C22' },
    commander: { mu: 41.5, sigma: 2.2, matches: 9999, displayRating: 35, displayGrade: 'C35' },
  },
} as const;

/** Get AI anchor rating for display purposes. */
export function getAiAnchorRating(
  objective: RatedObjective,
  skill: AiSkillLevel
): StoredRating {
  const track = objective === 'go-out' ? 'goOut' : 'points';
  return AI_ANCHORS[track][skill];
}

/** Legacy compatibility - returns display rating for AI anchor. */
export function opponentTeiForObjective(
  objective: RatedObjective,
  skill: AiSkillLevel
): number {
  return getAiAnchorRating(objective, skill).displayRating;
}

/** Resolve effective rating for display (handles missing/undefined data). */
export function resolveEffectiveRating(
  storedRating: StoredRating | undefined,
  unassistedMatches: number,
  startingRating?: StoredRating
): StoredRating {
  if (unassistedMatches > 0 && storedRating) {
    return storedRating;
  }
  return storedRating ?? startingRating ?? DEFAULT_RATING;
}

/** Display rating as TEI grade string (e.g., "V67", "P25"). */
export function displayRatingAsGrade(rating: StoredRating | undefined): string | null {
  if (!rating) return null;
  
  // Grade based on confidence (σ)
  const sigma = rating.sigma;
  let grade: string;
  if (sigma < 0.5) grade = 'E';       // Elite
  else if (sigma < 1.5) grade = 'V';  // Veteran
  else if (sigma < 2.5) grade = 'C';  // Consistent
  else if (sigma < 4.0) grade = 'I';  // Improving
  else grade = 'P';                    // Provisional
  
  // Score from display rating (already normalized 0-99)
  const score = Math.max(0, Math.min(99, Math.round(rating.displayRating)));
  
  return `${grade}${score}`;
}

/** Rank entries by score with tie-handling (competition ranking). */
export function rankCompetition(
  entries: readonly { playerId: string; score: number }[],
  lowerIsBetter = true
): Map<string, number> {
  const sorted = [...entries].sort((left, right) =>
    lowerIsBetter ? left.score - right.score : right.score - left.score
  );
  const ranks = new Map<string, number>();
  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index]!;
    if (index > 0 && sorted[index - 1]!.score === entry.score) {
      // Tie - use same rank as previous
      ranks.set(entry.playerId, ranks.get(sorted[index - 1]!.playerId)!);
    } else {
      // New rank
      ranks.set(entry.playerId, index + 1);
    }
  }
  return ranks;
}

/** Format percentile rank (e.g., rank 1 of 25 → "Top 4%"). */
export function formatTopPercentile(rank: number, total: number): string {
  if (total <= 0) {
    return '—';
  }
  if (total === 1) {
    return 'Top 100%';
  }
  const pct = Math.max(1, Math.min(100, Math.round((rank / total) * 100)));
  return `Top ${pct}%`;
}
