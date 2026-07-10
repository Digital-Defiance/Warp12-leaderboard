import { describe, expect, it } from 'vitest';

import { stripUndefined } from './strip-undefined.js';

describe('stripUndefined', () => {
  it('removes undefined top-level and nested fields', () => {
    expect(
      stripUndefined({
        bio: undefined,
        displayName: 'Armstrong',
        gamingIds: {
          appleGameCenter: undefined,
          xboxLive: 'player1',
        },
      })
    ).toEqual({
      displayName: 'Armstrong',
      gamingIds: {
        xboxLive: 'player1',
      },
    });
  });

  it('preserves null values', () => {
    expect(stripUndefined({ roundWinnerId: null })).toEqual({
      roundWinnerId: null,
    });
  });
});
