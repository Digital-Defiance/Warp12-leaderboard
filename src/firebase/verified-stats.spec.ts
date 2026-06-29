import { describe, expect, it } from 'vitest';

import type { PlayerStatsDocument } from './schema.js';
import { emptyLocalAiSkillStats, emptyLocalAiStats } from './schema.js';
import { verifiedFleetTotals, verifiedFleetWinRate } from './verified-stats.js';

describe('verifiedFleetTotals', () => {
  it('sums officiated human and replay-verified practice matches', () => {
    const stats: PlayerStatsDocument = {
      uid: 'u1',
      displayName: 'Captain',
      matchesCompleted: 99,
      matchesWon: 88,
      roundsPlayed: 0,
      roundsWon: 0,
      totalPoints: 0,
      humanTei: {
        goOut: { unassistedMatches: 2, unassistedWins: 1, unassistedTei: 1010 },
      },
      localAi: {
        ...emptyLocalAiStats(),
        ensign: {
          ...emptyLocalAiSkillStats(),
          matchesCompleted: 5,
          matchesWon: 3,
          advisorMatches: 1,
          advisorWins: 1,
          goOut: { unassistedMatches: 2, unassistedWins: 1, unassistedTei: 1008 },
        },
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const totals = verifiedFleetTotals(stats);
    expect(totals.humanMatches).toBe(2);
    expect(totals.practiceAiMatches).toBe(4);
    expect(totals.matchesCompleted).toBe(6);
    expect(totals.matchesWon).toBe(3);
    expect(verifiedFleetWinRate(totals)).toBeCloseTo(3 / 6);
  });

  it('handles partial localAi buckets from Firestore merge writes', () => {
    const stats: PlayerStatsDocument = {
      uid: 'u2',
      displayName: 'Partial',
      matchesCompleted: 1,
      matchesWon: 1,
      roundsPlayed: 0,
      roundsWon: 0,
      totalPoints: 0,
      localAi: {
        commander: {
          ...emptyLocalAiSkillStats(),
          matchesCompleted: 1,
          matchesWon: 1,
          goOut: { unassistedMatches: 1, unassistedWins: 1, unassistedTei: 1012 },
        },
      } as PlayerStatsDocument['localAi'],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(() => verifiedFleetTotals(stats)).not.toThrow();
    expect(verifiedFleetTotals(stats).practiceAiMatches).toBe(1);
  });
});
