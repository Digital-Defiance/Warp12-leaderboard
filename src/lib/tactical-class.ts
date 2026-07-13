import type { AiSkillLevel } from '../firebase/schema.js';

/** Commission labels for AI opponent boards (match Warp app). */
const AI_SKILL_LABELS: Record<
  AiSkillLevel,
  { readonly short: string; readonly long: string }
> = {
  ensign: { short: 'Ens.', long: 'Ensign' },
  lieutenant: { short: 'Lt.', long: 'Lieutenant' },
  commander: { short: 'Cmdr.', long: 'Commander' },
};

export function formatTacticalClass(
  tacticalClass: string,
  options?: { short?: boolean }
): string {
  const byRoman: Record<string, { short: string; long: string }> = {
    IV: AI_SKILL_LABELS.ensign,
    III: AI_SKILL_LABELS.lieutenant,
    II: AI_SKILL_LABELS.commander,
    I: { short: 'Flag', long: 'Flag Officer' },
  };
  const labels = byRoman[tacticalClass];
  if (!labels) {
    return tacticalClass;
  }
  return options?.short ? labels.short : labels.long;
}

export function aiSkillTacticalClassLabel(skill: AiSkillLevel): string {
  return AI_SKILL_LABELS[skill].long;
}

export function aiSkillBoardLabel(skill: AiSkillLevel): string {
  return `vs ${aiSkillTacticalClassLabel(skill)} officers`;
}
