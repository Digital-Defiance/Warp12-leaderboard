import type { RatedObjective } from '../firebase/schema.js';
import {
  kFactor,
  rankCompetition,
  resolveEffectivePlayerTei,
  updateTeiMultiplayerPairwise,
  type TeiRankedPlayer,
} from '../firebase/stats-elo.js';
import {
  formatHumanTacticalClass,
  humanTacticalClassTagline,
} from './human-tactical-class.js';

export type CalculatorObjective = RatedObjective;

export interface CalculatorCaptain {
  readonly id: string;
  readonly name: string;
  readonly startingTei: number;
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
  readonly teiBefore: number;
  readonly teiAfter: number;
  readonly teiDelta: number;
  readonly kFactor: number;
  readonly tacticalClassBefore: string;
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

function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function buildTeiTable(
  captains: readonly CalculatorCaptain[],
  ranks: ReadonlyMap<string, number>
): TeiRankedPlayer[] {
  return captains.map((captain) => ({
    playerId: captain.id,
    rank: ranks.get(captain.id) ?? captains.length,
    tei: resolveEffectivePlayerTei(
      captain.startingTei,
      captain.priorMatches,
      captain.startingTei
    ),
    unassistedMatches: captain.priorMatches,
  }));
}

function buildResultRows(
  captains: readonly CalculatorCaptain[],
  table: readonly TeiRankedPlayer[],
  standings: readonly {
    captainId: string;
    roundValues: readonly number[];
    standingValue: number;
    standingLabel: string;
  }[]
): CalculatorResultRow[] {
  return captains.map((captain) => {
    const standing = standings.find((row) => row.captainId === captain.id)!;
    const playerRow = table.find((entry) => entry.playerId === captain.id)!;
    const teiBefore = playerRow.tei;
    const teiAfter = updateTeiMultiplayerPairwise(playerRow, table);
    const k = kFactor(captain.priorMatches);

    return {
      captainId: captain.id,
      name: captain.name.trim() || 'Captain',
      roundValues: standing.roundValues,
      standingValue: standing.standingValue,
      standingLabel: standing.standingLabel,
      rank: playerRow.rank,
      teiBefore,
      teiAfter,
      teiDelta: teiAfter - teiBefore,
      kFactor: k,
      tacticalClassBefore: formatHumanTacticalClass(teiBefore),
      tacticalClassAfter: formatHumanTacticalClass(teiAfter),
      tacticalTaglineAfter: humanTacticalClassTagline(teiAfter),
    };
  });
}

function validateCaptains(captains: readonly CalculatorCaptain[]): CalculatorError | null {
  if (captains.length < 2) {
    return {
      kind: 'captains',
      message: 'At least two captains are required for human-pool TEI.',
    };
  }

  const named = captains.filter((captain) => captain.name.trim().length > 0);
  if (named.length < 2) {
    return {
      kind: 'captains',
      message: 'Enter a call sign for at least two captains.',
    };
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
    return {
      ok: false,
      error: {
        kind: 'scores',
        message: `Add at least one round of ${valueLabel}.`,
      },
    };
  }

  const valuesByCaptain = new Map<string, number[]>();
  for (const captain of captains) {
    valuesByCaptain.set(captain.id, []);
  }

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
    const round = rounds[roundIndex]!;
    for (const captain of captains) {
      const parsed = parseWholeNumber(round.pipsByCaptainId[captain.id] ?? '');
      if (parsed == null) {
        return {
          ok: false,
          error: {
            kind: 'scores',
            message: `Round ${roundIndex + 1}: enter a whole-number ${valueLabel} for every captain.`,
          },
        };
      }
      valuesByCaptain.get(captain.id)!.push(parsed);
    }
  }

  return { ok: true, valuesByCaptain };
}

export function computeHumanTei(
  objective: CalculatorObjective,
  captains: readonly CalculatorCaptain[],
  rounds: readonly CalculatorRound[]
): CalculatorResult | CalculatorError {
  const captainError = validateCaptains(captains);
  if (captainError) {
    return captainError;
  }

  if (objective === 'points') {
    return computePointsHumanTei(captains, rounds);
  }

  return computeGoOutHumanTei(captains, rounds);
}

function computePointsHumanTei(
  captains: readonly CalculatorCaptain[],
  rounds: readonly CalculatorRound[]
): CalculatorResult | CalculatorError {
  const parsed = parseRoundGrid(captains, rounds, 'pip count');
  if (!parsed.ok) {
    return parsed.error;
  }

  const standings = captains.map((captain) => {
    const roundValues = parsed.valuesByCaptain.get(captain.id)!;
    const standingValue = roundValues.reduce((sum, value) => sum + value, 0);
    return {
      captainId: captain.id,
      roundValues,
      standingValue,
      standingLabel: `${standingValue} pips`,
    };
  });

  const ranks = rankCompetition(
    standings.map((row) => ({ playerId: row.captainId, score: row.standingValue })),
    true
  );
  const table = buildTeiTable(captains, ranks);
  const rows = buildResultRows(captains, table, standings);

  return {
    objective: 'points',
    rows: [...rows].sort((left, right) => left.rank - right.rank),
    roundCount: rounds.length,
  };
}

function computeGoOutHumanTei(
  captains: readonly CalculatorCaptain[],
  rounds: readonly CalculatorRound[]
): CalculatorResult | CalculatorError {
  const parsed = parseRoundGrid(captains, rounds, 'tile count');
  if (!parsed.ok) {
    return parsed.error;
  }

  if (rounds.length !== 1) {
    return {
      kind: 'scores',
      message: 'Go-out rates one sector at a time — use a single row (tiles left at finish).',
    };
  }

  const standings = captains.map((captain) => {
    const roundValues = parsed.valuesByCaptain.get(captain.id)!;
    const tilesLeft = roundValues[0]!;
    return {
      captainId: captain.id,
      roundValues,
      standingValue: tilesLeft,
      standingLabel:
        tilesLeft === 0 ? 'Winner · empty hand' : `${tilesLeft} tile${tilesLeft === 1 ? '' : 's'} left`,
    };
  });

  const winners = standings.filter((row) => row.standingValue === 0);
  if (winners.length !== 1) {
    return {
      kind: 'scores',
      message:
        'Go-out: exactly one captain must have 0 tiles left (the captain who went out first).',
    };
  }

  const ranks = rankCompetition(
    standings.map((row) => ({ playerId: row.captainId, score: row.standingValue })),
    true
  );
  const table = buildTeiTable(captains, ranks);
  const rows = buildResultRows(captains, table, standings);

  return {
    objective: 'go-out',
    rows: [...rows].sort((left, right) => left.rank - right.rank),
    roundCount: 1,
  };
}

/** @deprecated Use computeHumanTei('points', ...) */
export function computeHumanTeiFromPips(
  captains: readonly CalculatorCaptain[],
  rounds: readonly CalculatorRound[]
): CalculatorResult | CalculatorError {
  return computeHumanTei('points', captains, rounds);
}

export const DEFAULT_ROUNDS_BY_OBJECTIVE: Record<CalculatorObjective, number> = {
  points: 13,
  'go-out': 1,
};
