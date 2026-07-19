import { describe, expect, it } from 'vitest';

import { resolveFederationCallSign } from './call-sign.js';

describe('resolveFederationCallSign', () => {
  it('prefers profile call sign over stats displayName', () => {
    expect(
      resolveFederationCallSign(
        { displayName: 'Nova' },
        { displayName: 'Captain' }
      )
    ).toBe('Nova');
  });

  it('falls back to stats when profile has no call sign', () => {
    expect(
      resolveFederationCallSign(null, { displayName: 'Yeager' })
    ).toBe('Yeager');
    expect(
      resolveFederationCallSign({ displayName: '  ' }, { displayName: 'Yeager' })
    ).toBe('Yeager');
  });

  it('defaults to Captain when neither is set', () => {
    expect(resolveFederationCallSign(null, null)).toBe('Captain');
  });
});
