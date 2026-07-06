import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RatedMatchCertificate } from '../firebase/rated-match-schema.js';
import { downloadMatchCertificate } from './match-certificate.js';

describe('downloadMatchCertificate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads JSON with the match code in the filename', () => {
    const cert: RatedMatchCertificate = {
      version: 1,
      matchCode: 'MT-TEST',
      issuedAt: '2026-07-06T00:00:00.000Z',
      objective: 'points',
      players: [],
    };

    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement;
    const createElement = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cert');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadMatchCertificate(cert);

    expect(createElement).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('warp12-MT-TEST-certificate.json');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cert');
  });
});
