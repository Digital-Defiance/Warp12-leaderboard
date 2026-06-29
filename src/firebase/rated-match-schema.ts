export type RatedObjective = 'go-out' | 'points';
export type WarpRole = 'admin' | 'match_official';

export type RatedMatchStatus =
  | 'draft'
  | 'open'
  | 'completed'
  | 'approved'
  | 'rejected';

export interface RatedMatchParticipant {
  uid: string;
  displayName: string;
  checkedInAt: string;
}

export interface RatedMatchStanding {
  uid: string;
  displayName: string;
  rank: number;
  score: number;
}

export interface RatedMatchDocument {
  matchCode: string;
  status: RatedMatchStatus;
  objective: RatedObjective;
  campaignRounds: number;
  venue?: string;
  notes?: string;
  officialId: string;
  officialDisplayName: string;
  createdAt: string;
  updatedAt: string;
  openedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  participants: RatedMatchParticipant[];
  standings: RatedMatchStanding[];
  teiClaims?: Record<string, boolean>;
}

export function normalizeMatchCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.startsWith('MT-')) {
    return trimmed;
  }
  if (trimmed.startsWith('MT')) {
    return `MT-${trimmed.slice(2)}`;
  }
  return `MT-${trimmed}`;
}

export const RATED_MATCH_STATUS_LABEL: Record<RatedMatchStatus, string> = {
  draft: 'Draft',
  open: 'Open for check-in',
  completed: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const RATED_OBJECTIVE_LABEL: Record<RatedObjective, string> = {
  'go-out': 'Go-out',
  points: 'Points',
};
