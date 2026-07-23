export type ProfileVisibility = 'public' | 'private';
export type LogVisibility = 'public' | 'unlisted' | 'private';
export type MatchMode = 'local' | 'online';
export type AiSkillLevel = 'ensign' | 'lieutenant' | 'commander';
export type RatedObjective = 'go-out' | 'points';

export interface MatchOutcomeStats {
  matchesCompleted: number;
  matchesWon: number;
}

/** Solo (unassisted) rated record for one objective mode. */
export interface ObjectiveTeiStats {
  unassistedMatches: number;
  unassistedWins: number;
  unassistedTei?: number;
}

export interface LocalAiSkillStats extends MatchOutcomeStats {
  advisorMatches: number;
  advisorWins: number;
  goOut?: ObjectiveRatingStats;
  points?: ObjectiveRatingStats;
}

export type LocalAiStats = Record<AiSkillLevel, LocalAiSkillStats>;

export function emptyObjectiveTeiStats(): ObjectiveTeiStats {
  return { unassistedMatches: 0, unassistedWins: 0 };
}

export function emptyLocalAiSkillStats(): LocalAiSkillStats {
  return {
    matchesCompleted: 0,
    matchesWon: 0,
    advisorMatches: 0,
    advisorWins: 0,
  };
}

export function emptyLocalAiStats(): LocalAiStats {
  return {
    ensign: emptyLocalAiSkillStats(),
    lieutenant: emptyLocalAiSkillStats(),
    commander: emptyLocalAiSkillStats(),
  };
}

/** Firestore merge writes may omit untouched AI skill buckets. */
export function normalizeLocalAiStats(
  localAi?: Partial<LocalAiStats> | null
): LocalAiStats {
  const empty = emptyLocalAiStats();
  return {
    ensign: { ...empty.ensign, ...localAi?.ensign },
    lieutenant: { ...empty.lieutenant, ...localAi?.lieutenant },
    commander: { ...empty.commander, ...localAi?.commander },
  };
}

export function objectiveTeiKey(objective: RatedObjective): 'goOut' | 'points' {
  return objective === 'go-out' ? 'goOut' : 'points';
}

export function objectiveTeiStats(
  stats: LocalAiSkillStats,
  objective: RatedObjective
): ObjectiveTeiStats {
  const key = objectiveTeiKey(objective);
  return { ...emptyObjectiveTeiStats(), ...stats[key] };
}

export function unassistedMatchStats(
  stats: LocalAiSkillStats | undefined
): MatchOutcomeStats {
  const base = stats ?? emptyLocalAiSkillStats();
  return {
    matchesCompleted: base.matchesCompleted - base.advisorMatches,
    matchesWon: base.matchesWon - base.advisorWins,
  };
}

export function assistedMatchStats(
  stats: LocalAiSkillStats | undefined
): MatchOutcomeStats {
  const base = stats ?? emptyLocalAiSkillStats();
  return {
    matchesCompleted: base.advisorMatches,
    matchesWon: base.advisorWins,
  };
}

export function matchWinRate(stats: MatchOutcomeStats): number {
  if (stats.matchesCompleted <= 0) {
    return 0;
  }
  return stats.matchesWon / stats.matchesCompleted;
}

export const DEFAULT_UNASSISTED_TEI = 0; // Display rating for new players (P grade)

export function displayUnassistedTei(
  tei: number | undefined,
  unassistedMatches: number
): number | null {
  if (unassistedMatches <= 0) {
    return null;
  }
  return tei ?? DEFAULT_UNASSISTED_TEI;
}

export function displayObjectiveTei(
  stats: LocalAiSkillStats,
  objective: RatedObjective
): number | null {
  const bucket = objectiveTeiStats(stats, objective);
  return displayUnassistedTei(bucket.unassistedTei, bucket.unassistedMatches);
}

// New TEI display functions
export function displayObjectiveRating(
  stats: LocalAiSkillStats,
  objective: RatedObjective
): string | null {
  const key = objectiveTeiKey(objective);
  const bucket = stats[key];
  if (!bucket?.rating || bucket.rating.matches === 0) {
    return null;
  }
  return bucket.rating.displayGrade;
}

export function humanObjectiveRatingStats(
  stats: PlayerStatsDocument,
  objective: RatedObjective
): ObjectiveRatingStats {
  const key = objectiveTeiKey(objective);
  return { unassistedMatches: 0, unassistedWins: 0, ...stats.humanRating?.[key] };
}

export function displayHumanObjectiveRating(
  stats: PlayerStatsDocument,
  objective: RatedObjective
): string | null {
  const bucket = humanObjectiveRatingStats(stats, objective);
  if (!bucket.rating || bucket.rating.matches === 0) {
    return null;
  }
  return bucket.rating.displayGrade;
}

export function groupObjectiveRatingStats(
  stats: PlayerStatsDocument | null | undefined,
  charterId: string,
  objective: RatedObjective,
  charterSeasonKey?: string
): ObjectiveRatingStats {
  const key = objectiveTeiKey(objective);
  const bucket = stats?.groupRating?.[charterId];
  const activeBucket =
    bucket &&
    charterSeasonKey &&
    bucket.seasonKey &&
    bucket.seasonKey !== charterSeasonKey
      ? undefined
      : bucket;
  return { unassistedMatches: 0, unassistedWins: 0, ...activeBucket?.[key] };
}

export function displayGroupObjectiveRating(
  stats: PlayerStatsDocument,
  charterId: string,
  objective: RatedObjective,
  charterSeasonKey?: string
): string | null {
  const bucket = groupObjectiveRatingStats(
    stats,
    charterId,
    objective,
    charterSeasonKey
  );
  if (!bucket.rating || bucket.rating.matches === 0) {
    return null;
  }
  return bucket.rating.displayGrade;
}

export function objectiveWinRate(
  stats: LocalAiSkillStats,
  objective: RatedObjective
): number | null {
  const bucket = objectiveTeiStats(stats, objective);
  if (bucket.unassistedMatches <= 0) {
    return null;
  }
  return bucket.unassistedWins / bucket.unassistedMatches;
}

export function localAiWinRate(stats: LocalAiSkillStats | undefined): number {
  return matchWinRate(stats ?? emptyLocalAiSkillStats());
}

export interface GamingPlatformIds {
  appleGameCenter?: string;
  googlePlayGames?: string;
  xboxLive?: string;
}

/** Matches Warp captain identity — shared for federation narration / avatars. */
export type CaptainGender = 'other' | 'male' | 'female';

export type PronounPresetId = 'they' | 'she' | 'he' | 'custom';

export interface CaptainPronounPreference {
  preset: PronounPresetId;
  custom?: string;
}

export interface PlayerProfileDocument {
  uid: string;
  displayName: string;
  callSign?: string;
  bio?: string;
  avatarUrl?: string;
  visibility: ProfileVisibility;
  gamingIds?: GamingPlatformIds;
  /** Avatar presentation (Captain X / male / female). Independent of pronouns. */
  captainGender?: CaptainGender;
  /** Narration pronouns for commentator / TTS. */
  captainPronouns?: CaptainPronounPreference;
  /** Optional TTS pronunciation of the call sign. */
  speakAs?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredRating {
  mu: number;
  sigma: number;
  matches: number;
  displayRating: number;
  displayGrade: string;
}

export interface ObjectiveRatingStats {
  rating?: StoredRating;
  unassistedMatches: number;
  unassistedWins: number;
  advisorMatches?: number;
  advisorWins?: number;
}

export interface HumanRatingStats {
  goOut?: ObjectiveRatingStats;
  points?: ObjectiveRatingStats;
  seasonKey?: string;
}

// Legacy TEI integer types (deprecated)
export interface HumanTeiStats {
  goOut?: ObjectiveTeiStats;
  points?: ObjectiveTeiStats;
  seasonKey?: string;
}

export interface PlayerStatsDocument {
  uid: string;
  displayName: string;
  /** Mirrored from federation profile for Warp narration / avatars. */
  captainGender?: CaptainGender;
  captainPronouns?: CaptainPronounPreference;
  speakAs?: string | null;
  matchesCompleted: number;
  matchesWon: number;
  roundsPlayed: number;
  roundsWon: number;
  totalPoints: number;
  // New TEI fields
  humanRating?: HumanRatingStats;
  groupRating?: Record<string, HumanRatingStats>;
  // Legacy integer TEI fields (deprecated)
  humanTei?: HumanTeiStats;
  groupTei?: Record<string, HumanTeiStats>;
  localAi?: LocalAiStats;
  bestRoundTimeMs?: number;
  lastPlayedAt?: string;
  updatedAt: string;
}

export function groupObjectiveTeiStats(
  stats: PlayerStatsDocument | null | undefined,
  charterId: string,
  objective: RatedObjective,
  charterSeasonKey?: string
): ObjectiveTeiStats {
  const key = objectiveTeiKey(objective);
  const bucket = stats?.groupTei?.[charterId];
  const activeBucket =
    bucket &&
    charterSeasonKey &&
    bucket.seasonKey &&
    bucket.seasonKey !== charterSeasonKey
      ? undefined
      : bucket;
  return { ...emptyObjectiveTeiStats(), ...activeBucket?.[key] };
}

export function displayGroupObjectiveTei(
  stats: PlayerStatsDocument,
  charterId: string,
  objective: RatedObjective,
  charterSeasonKey?: string
): number | null {
  const bucket = groupObjectiveTeiStats(
    stats,
    charterId,
    objective,
    charterSeasonKey
  );
  return displayUnassistedTei(bucket.unassistedTei, bucket.unassistedMatches);
}

export function humanObjectiveTeiStats(
  stats: PlayerStatsDocument,
  objective: RatedObjective
): ObjectiveTeiStats {
  const key = objectiveTeiKey(objective);
  return { ...emptyObjectiveTeiStats(), ...stats.humanTei?.[key] };
}

export function displayHumanObjectiveTei(
  stats: PlayerStatsDocument,
  objective: RatedObjective
): number | null {
  const bucket = humanObjectiveTeiStats(stats, objective);
  return displayUnassistedTei(bucket.unassistedTei, bucket.unassistedMatches);
}

export interface HumanPoolLeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  objective: RatedObjective;
  unassistedTei: number | string | null; // number = legacy integer TEI, string = OpenSkill grade
  unassistedPercentile: string;
  unassistedMatches: number;
  unassistedWins: number;
  unassistedWinRate: number;
  /** Advanced view: raw μ (skill estimate) */
  mu?: number;
  /** Advanced view: raw σ (uncertainty) */
  sigma?: number;
  /** Advanced view: ordinal rating for matchmaking (μ - 3σ) */
  ordinalRating?: number;
}

export interface PublishedLogSummary {
  mode: MatchMode;
  captainCount: number;
  winnerDisplayName?: string;
  objective?: string;
  campaignRounds?: number;
}

/** Mirrors warp12-react RoundLogExport fields stored in Firestore. */
export interface PublishedLogDocument {
  id: string;
  authorId: string;
  authorDisplayName: string;
  publishedAt: string;
  visibility: LogVisibility;
  shareSlug: string;
  roundNumber: number;
  sectorCode?: string;
  exportedAt: string;
  roundStartedAtMs: number;
  lines: string[];
  summary: PublishedLogSummary;
}

export interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  matchesWon: number;
  matchesCompleted: number;
  roundsWon: number;
  winRate: number;
}

export interface LocalAiLeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  objective: RatedObjective;
  unassistedTei: number | string | null; // number = legacy integer TEI, string = OpenSkill grade
  /** Top X% among rated captains on this board (rank / pool size). */
  unassistedPercentile: string;
  unassistedMatches: number;
  unassistedWins: number;
  unassistedWinRate: number;
  skill: AiSkillLevel;
  /** Advanced view: raw μ (skill estimate) */
  mu?: number;
  /** Advanced view: raw σ (uncertainty) */
  sigma?: number;
  /** Advanced view: ordinal rating for matchmaking (μ - 3σ) */
  ordinalRating?: number;
}

export interface PublishMatchLogInput {
  authorId: string;
  authorDisplayName: string;
  visibility?: LogVisibility;
  roundNumber: number;
  sectorCode?: string;
  exportedAt: string;
  roundStartedAtMs: number;
  lines: readonly string[];
  summary: PublishedLogSummary;
}
