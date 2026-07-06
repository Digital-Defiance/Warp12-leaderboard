import { callFunction } from './functions-client.js';
import { getFirebaseAuth } from './config.js';
import { isVerifiedUser } from './auth-actions.js';
import type {
  CharterJoinRequestView,
  CharterLeaderboardEntry,
  CharterManageInfo,
  PublicCharterView,
  RatedObjective,
} from './charter-schema.js';

export async function listMyCharters(): Promise<PublicCharterView[]> {
  const auth = getFirebaseAuth();
  if (!isVerifiedUser(auth?.currentUser ?? null)) {
    return [];
  }
  const result = await callFunction<Record<string, never>, { charters: PublicCharterView[] }>(
    'listMyCharters',
    {}
  );
  return result.charters ?? [];
}

export async function listListedCharters(): Promise<PublicCharterView[]> {
  const result = await callFunction<Record<string, never>, { charters: PublicCharterView[] }>(
    'listListedCharters',
    {}
  );
  return result.charters ?? [];
}

export async function getCharter(input: {
  charterId?: string;
  slug?: string;
}): Promise<PublicCharterView> {
  const result = await callFunction<
    { charterId?: string; slug?: string },
    { charter: PublicCharterView }
  >('getCharter', input);
  return result.charter;
}

export async function createCharter(input: {
  name: string;
  slug?: string;
  objective: RatedObjective;
  playerCount: number;
  campaignRounds?: number;
  modules?: Partial<NonNullable<PublicCharterView['modules']>>;
  houseRules?: Partial<NonNullable<PublicCharterView['houseRules']>>;
}): Promise<
  PublicCharterView & { inviteToken: string; inviteUrl: string; crewCode: string }
> {
  return callFunction('createCharter', input);
}

export async function joinCharter(input: {
  charterId?: string;
  slug?: string;
  inviteToken?: string;
  crewCode?: string;
}): Promise<{ ok: boolean; charter: PublicCharterView }> {
  return callFunction('joinCharter', input);
}

export async function leaveCharter(charterId: string): Promise<{ ok: boolean }> {
  return callFunction('leaveCharter', { charterId });
}

export async function rotateCharterInvite(charterId: string): Promise<{
  inviteToken: string;
  inviteUrl: string;
  crewCode: string;
}> {
  return callFunction('rotateCharterInvite', { charterId });
}

export async function getCharterLeaderboard(input: {
  charterId?: string;
  slug?: string;
}): Promise<{
  charter: PublicCharterView;
  entries: CharterLeaderboardEntry[];
}> {
  return callFunction('getCharterLeaderboard', input);
}

export async function getCharterManageInfo(charterId: string): Promise<CharterManageInfo> {
  return callFunction('getCharterManageInfo', { charterId });
}

export async function updateCharterListing(
  charterId: string,
  listed: boolean
): Promise<{ ok: boolean; listed: boolean }> {
  return callFunction('updateCharterListing', { charterId, listed });
}

export async function requestJoinCharter(
  charterId: string
): Promise<{ ok: boolean; joined?: boolean; pending?: boolean; alreadyMember?: boolean }> {
  return callFunction('requestJoinCharter', { charterId });
}

export async function listCharterJoinRequests(
  charterId: string
): Promise<{ requests: CharterJoinRequestView[] }> {
  return callFunction('listCharterJoinRequests', { charterId });
}

export async function resolveJoinRequest(input: {
  charterId: string;
  targetUid: string;
  approve: boolean;
}): Promise<{ ok: boolean; approved?: boolean }> {
  return callFunction('resolveJoinRequest', input);
}

export async function resetGlobalOfficialSeason(input: {
  seasonLabel: string;
  seasonKey?: string;
  playerCounts?: number[];
}): Promise<{
  ok: boolean;
  seasonLabel: string;
  seasonKey: string;
  charterIds: string[];
}> {
  return callFunction('resetGlobalOfficialSeason', input);
}
