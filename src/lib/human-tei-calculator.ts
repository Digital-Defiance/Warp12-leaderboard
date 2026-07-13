import type { RatedObjective } from '../firebase/schema.js';
import {
  updateFFARatings,
  getTeiDisplay,
  getTeiGradeName,
  type PlayerRating,
  type TeiGrade,
} from 'warp12-engine';
import {
  formatHumanTacticalClass,
  humanTacticalClassTagline,
} from './human-tactical-class.js';

/**
 * TEI Calculator - OpenSkill Edition
 *
 * Uses the same OpenSkill rating algorithm as the server.
 * Results are UNOFFICIAL estimates - actual ratings are calculated server-side.
 */

export type CalculatorObjective = RatedObjective;

/**
 * Grade letter options for the captain input selector.
 * Each maps to a typical σ midpoint used for estimation.
 */
export const GRADE_OPTIONS: readonly { grade: TeiGrade; label: string; sigmaEstimate: number }[] =
  [
    { grade: 'P', label: 'P — Provisional', sigmaEstimate: 6.5 },
    { grade: 'I', label: 'I — Improving', sigmaEstimate: 3.2 },
    { grade: 'C', label: 'C — Consistent', sigmaEstimate: 2.0 },
    { grade: 'V', label: 'V — Veteran', sigmaEstimate: 1.0 },
    { grade: 'E', label: 'E — Elite', sigmaEstimate: 0.35 },
  ] as const;

/** Parse a formatted grade string like "V67" into parts. Returns null if unparseable. */
export function parseGradeString(
  raw: string
): { grade: TeiGrade; score: number } | null {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.length < 2) return null;
  const letter = trimmed[0] as TeiGrade;
  if (!['E', 'V', 'C', 'I', 'P'].includes(letter)) return null;
  const score = parseInt(trimmed.slice(1), 10);
  if (!Number.isFinite(score) || score < 0 || score > 99) return null;
  return { grade: letter, score };
}

/** Format a grade + score number into a display string like "V67". */
export function formatGrade(grade: TeiGrade, score: number): string {
  return `${grade}${Math.max(0, Math.min(99, Math.round(score)))}`;
}

export interface CalculatorCaptain {
  readonly id: string;
  readonly name: string;
  /** Letter grade (E/V/C/I/P) */
  readonly startingGrade: TeiGrade;
  /** Rating number within the grade, 0-99 (TEI = grade + rating, e.g. "V67") */
  readonly startingRating: number;
  readonly priorMatches: number;
}

export interface CalculatorRound {
  readonly id: string;
  readonly pipsByCaptainId: Readonly<Record<string, string>>;
}

export interface CalculatorResultRow {
  readonly captainId: string;
  readonly name: string;
  readonly roundValues: readonly number[];
  readonly standingValue: number;
  readonly standingLabel: string;
  readonly rank: number;
  readonly gradeBefore: string;   // e.g. "V67"
  readonly gradeAfter: string;    // e.g. "V70"
  readonly ratingDelta: number;   // numeric change in 0-99 rating
  readonly gradeChanged: boolean;
  readonly tacticalClassAfter: string;
  readonly tacticalTaglineAfter: string;
}

export interface CalculatorResult {
  readonly objective: CalculatorObjective;
  readonly rows: readonly CalculatorResultRow[];
  readonly roundCount: number;
}

export type CalculatorError =
  | { kind: 'captains'; message: string }
  | { kind: 'scores'; message: string };

// ─── Internal helpers ────────────────────────────────────────────────────────

function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) return null;
  return parsed;
}

function rankCompetition(
  entries: readonly { playerId: string; score: number }[],
  lowerIsBetter = true
): Map<string, number> {
  const sorted = [...entries].sort((l, r) =>
    lowerIsBetter ? l.score - r.score : r.score - l.score
  );
  const ranks = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]!;
    if (i > 0 && sorted[i - 1]!.score === entry.score) {
      ranks.set(entry.playerId, ranks.get(sorted[i - 1]!.playerId)!);
    } else {
      ranks.set(entry.playerId, i + 1);
    }
  }
  return ranks;
}

/**
 * Reconstruct a PlayerRating from grade + score.
 *
 * We know: score = clamp(((μ - 3σ) - 10) / 40 * 99, 0, 99)
 * So:      μ - 3σ ≈ (score / 99) * 40 + 10
 *
 * σ is estimated from the grade's typical midpoint (matches-adjusted).
 * This is an approximation — the calculator is an unofficial estimate anyway.
 */
function resolveStartingRating(captain: CalculatorCaptain): PlayerRating {
  const gradeOption =
    GRADE_OPTIONS.find((g) => g.grade === captain.startingGrade) ?? GRADE_OPTIONS[0]!;

  // Adjust σ down slightly with match experience (more games = more certainty)
  const matchFactor = Math.min(1, captain.priorMatches / 50);
  const sigma = gradeOption.sigmaEstimate * (1 - 0.3 * matchFactor);

  // Reverse-engineer μ from rating: conservative = (rating / 99) * 40 + 10
  // conservative = μ - 3σ  →  μ = conservative + 3σ
  const conservative = (captain.startingRating / 99) * 40 + 10;
  const mu = conservative + 3 * sigma;

  return {
    mu: Math.max(1, mu),
    sigma,
    matches: captain.priorMatches,
  };
}

function buildResultRows(
  captains: readonly CalculatorCaptain[],
  rankedPlayers: Map<
    string,
    { rank: number; ratingBefore: PlayerRating; ratingAfter: PlayerRating }
  >,
  standings: readonly {
    captainId: string;
    roundValues: readonly number[];
    standingValue: number;
    standingLabel: string;
  }[]
): CalculatorResultRow[] {
  return captains.map((captain) => {
    const standing = standings.find((r) => r.captainId === captain.id)!;
    const player = rankedPlayers.get(captain.id)!;

    const displayBefore = getTeiDisplay(player.ratingBefore, captain.startingGrade);
    const displayAfter = getTeiDisplay(player.ratingAfter, displayBefore.grade);

    const gradeBefore = displayBefore.formatted;
    const gradeAfter = displayAfter.formatted;
    const ratingDelta = displayAfter.score - displayBefore.score;
    const gradeChanged = displayAfter.grade !== displayBefore.grade;

    return {
      captainId: captain.id,
      name: captain.name.trim() || 'Captain',
      roundValues: standing.roundValues,
      standingValue: standing.standingValue,
      standingLabel: standing.standingLabel,
      rank: player.rank,
      gradeBefore,
      gradeAfter,
      ratingDelta,
      gradeChanged,
      tacticalClassAfter: formatHumanTacticalClass(displayAfter.score),
      tacticalTaglineAfter: humanTacticalClassTagline(displayAfter.score),
    };
  });
}

function validateCaptains(captains: readonly CalculatorCaptain[]): CalculatorError | null {
  if (captains.length < 2) {
    return { kind: 'captains', message: 'At least two captains are required.' };
  }
  if (captains.filter((c) => c.name.trim().length > 0).length < 2) {
    return { kind: 'captains', message: 'Enter a call sign for at least two captains.' };
  }
  return null;
}

function parseRoundGrid(
  captains: readonly CalculatorCaptain[],
  rounds: readonly CalculatorRound[],
  valueLabel: string
):
  | { ok: true; valuesByCaptain: Map<string, number[]> }
  | { ok: false; error: CalculatorError } {
  if (rounds.length === 0) {
    return { ok: false, error: { kind: 'scores', message: `Add at least one round of ${valueLabel}.` } };
  }
  const valuesByCaptain = new Map<string, number[]>();
  for (const captain of captains) valuesByCaptain.set(captain.id, []);

  for (let ri = 0; ri < rounds.length; ri++) {
    const round = rounds[ri]!;
    for (const captain of captains) {
      const parsed = parseWholeNumber(round.pipsByCaptainId[captain.id] ?? '');
      if (parsed == null) {
        return {
          ok: false,
          error: {
            kind: 'scores',
            message: `Round ${ri + 1}: enter a whole-number ${valueLabel} for every captain.`,
          },
        };
      }
      valuesByCaptain.get(captain.id)!.push(parsed);
    }
  }
  return { ok: true, valuesByCaptain };
}

function runRatings(
  captains: readonly CalculatorCaptain[],
  standings: readonly { captainId: string; standingValue: number }[],
  lowerIsBetter: boolean
): Map<string, { rank: number; ratingBefore: PlayerRating; ratingAfter: PlayerRating }> {
  const ranks = rankCompetition(
    standings.map((r) => ({ playerId: r.captainId, score: r.standingValue })),
    lowerIsBetter
  );
  const players = captains.map((c) => ({
    playerId: c.id,
    rating: resolveStartingRating(c),
    rank: ranks.get(c.id) ?? captains.length,
  }));
  const updatedRatings = updateFFARatings(players);
  return new Map(
    players.map((p) => [
      p.playerId,
      { rank: p.rank, ratingBefore: p.rating, ratingAfter: updatedRatings.get(p.playerId)! },
    ])
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function computeHumanTei(
  objective: CalculatorObjective,
  captains: readonly CalculatorCaptain[],
  rounds: readonly CalculatorRound[]
): CalculatorResult | CalculatorError {
  const err = validateCaptains(captains);
  if (err) return err;
  return objective === 'points'
    ? computePointsHumanTei(captains, rounds)
    : computeGoOutHumanTei(captains, rounds);
}

function computePointsHumanTei(
  captains: readonly CalculatorCaptain[],
  rounds: readonly CalculatorRound[]
): CalculatorResult | CalculatorError {
  const parsed = parseRoundGrid(captains, rounds, 'points');
  if (!parsed.ok) return parsed.error;

  const standings = captains.map((c) => {
    const roundValues = parsed.valuesByCaptain.get(c.id)!;
    const standingValue = roundValues.reduce((s, v) => s + v, 0);
    return { captainId: c.id, roundValues, standingValue, standingLabel: `${standingValue} points` };
  });

  const rankedPlayers = runRatings(captains, standings, true);
  const rows = buildResultRows(captains, rankedPlayers, standings);
  return { objective: 'points', rows: [...rows].sort((a, b) => a.rank - b.rank), roundCount: rounds.length };
}

function computeGoOutHumanTei(
  captains: readonly CalculatorCaptain[],
  rounds: readonly CalculatorRound[]
): CalculatorResult | CalculatorError {
  const parsed = parseRoundGrid(captains, rounds, 'tile count');
  if (!parsed.ok) return parsed.error;

  if (rounds.length !== 1) {
    return { kind: 'scores', message: 'Go-out rates one sector at a time — use a single row.' };
  }

  const standings = captains.map((c) => {
    const roundValues = parsed.valuesByCaptain.get(c.id)!;
    const tilesLeft = roundValues[0]!;
    return {
      captainId: c.id,
      roundValues,
      standingValue: tilesLeft,
      standingLabel: tilesLeft === 0 ? 'Winner · empty hand' : `${tilesLeft} tile${tilesLeft === 1 ? '' : 's'} left`,
    };
  });

  if (standings.filter((r) => r.standingValue === 0).length !== 1) {
    return { kind: 'scores', message: 'Go-out: exactly one captain must have 0 tiles left.' };
  }

  const rankedPlayers = runRatings(captains, standings, true);
  const rows = buildResultRows(captains, rankedPlayers, standings);
  return { objective: 'go-out', rows: [...rows].sort((a, b) => a.rank - b.rank), roundCount: 1 };
}

export const DEFAULT_ROUNDS_BY_OBJECTIVE: Record<CalculatorObjective, number> = {
  points: 13,
  'go-out': 1,
};

/** Default grade for new captains added to the calculator. */
export const DEFAULT_CAPTAIN_GRADE: TeiGrade = 'P';
export const DEFAULT_CAPTAIN_RATING = 0;

/** Get the full grade name for a TeiGrade letter (re-exported for UI). */
export { getTeiGradeName };
