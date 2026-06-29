import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import { FIRESTORE_COLLECTIONS, getFirestoreDb } from './config.js';
import type {
  AiSkillLevel,
  HumanPoolLeaderboardEntry,
  LeaderboardEntry,
  LocalAiLeaderboardEntry,
  LocalAiSkillStats,
  PlayerProfileDocument,
  PlayerStatsDocument,
  PublishedLogDocument,
  RatedObjective,
} from './schema.js';
import {
  displayHumanObjectiveTei,
  displayObjectiveTei,
  normalizeLocalAiStats,
  humanObjectiveTeiStats,
  objectiveTeiStats,
} from './schema.js';
import { formatTopPercentile } from './stats-elo.js';
import { stripUndefined } from './strip-undefined.js';
import {
  verifiedFleetTotals,
  verifiedFleetWinRate,
} from './verified-stats.js';

function statsCollection() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }
  return collection(db, FIRESTORE_COLLECTIONS.playerStats);
}

function publishedLogsCollection() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }
  return collection(db, FIRESTORE_COLLECTIONS.publishedLogs);
}

export async function fetchLeaderboard(
  maxEntries = 25
): Promise<LeaderboardEntry[]> {
  const snapshot = await getDocs(query(statsCollection(), limit(200)));

  return snapshot.docs
    .map((entry) => entry.data() as PlayerStatsDocument)
    .map((stats) => ({
      stats,
      verified: verifiedFleetTotals(stats),
    }))
    .filter(({ verified }) => verified.matchesCompleted > 0)
    .sort((left, right) => {
      if (right.verified.matchesWon !== left.verified.matchesWon) {
        return right.verified.matchesWon - left.verified.matchesWon;
      }
      return right.verified.matchesCompleted - left.verified.matchesCompleted;
    })
    .slice(0, maxEntries)
    .map(({ stats, verified }, index) => ({
      rank: index + 1,
      uid: stats.uid,
      displayName: stats.displayName,
      matchesWon: verified.matchesWon,
      matchesCompleted: verified.matchesCompleted,
      roundsWon: stats.roundsWon,
      winRate: verifiedFleetWinRate(verified),
    }));
}

function localSkillStats(
  stats: PlayerStatsDocument,
  skill: AiSkillLevel
): LocalAiSkillStats {
  return normalizeLocalAiStats(stats.localAi)[skill];
}

export async function fetchLocalAiLeaderboard(
  skill: AiSkillLevel,
  objective: RatedObjective,
  maxEntries = 25
): Promise<LocalAiLeaderboardEntry[]> {
  const snapshot = await getDocs(query(statsCollection(), limit(200)));

  return snapshot.docs
    .map((entry) => entry.data() as PlayerStatsDocument)
    .map((stats) => {
      const bucket = localSkillStats(stats, skill);
      const rated = objectiveTeiStats(bucket, objective);
      return {
        stats,
        rated,
        unassistedTei: displayObjectiveTei(bucket, objective),
      };
    })
    .filter(({ rated }) => rated.unassistedMatches > 0)
    .sort((left, right) => {
      const leftTei = left.unassistedTei ?? 0;
      const rightTei = right.unassistedTei ?? 0;
      if (rightTei !== leftTei) {
        return rightTei - leftTei;
      }
      if (right.rated.unassistedWins !== left.rated.unassistedWins) {
        return right.rated.unassistedWins - left.rated.unassistedWins;
      }
      return right.rated.unassistedMatches - left.rated.unassistedMatches;
    })
    .slice(0, maxEntries)
    .map(({ stats, rated, unassistedTei }, index, ranked) => ({
      rank: index + 1,
      uid: stats.uid,
      displayName: stats.displayName,
      objective,
      unassistedTei,
      unassistedPercentile: formatTopPercentile(
        index + 1,
        ranked.length
      ),
      unassistedMatches: rated.unassistedMatches,
      unassistedWins: rated.unassistedWins,
      unassistedWinRate:
        rated.unassistedMatches > 0
          ? rated.unassistedWins / rated.unassistedMatches
          : 0,
      skill,
    }));
}

export async function fetchHumanPoolLeaderboard(
  objective: RatedObjective,
  maxEntries = 25
): Promise<HumanPoolLeaderboardEntry[]> {
  const snapshot = await getDocs(query(statsCollection(), limit(200)));

  return snapshot.docs
    .map((entry) => entry.data() as PlayerStatsDocument)
    .map((stats) => {
      const rated = humanObjectiveTeiStats(stats, objective);
      return {
        stats,
        rated,
        unassistedTei: displayHumanObjectiveTei(stats, objective),
      };
    })
    .filter(({ rated }) => rated.unassistedMatches > 0)
    .sort((left, right) => {
      const leftTei = left.unassistedTei ?? 0;
      const rightTei = right.unassistedTei ?? 0;
      if (rightTei !== leftTei) {
        return rightTei - leftTei;
      }
      if (right.rated.unassistedWins !== left.rated.unassistedWins) {
        return right.rated.unassistedWins - left.rated.unassistedWins;
      }
      return right.rated.unassistedMatches - left.rated.unassistedMatches;
    })
    .slice(0, maxEntries)
    .map(({ stats, rated, unassistedTei }, index, ranked) => ({
      rank: index + 1,
      uid: stats.uid,
      displayName: stats.displayName,
      objective,
      unassistedTei,
      unassistedPercentile: formatTopPercentile(index + 1, ranked.length),
      unassistedMatches: rated.unassistedMatches,
      unassistedWins: rated.unassistedWins,
      unassistedWinRate:
        rated.unassistedMatches > 0
          ? rated.unassistedWins / rated.unassistedMatches
          : 0,
    }));
}

export async function fetchPlayerProfile(
  uid: string
): Promise<PlayerProfileDocument | null> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTIONS.playerProfiles, uid));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as PlayerProfileDocument;
}

export async function fetchPlayerStats(
  uid: string
): Promise<PlayerStatsDocument | null> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTIONS.playerStats, uid));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as PlayerStatsDocument;
}

export async function fetchPublicMatchLogs(
  maxEntries = 20
): Promise<PublishedLogDocument[]> {
  const snapshot = await getDocs(
    query(
      publishedLogsCollection(),
      where('visibility', '==', 'public'),
      orderBy('publishedAt', 'desc'),
      limit(maxEntries)
    )
  );

  return snapshot.docs.map(
    (entry) => entry.data() as PublishedLogDocument
  );
}

export async function fetchMatchLogBySlug(
  shareSlug: string
): Promise<PublishedLogDocument | null> {
  const snapshot = await getDocs(
    query(
      publishedLogsCollection(),
      where('shareSlug', '==', shareSlug),
      limit(1)
    )
  );

  const docSnap = snapshot.docs[0];
  if (!docSnap) {
    return null;
  }
  return docSnap.data() as PublishedLogDocument;
}

export async function fetchMatchLogById(
  logId: string
): Promise<PublishedLogDocument | null> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  const snapshot = await getDoc(
    doc(db, FIRESTORE_COLLECTIONS.publishedLogs, logId)
  );
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as PublishedLogDocument;
}

export async function upsertPlayerProfile(
  profile: PlayerProfileDocument
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.playerProfiles, profile.uid),
    stripUndefined(profile),
    { merge: true }
  );
}

export async function upsertPlayerStats(
  stats: PlayerStatsDocument
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.playerStats, stats.uid),
    stripUndefined(stats),
    { merge: true }
  );
}

export async function seedDemoStatsIfEmpty(): Promise<boolean> {
  const snapshot = await getDocs(query(statsCollection(), limit(1)));
  if (!snapshot.empty) {
    return false;
  }

  const now = new Date().toISOString();
  const demoCaptains = [
    { uid: 'demo-picard', displayName: 'Picard', matchesWon: 12, matchesCompleted: 18, roundsWon: 34, roundsPlayed: 52 },
    { uid: 'demo-riker', displayName: 'Riker', matchesWon: 10, matchesCompleted: 16, roundsWon: 29, roundsPlayed: 48 },
    { uid: 'demo-troi', displayName: 'Troi', matchesWon: 8, matchesCompleted: 14, roundsWon: 22, roundsPlayed: 41 },
    { uid: 'demo-data', displayName: 'Data', matchesWon: 7, matchesCompleted: 11, roundsWon: 19, roundsPlayed: 36 },
  ];

  await Promise.all(
    demoCaptains.map((captain) =>
      upsertPlayerStats({
        uid: captain.uid,
        displayName: captain.displayName,
        matchesCompleted: captain.matchesCompleted,
        matchesWon: captain.matchesWon,
        roundsPlayed: captain.roundsPlayed,
        roundsWon: captain.roundsWon,
        totalPoints: 0,
        localAi: {
          ensign: {
            matchesCompleted: 4,
            matchesWon: 3,
            advisorMatches: 1,
            advisorWins: 1,
            goOut: {
              unassistedMatches: 2,
              unassistedWins: 2,
              unassistedTei: 1048,
            },
            points: {
              unassistedMatches: 1,
              unassistedWins: 0,
              unassistedTei: 972,
            },
          },
          lieutenant: {
            matchesCompleted: 8,
            matchesWon: 5,
            advisorMatches: 3,
            advisorWins: 2,
            goOut: {
              unassistedMatches: 3,
              unassistedWins: 2,
              unassistedTei: 1116,
            },
            points: {
              unassistedMatches: 2,
              unassistedWins: 1,
              unassistedTei: 1004,
            },
          },
          commander: {
            matchesCompleted: 6,
            matchesWon: 2,
            advisorMatches: 4,
            advisorWins: 1,
            goOut: {
              unassistedMatches: 1,
              unassistedWins: 0,
              unassistedTei: 986,
            },
            points: {
              unassistedMatches: 1,
              unassistedWins: 1,
              unassistedTei: 1012,
            },
          },
        },
        updatedAt: now,
      })
    )
  );

  return true;
}
