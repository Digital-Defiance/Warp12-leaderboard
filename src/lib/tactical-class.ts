import type { AiSkillLevel } from '../firebase/schema.js';

const AI_SKILL_TACTICAL_CLASS: Record<AiSkillLevel, string> = {
  ensign: 'IV',
  lieutenant: 'III',
  commander: 'II',
};

export function formatTacticalClass(tacticalClass: string): string {
  return `Class ${tacticalClass}`;
}

export function aiSkillTacticalClassLabel(skill: AiSkillLevel): string {
  return formatTacticalClass(AI_SKILL_TACTICAL_CLASS[skill]);
}

export function aiSkillBoardLabel(skill: AiSkillLevel): string {
  return `vs ${aiSkillTacticalClassLabel(skill)} AI`;
}
