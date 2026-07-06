import { aiSkillBoardLabel } from './tactical-class.js';
import type { AiSkillLevel, RatedObjective } from '../firebase/schema.js';

export type BoardKind = 'fleet' | 'global-official' | 'human' | AiSkillLevel;

export interface BoardOption {
  id: BoardKind;
  label: string;
  badge: string;
}

export const BOARD_OPTIONS: BoardOption[] = [
  { id: 'fleet', label: 'Verified fleet', badge: 'All pools' },
  {
    id: 'global-official',
    label: 'Global Official',
    badge: 'Warp 12 standard',
  },
  { id: 'human', label: 'Human pool', badge: 'All officiated' },
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

export const FLEET_SIZE_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;

export function boardDescription(
  board: BoardKind,
  objective: RatedObjective,
  context?: {
    playerCount?: number;
    seasonLabel?: string;
  }
): string {
  if (board === 'fleet') {
    return 'Combined wins from officiated human-pool matches, Global Official sectors, and server-replay-verified practice vs AI (unassisted only). Legacy client-reported totals are excluded.';
  }
  if (board === 'global-official') {
    const season = context?.seasonLabel ? ` Season: ${context.seasonLabel}.` : '';
    const fleet = context?.playerCount ?? 4;
    return `Public Warp 12 standard ladder — Official rules, ${fleet} captains, ${objective === 'go-out' ? 'go-out' : 'points'} track.${season} Rated play under the Global Official charter updates this board and global human-pool TEI. Join at /crews/global-official.`;
  }
  if (board === 'human') {
    return `All officiated ${objective === 'go-out' ? 'go-out' : 'points'} human-pool TEI (includes Global Official double-write). For the public standard filter, use Global Official.`;
  }
  const tier = aiSkillBoardLabel(board);
  return `Server-replay-verified solo TEI vs ${tier} AI officers (${objective === 'go-out' ? 'go-out' : 'points'}). Advisor-assisted matches are unrated. Google sign-in required for rated TEI.`;
}
