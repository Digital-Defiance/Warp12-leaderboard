import { describe, expect, it } from 'vitest';

import type { PlayerStatsDocument } from './schema.js';
import {
  displayGroupObjectiveTei,
  displayHumanObjectiveTei,
  groupObjectiveTeiStats,
} from './schema.js';

describe('group TEI display helpers', () => {
  const stats: PlayerStatsDocument = {
    uid: 'u1',
    displayName: 'Captain',
    matchesCompleted: 4,
    matchesWon: 2,
    roundsPlayed: 0,
    roundsWon: 0,
    totalPoints: 0,
    humanTei: {
      points: { unassistedMatches: 3, unassistedWins: 2, unassistedTei: 1210 },
    },
    groupTei: {
      'crew-a': {
        points: { unassistedMatches: 2, unassistedWins: 1, unassistedTei: 1188 },
        goOut: { unassistedMatches: 1, unassistedWins: 0, unassistedTei: 1195 },
      },
    },
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('reads scoped crew buckets independently', () => {
    const points = groupObjectiveTeiStats(stats, 'crew-a', 'points');
    expect(points.unassistedMatches).toBe(2);
    expect(displayGroupObjectiveTei(stats, 'crew-a', 'points')).toBe(1188);
    expect(displayGroupObjectiveTei(stats, 'crew-a', 'go-out')).toBe(1195);
  });

  it('keeps global human TEI separate from crew tracks', () => {
    expect(displayHumanObjectiveTei(stats, 'points')).toBe(1210);
    expect(displayGroupObjectiveTei(stats, 'crew-a', 'points')).not.toBe(1210);
  });
});
