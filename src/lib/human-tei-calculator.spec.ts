import { describe, expect, it } from 'vitest';

import {
  computeHumanTei,
  type CalculatorCaptain,
  type CalculatorRound,
} from './human-tei-calculator.js';

const veteran67: Pick<CalculatorCaptain, 'startingGrade' | 'startingRating'> = {
  startingGrade: 'V',
  startingRating: 67,
};
const consistent33: Pick<CalculatorCaptain, 'startingGrade' | 'startingRating'> = {
  startingGrade: 'C',
  startingRating: 33,
};

describe('computeHumanTei', () => {
  it('calculates TEI ratings for three-player points match', () => {
    const captains: CalculatorCaptain[] = [
      { id: 'a', name: 'A', ...veteran67, priorMatches: 12 },
      { id: 'b', name: 'B', ...veteran67, priorMatches: 12 },
      { id: 'c', name: 'C', ...consistent33, priorMatches: 12 },
    ];
    const rounds: CalculatorRound[] = [
      { id: 'r1', pipsByCaptainId: { a: '10', b: '20', c: '30' } },
    ];

    const result = computeHumanTei('points', captains, rounds);
    expect('rows' in result).toBe(true);
    if (!('rows' in result)) return;

    const byName = Object.fromEntries(result.rows.map((row) => [row.name, row]));

    // Winner (A) gains rating
    const scoreA_before = parseInt(byName.A!.gradeBefore.slice(1), 10);
    const scoreA_after  = parseInt(byName.A!.gradeAfter.slice(1), 10);
    expect(scoreA_after).toBeGreaterThanOrEqual(scoreA_before);
    expect(byName.A!.rank).toBe(1);

    // Loser (C) loses rating
    const scoreC_before = parseInt(byName.C!.gradeBefore.slice(1), 10);
    const scoreC_after  = parseInt(byName.C!.gradeAfter.slice(1), 10);
    expect(scoreC_after).toBeLessThanOrEqual(scoreC_before);
    expect(byName.C!.rank).toBe(3);

    // All scores in 0-99 range
    for (const row of result.rows) {
      const score = parseInt(row.gradeAfter.slice(1), 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(99);
    }
  });

  it('ranks go-out by tiles left with a single victor', () => {
    const captains: CalculatorCaptain[] = [
      { id: 'a', name: 'A', ...veteran67, priorMatches: 12 },
      { id: 'b', name: 'B', ...veteran67, priorMatches: 12 },
      { id: 'c', name: 'C', ...consistent33, priorMatches: 12 },
    ];
    const rounds: CalculatorRound[] = [
      { id: 'r1', pipsByCaptainId: { a: '0', b: '4', c: '8' } },
    ];

    const result = computeHumanTei('go-out', captains, rounds);
    expect('rows' in result).toBe(true);
    if (!('rows' in result)) return;

    const byName = Object.fromEntries(result.rows.map((row) => [row.name, row]));

    expect(byName.A!.rank).toBe(1); // Winner (0 tiles)
    expect(byName.B!.rank).toBe(2);
    expect(byName.C!.rank).toBe(3);

    // Winner's score should not decrease
    const scoreA_before = parseInt(byName.A!.gradeBefore.slice(1), 10);
    const scoreA_after  = parseInt(byName.A!.gradeAfter.slice(1), 10);
    expect(scoreA_after).toBeGreaterThanOrEqual(scoreA_before);

    for (const row of result.rows) {
      const score = parseInt(row.gradeAfter.slice(1), 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(99);
    }
  });
});
