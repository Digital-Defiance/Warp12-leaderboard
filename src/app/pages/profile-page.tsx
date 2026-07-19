import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { aiSkillTacticalClassLabel } from '../../lib/tactical-class.js';
import statCardStyles from '../components/stat-card.module.scss';
import panelStyles from '../components/panel.module.scss';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  resolveFederationCallSign,
  upsertPlayerProfile,
} from '../../firebase/leaderboard-service.js';
import { getCharter, listMyCharters } from '../../firebase/charter-service.js';
import { isFirebaseConfigured } from '../../firebase/config.js';
import type {
  AiSkillLevel,
  GamingPlatformIds,
  PlayerProfileDocument,
  PlayerStatsDocument,
} from '../../firebase/schema.js';
import {
  assistedMatchStats,
  displayGroupObjectiveRating,
  displayGroupObjectiveTei,
  displayHumanObjectiveRating,
  displayHumanObjectiveTei,
  displayObjectiveRating,
  displayObjectiveTei,
  groupObjectiveTeiStats,
  normalizeLocalAiStats,
  emptyLocalAiStats,
  localAiWinRate,
  matchWinRate,
  objectiveWinRate,
  unassistedMatchStats,
} from '../../firebase/schema.js';
import { verifiedFleetTotals } from '../../firebase/verified-stats.js';
import type { PublicCharterView } from '../../firebase/charter-schema.js';
import styles from './profile-page.module.scss';

interface CrewTeiRow {
  charterId: string;
  name: string;
  slug: string;
  goOutTei: number | string | null;
  pointsTei: number | string | null;
  goOutMatches: number;
  pointsMatches: number;
}

function emptyStats(uid: string, displayName: string): PlayerStatsDocument {
  const now = new Date().toISOString();
  return {
    uid,
    displayName,
    matchesCompleted: 0,
    matchesWon: 0,
    roundsPlayed: 0,
    roundsWon: 0,
    totalPoints: 0,
    localAi: emptyLocalAiStats(),
    updatedAt: now,
  };
}

const LOCAL_AI_LABELS: Record<AiSkillLevel, string> = {
  ensign: `${aiSkillTacticalClassLabel('ensign')} AI`,
  lieutenant: `${aiSkillTacticalClassLabel('lieutenant')} AI`,
  commander: `${aiSkillTacticalClassLabel('commander')} AI`,
};

function formatWinRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function ProfilePage() {
  const { uid: routeUid } = useParams<{ uid?: string }>();
  const { user, ready } = useFirebaseAuth();
  const targetUid = routeUid ?? user?.uid ?? '';
  const isOwnProfile = Boolean(user && targetUid === user.uid);

  const [profile, setProfile] = useState<PlayerProfileDocument | null>(null);
  const [stats, setStats] = useState<PlayerStatsDocument | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [gamingIds, setGamingIds] = useState<GamingPlatformIds>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crewTeiRows, setCrewTeiRows] = useState<CrewTeiRow[]>([]);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured || !ready || !targetUid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [loadedProfile, loadedStats] = await Promise.all([
          fetchPlayerProfile(targetUid),
          fetchPlayerStats(targetUid),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(loadedProfile);
        setStats(loadedStats);
        setDisplayName(resolveFederationCallSign(loadedProfile, loadedStats));
        setBio(loadedProfile?.bio ?? '');
        setGamingIds(loadedProfile?.gamingIds ?? {});

        if (loadedStats) {
          const charterIds = Object.keys(loadedStats.groupTei ?? {});
          let charters: PublicCharterView[] = [];
          if (isOwnProfile && user && !user.isAnonymous) {
            charters = await listMyCharters();
          }
          const charterById = new Map(charters.map((c) => [c.charterId, c]));
          const rows: CrewTeiRow[] = [];
          for (const charterId of charterIds) {
            let meta = charterById.get(charterId);
            if (!meta) {
              try {
                meta = await getCharter({ charterId });
              } catch {
                meta = undefined;
              }
            }
            const goOut = groupObjectiveTeiStats(loadedStats, charterId, 'go-out');
            const points = groupObjectiveTeiStats(loadedStats, charterId, 'points');
            rows.push({
              charterId,
              name: meta?.name ?? charterId,
              slug: meta?.slug ?? charterId,
              goOutTei: displayGroupObjectiveRating(loadedStats, charterId, 'go-out') ?? 
                        displayGroupObjectiveTei(loadedStats, charterId, 'go-out'),
              pointsTei: displayGroupObjectiveRating(loadedStats, charterId, 'points') ??
                         displayGroupObjectiveTei(loadedStats, charterId, 'points'),
              goOutMatches: goOut.unassistedMatches,
              pointsMatches: points.unassistedMatches,
            });
          }
          rows.sort((a, b) => a.name.localeCompare(b.name));
          if (!cancelled) {
            setCrewTeiRows(rows);
          }
        } else if (!cancelled) {
          setCrewTeiRows([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [configured, ready, targetUid, isOwnProfile, user]);

  async function handleSave() {
    if (!user || !isOwnProfile) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const now = new Date().toISOString();
    const nextProfile: PlayerProfileDocument = {
      uid: user.uid,
      displayName: displayName.trim() || 'Captain',
      bio: bio.trim() || undefined,
      visibility: 'public',
      gamingIds: {
        appleGameCenter: gamingIds.appleGameCenter?.trim() || undefined,
        googlePlayGames: gamingIds.googlePlayGames?.trim() || undefined,
        xboxLive: gamingIds.xboxLive?.trim() || undefined,
      },
      createdAt: profile?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      await upsertPlayerProfile(nextProfile);
      setProfile(nextProfile);
      setStats((current) =>
        current
          ? { ...current, displayName: nextProfile.displayName, updatedAt: now }
          : current
      );
      setMessage('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  const visibleStats = stats ?? (targetUid ? emptyStats(targetUid, displayName || 'Captain') : null);
  const localAi = normalizeLocalAiStats(visibleStats?.localAi);
  const verified = visibleStats ? verifiedFleetTotals(visibleStats) : null;

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Captain Record</p>
        <h1 className={panelStyles.panelTitle}>
          {isOwnProfile ? 'Your Profile' : displayName || 'Captain Profile'}
        </h1>
        <p className={panelStyles.panelBody}>
          Link platform gaming IDs so future native builds can sync achievements
          and leaderboard scores with Apple Game Center, Google Play Games, and
          Xbox Live on Windows.
        </p>
      </section>

      {!configured && (
        <p className={panelStyles.errorState}>Firebase is not configured.</p>
      )}

      {configured && loading && (
        <p className={panelStyles.loadingState}>Loading captain record…</p>
      )}

      {error && <p className={panelStyles.errorState}>{error}</p>}
      {message && <p className={styles.success}>{message}</p>}

      {visibleStats && !loading && verified && (
        <div className={statCardStyles.grid}>
          <article className={statCardStyles.card}>
            <p className={statCardStyles.label}>Verified wins</p>
            <p className={statCardStyles.value}>{verified.matchesWon}</p>
          </article>
          <article className={statCardStyles.card}>
            <p className={statCardStyles.label}>Verified matches</p>
            <p className={statCardStyles.value}>{verified.matchesCompleted}</p>
          </article>
          <article className={statCardStyles.card}>
            <p className={statCardStyles.label}>Human pool</p>
            <p className={statCardStyles.value}>{verified.humanMatches}</p>
          </article>
          <article className={statCardStyles.card}>
            <p className={statCardStyles.label}>Practice vs AI</p>
            <p className={statCardStyles.value}>{verified.practiceAiMatches}</p>
          </article>
          <article className={statCardStyles.card}>
            <p className={statCardStyles.label}>Global go-out TEI</p>
            <p className={statCardStyles.value}>
              {displayHumanObjectiveRating(visibleStats, 'go-out') ?? 
               displayHumanObjectiveTei(visibleStats, 'go-out') ?? '—'}
            </p>
          </article>
          <article className={statCardStyles.card}>
            <p className={statCardStyles.label}>Global points TEI</p>
            <p className={statCardStyles.value}>
              {displayHumanObjectiveRating(visibleStats, 'points') ??
               displayHumanObjectiveTei(visibleStats, 'points') ?? '—'}
            </p>
          </article>
        </div>
      )}

      {crewTeiRows.length > 0 && !loading && (
        <section className={styles.localAiSection}>
          <h2 className={styles.localAiTitle}>Crew TEI</h2>
          <p className={styles.localAiLead}>
            Unassisted rated matches scoped to each crew charter. Global Official
            rows also feed the human pool ladder.
          </p>
          <div className={styles.localAiTableWrap}>
            <table className={styles.localAiTable}>
              <thead>
                <tr>
                  <th>Crew</th>
                  <th>Go-out TEI</th>
                  <th>Go-out matches</th>
                  <th>Points TEI</th>
                  <th>Points matches</th>
                </tr>
              </thead>
              <tbody>
                {crewTeiRows.map((row) => (
                  <tr key={row.charterId}>
                    <td>
                      <Link to={`/crews/${row.slug}`}>{row.name}</Link>
                    </td>
                    <td>{row.goOutTei ?? '—'}</td>
                    <td>{row.goOutMatches}</td>
                    <td>{row.pointsTei ?? '—'}</td>
                    <td>{row.pointsMatches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={styles.localAiSection}>
        <h2 className={styles.localAiTitle}>Practice vs AI</h2>
        <p className={styles.localAiLead}>
          Matches bucketed by the highest AI commission track at your table. Go-out and
          points each have their own solo TEI track — updated only on server-verified
          unassisted wins and losses.
        </p>
        <div className={styles.localAiTableWrap}>
          <table className={styles.localAiTable}>
            <thead>
              <tr>
                <th>Opponent profile</th>
                <th>Wins</th>
                <th>Matches</th>
                <th>Win rate</th>
                <th>Solo win rate</th>
                <th>Go-out TEI</th>
                <th>Points TEI</th>
                <th>Advisor win rate</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(LOCAL_AI_LABELS) as AiSkillLevel[]).map((skill) => {
                const bucket = localAi[skill];
                const solo = unassistedMatchStats(bucket);
                const assisted = assistedMatchStats(bucket);
                const goOutRating = displayObjectiveRating(bucket, 'go-out') ?? displayObjectiveTei(bucket, 'go-out');
                const pointsRating = displayObjectiveRating(bucket, 'points') ?? displayObjectiveTei(bucket, 'points');
                return (
                  <tr key={skill}>
                    <td>{LOCAL_AI_LABELS[skill]}</td>
                    <td>{bucket.matchesWon}</td>
                    <td>{bucket.matchesCompleted}</td>
                    <td>{formatWinRate(localAiWinRate(bucket))}</td>
                    <td>
                      {solo.matchesCompleted > 0
                        ? formatWinRate(matchWinRate(solo))
                        : '—'}
                    </td>
                    <td>
                      {goOutRating ?? '—'}
                      {objectiveWinRate(bucket, 'go-out') !== null && (
                        <span className={styles.objectiveSub}>
                          {' '}
                          ({formatWinRate(objectiveWinRate(bucket, 'go-out')!)})
                        </span>
                      )}
                    </td>
                    <td>
                      {pointsRating ?? '—'}
                      {objectiveWinRate(bucket, 'points') !== null && (
                        <span className={styles.objectiveSub}>
                          {' '}
                          ({formatWinRate(objectiveWinRate(bucket, 'points')!)})
                        </span>
                      )}
                    </td>
                    <td>
                      {assisted.matchesCompleted > 0
                        ? formatWinRate(matchWinRate(assisted))
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isOwnProfile && !loading && configured && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label className={styles.field}>
            <span>Call sign</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={32}
              aria-describedby="call-sign-hint"
            />
            <span id="call-sign-hint" className={styles.fieldHint}>
              Also used as your name on Warp TEI and practice ladders.
            </span>
          </label>

          <label className={styles.field}>
            <span>Bio</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              maxLength={280}
            />
          </label>

          <fieldset className={styles.fieldset}>
            <legend>Gaming platform IDs</legend>
            <label className={styles.field}>
              <span>Apple Game Center</span>
              <input
                value={gamingIds.appleGameCenter ?? ''}
                onChange={(event) =>
                  setGamingIds((current) => ({
                    ...current,
                    appleGameCenter: event.target.value,
                  }))
                }
                placeholder="Player ID or alias"
              />
            </label>
            <label className={styles.field}>
              <span>Google Play Games</span>
              <input
                value={gamingIds.googlePlayGames ?? ''}
                onChange={(event) =>
                  setGamingIds((current) => ({
                    ...current,
                    googlePlayGames: event.target.value,
                  }))
                }
                placeholder="Player ID"
              />
            </label>
            <label className={styles.field}>
              <span>Xbox Live (Windows)</span>
              <input
                value={gamingIds.xboxLive ?? ''}
                onChange={(event) =>
                  setGamingIds((current) => ({
                    ...current,
                    xboxLive: event.target.value,
                  }))
                }
                placeholder="Gamertag or XUID"
              />
            </label>
          </fieldset>

          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      )}
    </div>
  );
}
