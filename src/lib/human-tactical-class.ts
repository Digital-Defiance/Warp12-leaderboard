/** Display TEI (0-99) → federation commission (coarse bands for leaderboard). */
export type HumanTacticalClass = 'I' | 'II' | 'III' | 'IV';

const LABELS: Record<
  HumanTacticalClass,
  { readonly short: string; readonly long: string; readonly tagline: string }
> = {
  IV: {
    short: 'Ens.',
    long: 'Ensign',
    tagline: 'Provisional / New Profile',
  },
  III: {
    short: 'Lt.',
    long: 'Lieutenant',
    tagline: 'Competent / Standard',
  },
  II: {
    short: 'Cmdr.',
    long: 'Commander',
    tagline: 'Veteran / Sharp',
  },
  I: {
    short: 'Flag',
    long: 'Flag Officer',
    tagline: 'Elite / Master',
  },
};

export function teiToHumanTacticalClass(displayTei: number): HumanTacticalClass {
  // Display TEI is 0-99 (μ - 3σ normalized)
  if (displayTei < 15) {
    return 'IV';
  }
  if (displayTei < 25) {
    return 'III';
  }
  if (displayTei < 35) {
    return 'II';
  }
  return 'I';
}

export function formatHumanTacticalClass(
  tei: number,
  options?: { short?: boolean }
): string {
  const cls = teiToHumanTacticalClass(tei);
  const labels = LABELS[cls];
  return options?.short ? labels.short : labels.long;
}

export function humanTacticalClassTagline(tei: number): string {
  return LABELS[teiToHumanTacticalClass(tei)].tagline;
}
