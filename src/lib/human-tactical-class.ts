/** Human-pool TEI → Tactical Class (TEI spec §7.2). */
export type HumanTacticalClass = 'I' | 'II' | 'III' | 'IV';

const TAGLINES: Record<HumanTacticalClass, string> = {
  IV: 'Provisional / New Profile',
  III: 'Competent / Standard',
  II: 'Veteran / Sharp',
  I: 'Elite / Master',
};

export function teiToHumanTacticalClass(tei: number): HumanTacticalClass {
  if (tei < 1100) {
    return 'IV';
  }
  if (tei < 1350) {
    return 'III';
  }
  if (tei < 1450) {
    return 'II';
  }
  return 'I';
}

export function formatHumanTacticalClass(
  tei: number,
  options?: { short?: boolean }
): string {
  const cls = teiToHumanTacticalClass(tei);
  return options?.short ? `Cls ${cls}` : `Class ${cls}`;
}

export function humanTacticalClassTagline(tei: number): string {
  return TAGLINES[teiToHumanTacticalClass(tei)];
}
