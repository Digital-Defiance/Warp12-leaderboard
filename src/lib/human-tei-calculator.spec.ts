import { describe, expect, it } from 'vitest';

import {
  computeHumanTei,
  type CalculatorCaptain,
  type CalculatorRound,
} from './human-tei-calculator.js';

describe('computeHumanTei', () => {
  it('matches TEI spec §8.3 three-player pairwise update on points track', () => {
    const captains: CalculatorCaptain[] = [
      { id: 'a', name: 'A', startingTei: 1200, priorMatches: 12 },
      { id: 'b', name: 'B', startingTei: 1200, priorMatches: 12 },
      { id: 'c', name: 'C', startingTei: 1000, priorMatches: 12 },
    ];
    const rounds: CalculatorRound[] = [
      {
        id: 'r1',
        pipsByCaptainId: { a: '10', b: '20', c: '30' },
      },
    ];

    const result = computeHumanTei('points', captains, rounds);
    expect('rows' in result).toBe(true);
    if (!('rows' in result)) {
      return;
    }

    const byName = Object.fromEntries(result.rows.map((row) => [row.name, row]));
    expect(byName.A?.teiAfter).toBe(1212);
    expect(byName.B?.teiAfter).toBe(1196);
    expect(byName.C?.teiAfter).toBe(992);
  });

  it('ranks go-out by tiles left with a single victor', () => {
    const captains: CalculatorCaptain[] = [
      { id: 'a', name: 'A', startingTei: 1200, priorMatches: 12 },
      { id: 'b', name: 'B', startingTei: 1200, priorMatches: 12 },
      { id: 'c', name: 'C', startingTei: 1000, priorMatches: 12 },
    ];
    const rounds: CalculatorRound[] = [
      {
        id: 'r1',
        pipsByCaptainId: { a: '0', b: '4', c: '8' },
      },
    ];

    const result = computeHumanTei('go-out', captains, rounds);
    expect('rows' in result).toBe(true);
    if (!('rows' in result)) {
      return;
    }

    const byName = Object.fromEntries(result.rows.map((row) => [row.name, row]));
    expect(byName.A?.rank).toBe(1);
    expect(byName.A?.teiAfter).toBe(1212);
    expect(byName.B?.rank).toBe(2);
    expect(byName.C?.rank).toBe(3);
  });
});
