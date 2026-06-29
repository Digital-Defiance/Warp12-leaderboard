import { aiSkillBoardLabel } from './tactical-class.js';
import type { AiSkillLevel, RatedObjective } from '../firebase/schema.js';

export type BoardKind = 'fleet' | 'human' | AiSkillLevel;

export interface BoardOption {
  id: BoardKind;
  label: string;
  badge: string;
}

export const BOARD_OPTIONS: BoardOption[] = [
  { id: 'fleet', label: 'Verified fleet', badge: 'All pools' },
  { id: 'human', label: 'Human pool', badge: 'Officiated' },
  {
    id: 'ensign',
    label: aiSkillBoardLabel('ensign'),
    badge: 'Replay verified',
  },
  {
    id: 'lieutenant',
    label: aiSkillBoardLabel('lieutenant'),
    badge: 'Replay verified',
  },
  {
    id: 'commander',
    label: aiSkillBoardLabel('commander'),
    badge: 'Replay verified',
  },
];

export const OBJECTIVE_OPTIONS: { id: RatedObjective; label: string }[] = [
  { id: 'go-out', label: 'Go out' },
  { id: 'points', label: 'Points' },
];

export function boardDescription(
  board: BoardKind,
  objective: RatedObjective
): string {
  if (board === 'fleet') {
    return 'Combined wins from officiated human-pool matches and server-replay-verified practice vs AI (unassisted only). Legacy client-reported totals are excluded.';
  }
  if (board === 'human') {
    return `Officiated ${objective === 'go-out' ? 'go-out' : 'points'} human-pool TEI. A match official creates a code, records standings, and approves before TEI updates. Google sign-in required at check-in.`;
  }
  const tier = aiSkillBoardLabel(board);
  return `Server-replay-verified solo TEI vs ${tier} AI officers (${objective === 'go-out' ? 'go-out' : 'points'}). Advisor-assisted matches are unrated. Google sign-in required for rated TEI.`;
}
