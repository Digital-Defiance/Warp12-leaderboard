import { describe, expect, it } from 'vitest';

import {
  formatCrewInviteCode,
  normalizeCrewInviteCode,
} from '../firebase/charter-schema.js';

describe('leaderboard charter-schema helpers', () => {
  it('round-trips CREW- codes', () => {
    expect(formatCrewInviteCode(normalizeCrewInviteCode('crew-ab12'))).toBe(
      'CREW-AB12'
    );
  });
});
