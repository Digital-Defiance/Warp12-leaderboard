import { doc, getDoc } from 'firebase/firestore';

import { callFunction } from './functions-client.js';
import { getFirebaseAuth, getFirestoreDb } from './config.js';
import { isVerifiedUser } from './auth-actions.js';
import {
  normalizeMatchCode,
  type RatedMatchDocument,
  type RatedMatchStanding,
  type RatedObjective,
  type WarpRole,
} from './rated-match-schema.js';

const RATED_MATCHES = 'ratedMatches';

export async function fetchRatedMatch(
  matchCode: string
): Promise<RatedMatchDocument | null> {
  const db = getFirestoreDb();
  if (!db) {
    return null;
  }
  const snap = await getDoc(
    doc(db, RATED_MATCHES, normalizeMatchCode(matchCode))
  );
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as RatedMatchDocument;
}

export async function getMyRoles(): Promise<WarpRole[]> {
  const auth = getFirebaseAuth();
  if (!isVerifiedUser(auth?.currentUser ?? null)) {
    return [];
  }
  const result = await callFunction<Record<string, never>, { roles: WarpRole[] }>(
    'getMyRoles',
    {}
  );
  return result.roles ?? [];
}

export async function createRatedMatch(input: {
  objective: RatedObjective;
  campaignRounds: number;
  venue?: string;
  notes?: string;
  officialDisplayName: string;
}): Promise<{ matchCode: string }> {
  return callFunction('createRatedMatch', input);
}

export async function checkInToMatch(input: {
  matchCode: string;
  displayName: string;
}): Promise<{ ok: boolean; matchCode: string }> {
  return callFunction('checkInToMatch', input);
}

export async function submitMatchStandings(input: {
  matchCode: string;
  standings: RatedMatchStanding[];
}): Promise<{ ok: boolean }> {
  return callFunction('submitMatchStandings', input);
}

export async function approveRatedMatch(matchCode: string): Promise<{ ok: boolean }> {
  return callFunction('approveRatedMatch', { matchCode });
}

export async function rejectRatedMatch(input: {
  matchCode: string;
  reason?: string;
}): Promise<{ ok: boolean }> {
  return callFunction('rejectRatedMatch', input);
}

export async function setUserRoles(input: {
  uid: string;
  roles: WarpRole[];
}): Promise<{ ok: boolean }> {
  return callFunction('setUserRoles', input);
}

export async function bootstrapAdmin(secret: string): Promise<{ ok: boolean }> {
  return callFunction('bootstrapAdmin', { secret });
}
