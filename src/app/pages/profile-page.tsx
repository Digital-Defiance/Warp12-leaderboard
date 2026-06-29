import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { aiSkillTacticalClassLabel } from '../../lib/tactical-class.js';
import statCardStyles from '../components/stat-card.module.scss';
import panelStyles from '../components/panel.module.scss';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  upsertPlayerProfile,
} from '../../firebase/leaderboard-service.js';
import { isFirebaseConfigured } from '../../firebase/config.js';
import type {
  AiSkillLevel,
  GamingPlatformIds,
  PlayerProfileDocument,
  PlayerStatsDocument,
} from '../../firebase/schema.js';
import {
  assistedMatchStats,
  displayObjectiveTei,
  normalizeLocalAiStats,
  emptyLocalAiStats,
  localAiWinRate,
  matchWinRate,
  objectiveWinRate,
  unassistedMatchStats,
} from '../../firebase/schema.js';
import { verifiedFleetTotals } from '../../firebase/verified-stats.js';
import styles from './profile-page.module.scss';

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
        setDisplayName(loadedProfile?.displayName ?? 'Captain');
        setBio(loadedProfile?.bio ?? '');
        setGamingIds(loadedProfile?.gamingIds ?? {});
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
  }, [configured, ready, targetUid]);

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
        </div>
      )}

      <section className={styles.localAiSection}>
        <h2 className={styles.localAiTitle}>Practice vs AI</h2>
        <p className={styles.localAiLead}>
          Matches bucketed by the highest AI tactical class at your table. Go-out and
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
                const goOutTei = displayObjectiveTei(bucket, 'go-out');
                const pointsTei = displayObjectiveTei(bucket, 'points');
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
                      {goOutTei ?? '—'}
                      {objectiveWinRate(bucket, 'go-out') !== null && (
                        <span className={styles.objectiveSub}>
                          {' '}
                          ({formatWinRate(objectiveWinRate(bucket, 'go-out')!)})
                        </span>
                      )}
                    </td>
                    <td>
                      {pointsTei ?? '—'}
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
            />
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
