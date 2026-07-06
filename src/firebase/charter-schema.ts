export type RatedObjective = 'go-out' | 'points';

export interface PublicCharterView {
  charterId: string;
  slug: string;
  name: string;
  rulesProfileId: string;
  objective: RatedObjective;
  playerCount: number;
  campaignRounds: number;
  modules?: {
    salamanderPenalty: boolean;
    qContinuum: boolean;
    subspaceFracture: boolean;
    subspaceFractureScope: 'own-trail' | 'all-captains' | 'all-doubles';
  };
  houseRules?: {
    requireOwnTrailFirst: boolean;
    neutralZoneAfterAllTrails: boolean;
    beaconClearsOnAnyPlay: boolean;
    roundStarterPlaysTwo: boolean;
    dropToImpulseCall: boolean;
    dropToImpulseCatchPenalty: 1 | 2;
    allStopCeremony: boolean;
    passRedAlertWithoutDraw: boolean;
    manualShieldControl: boolean;
    doubleZeroScore: 0 | 25 | 50;
  };
  memberCount: number;
  isGlobalOfficial: boolean;
  listed?: boolean;
  seasonLabel?: string;
  seasonKey?: string;
  createdAt: string;
}

export interface CharterLeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  tei: number | null;
  matches: number;
  wins: number;
}

export interface CharterManageInfo {
  role: 'owner' | 'member' | 'none';
  canManage: boolean;
  crewCode?: string;
  listed: boolean;
  pendingRequestCount: number;
}

export interface CharterJoinRequestView {
  uid: string;
  displayName: string;
  requestedAt: string;
}

export function normalizeCrewInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/^CREW-/, '');
}

export function formatCrewInviteCode(short: string): string {
  return `CREW-${normalizeCrewInviteCode(short)}`;
}

export const GLOBAL_OFFICIAL_CHARTER_ID = 'global-official' as const;
export const GLOBAL_OFFICIAL_SLUG = 'global-official' as const;

/** Fleet sizes with an open Global Official charter this season. */
export const GLOBAL_OFFICIAL_PLAYER_COUNTS = [4, 6, 8] as const;

export type GlobalOfficialPlayerCount =
  (typeof GLOBAL_OFFICIAL_PLAYER_COUNTS)[number];

export function globalOfficialCharterId(playerCount: number): string {
  if (playerCount === 4) {
    return GLOBAL_OFFICIAL_CHARTER_ID;
  }
  return `global-official-${playerCount}p`;
}

export function globalOfficialSlug(playerCount: number): string {
  if (playerCount === 4) {
    return GLOBAL_OFFICIAL_SLUG;
  }
  return `global-official-${playerCount}p`;
}

export function parseGlobalOfficialFleetSize(
  charterIdOrSlug: string
): number | null {
  const normalized = charterIdOrSlug.trim().toLowerCase();
  if (
    normalized === GLOBAL_OFFICIAL_CHARTER_ID ||
    normalized === GLOBAL_OFFICIAL_SLUG
  ) {
    return 4;
  }
  const match = /^global-official-(\d+)p$/.exec(normalized);
  if (!match) {
    return null;
  }
  const count = Number(match[1]);
  if (count < 2 || count > 8) {
    return null;
  }
  return count;
}

export function charterSummaryLine(charter: PublicCharterView): string {
  const objective = charter.objective === 'go-out' ? 'Go-out' : 'Points';
  const rounds =
    charter.objective === 'points'
      ? ` · ${charter.campaignRounds} rounds`
      : '';
  return `${charter.name} — Official Warp 12 · ${charter.playerCount} captains · ${objective}${rounds}`;
}
