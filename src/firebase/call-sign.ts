import type {
  PlayerProfileDocument,
  PlayerStatsDocument,
} from './schema.js';

/**
 * Prefer IWGF call sign; fall back to TEI stats name (legacy / Bridge-only).
 */
export function resolveFederationCallSign(
  profile: Pick<PlayerProfileDocument, 'displayName'> | null | undefined,
  stats: Pick<PlayerStatsDocument, 'displayName'> | null | undefined
): string {
  const fromProfile = profile?.displayName?.trim();
  if (fromProfile) {
    return fromProfile;
  }
  const fromStats = stats?.displayName?.trim();
  if (fromStats) {
    return fromStats;
  }
  return 'Captain';
}
