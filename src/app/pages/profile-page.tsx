import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Link, useParams } from 'react-router-dom';

import { aiSkillTacticalClassLabel } from '../../lib/tactical-class.js';
import { isVerifiedUser } from '../../firebase/auth-actions.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  resolveFederationCallSign,
  upsertPlayerProfile,
} from '../../firebase/leaderboard-service.js';
import { getCharter, listMyCharters } from '../../firebase/charter-service.js';
import { getFirestoreDb, isFirebaseConfigured } from '../../firebase/config.js';
import { SignInPanel } from '../components/sign-in-panel.js';
import { CaptainIdentityFieldset } from '../components/captain-identity-fieldset.js';
import panelStyles from '../components/panel.module.scss';
import statCardStyles from '../components/stat-card.module.scss';
import { TeiGradeText } from '../components/tei-grade-text.js';
import { Warp12Logo } from '../Warp12Logo.js';
import type {
  AiSkillLevel,
  GamingPlatformIds,
  PlayerProfileDocument,
  PlayerStatsDocument,
} from '../../firebase/schema.js';
import {
  DEFAULT_CAPTAIN_GENDER,
  DEFAULT_CAPTAIN_PRONOUNS,
  captainGenderLabel,
  captainPilotIcon,
  captainPronounsLabel,
  isCaptainGender,
  isCaptainPronounPreference,
  sanitizePronounPreference,
  sanitizeSpeakAs,
  type CaptainGender,
  type CaptainPronounPreference,
} from '../../lib/captain-identity.js';
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

interface LatticeTrackSummary {
  displayGrade: string | null;
  matches: number;
  wins: number;
}

interface LatticeProfileSummary {
  localAi: LatticeTrackSummary;
  online: LatticeTrackSummary;
}

function emptyLatticeTrack(): LatticeTrackSummary {
  return { displayGrade: null, matches: 0, wins: 0 };
}

function readLatticeTrack(raw: unknown): LatticeTrackSummary {
  if (!raw || typeof raw !== 'object') {
    return emptyLatticeTrack();
  }
  const data = raw as {
    displayGrade?: unknown;
    matches?: unknown;
    wins?: unknown;
  };
  return {
    displayGrade:
      typeof data.displayGrade === 'string' && data.displayGrade
        ? data.displayGrade
        : null,
    matches: typeof data.matches === 'number' ? data.matches : 0,
    wins: typeof data.wins === 'number' ? data.wins : 0,
  };
}

async function fetchLatticeProfileSummary(
  uid: string,
): Promise<LatticeProfileSummary | null> {
  const db = getFirestoreDb();
  if (!db) {
    return null;
  }
  const snap = await getDoc(doc(db, 'latticeTei', uid));
  if (!snap.exists()) {
    return {
      localAi: emptyLatticeTrack(),
      online: emptyLatticeTrack(),
    };
  }
  const data = snap.data() as Record<string, unknown>;
  return {
    localAi: readLatticeTrack(data.localAi),
    online: readLatticeTrack(data.online),
  };
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
  const [captainGender, setCaptainGender] =
    useState<CaptainGender>(DEFAULT_CAPTAIN_GENDER);
  const [captainPronouns, setCaptainPronouns] =
    useState<CaptainPronounPreference>(DEFAULT_CAPTAIN_PRONOUNS);
  const [speakAs, setSpeakAs] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crewTeiRows, setCrewTeiRows] = useState<CrewTeiRow[]>([]);
  const [latticeSummary, setLatticeSummary] =
    useState<LatticeProfileSummary | null>(null);
  const configured = isFirebaseConfigured();
  const needsSignIn = !routeUid && !isVerifiedUser(user);

  useEffect(() => {
    if (!configured || !ready || !targetUid) {
      setLoading(false);
      setLatticeSummary(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [loadedProfile, loadedStats, loadedLattice] = await Promise.all([
          fetchPlayerProfile(targetUid),
          fetchPlayerStats(targetUid),
          fetchLatticeProfileSummary(targetUid),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(loadedProfile);
        setStats(loadedStats);
        setLatticeSummary(loadedLattice);
        setDisplayName(resolveFederationCallSign(loadedProfile, loadedStats));
        setBio(loadedProfile?.bio ?? '');
        setGamingIds(loadedProfile?.gamingIds ?? {});
        setCaptainGender(
          isCaptainGender(loadedProfile?.captainGender)
            ? loadedProfile.captainGender
            : isCaptainGender(loadedStats?.captainGender)
              ? loadedStats.captainGender
              : DEFAULT_CAPTAIN_GENDER
        );
        setCaptainPronouns(
          isCaptainPronounPreference(loadedProfile?.captainPronouns)
            ? sanitizePronounPreference(loadedProfile.captainPronouns)
            : isCaptainPronounPreference(loadedStats?.captainPronouns)
              ? sanitizePronounPreference(loadedStats.captainPronouns)
              : DEFAULT_CAPTAIN_PRONOUNS
        );
        setSpeakAs(
          sanitizeSpeakAs(
            loadedProfile?.speakAs !== undefined
              ? loadedProfile.speakAs
              : (loadedStats?.speakAs ?? null)
          )
        );

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
      captainGender,
      captainPronouns: sanitizePronounPreference(captainPronouns),
      speakAs: sanitizeSpeakAs(speakAs),
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
  const lattice = latticeSummary ?? {
    localAi: emptyLatticeTrack(),
    online: emptyLatticeTrack(),
  };
  const callSign =
    displayName.trim() ||
    (isOwnProfile ? user?.displayName?.trim() : '') ||
    '';

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Federation Profile</p>
        <h1 className={panelStyles.panelTitle}>
          {needsSignIn
            ? 'Federation Profile'
            : isOwnProfile
              ? 'Your Federation Profile'
              : callSign || 'Captain Profile'}
        </h1>
        <p className={panelStyles.panelBody}>
          Your call sign and captain identity are shared across the Interstellar
          Warp Gaming Federation — Warp, Subspace Lattice, and TEI ladders.
          Avatar, pronouns, and spoken-as keep narration consistent. Link
          platform gaming IDs so future native builds can sync achievements with
          Apple Game Center, Google Play Games, and Xbox Live on Windows.
        </p>
        {callSign && !needsSignIn ? (
          <div className={styles.identitySummary}>
            <img
              src={captainPilotIcon(captainGender)}
              alt=""
              className={styles.identityAvatar}
            />
            <div>
              <p className={styles.callSignLine}>
                Call sign <strong>{callSign}</strong>
              </p>
              <p className={styles.identityMeta}>
                {captainGenderLabel(captainGender)} ·{' '}
                {captainPronounsLabel(captainPronouns)}
                {speakAs ? ` · spoken as “${speakAs}”` : ''}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {!routeUid && configured ? (
        <SignInPanel
          requireVerified
          title="Captain sign-in"
          hint="Sign in with Google to load your call sign, Warp Dominoes record, and Subspace Lattice TEI."
        />
      ) : null}

      {!configured && (
        <p className={panelStyles.errorState}>Firebase is not configured.</p>
      )}

      {configured && loading && targetUid ? (
        <p className={panelStyles.loadingState}>Loading captain record…</p>
      ) : null}

      {error && <p className={panelStyles.errorState}>{error}</p>}
      {message && <p className={styles.success}>{message}</p>}

      <section className={styles.productSection} data-product="warp">
        <header className={styles.productHeader}>
          <Warp12Logo width={180} marginLeft="0" />
          <div>
            <h2 className={styles.productTitle}>Warp Dominoes</h2>
            <p className={styles.productLead}>
              Verified fleet play, crew TEI, and practice vs AI in the Warp pool.
            </p>
          </div>
        </header>

        {needsSignIn ? (
          <p className={styles.productEmpty}>
            Sign in to see your Warp Dominoes standings on this profile.
          </p>
        ) : (
          <>
            {visibleStats && !loading && verified ? (
              <div className={statCardStyles.grid}>
                <article className={statCardStyles.card}>
                  <p className={statCardStyles.label}>Verified wins</p>
                  <p className={statCardStyles.value}>{verified.matchesWon}</p>
                </article>
                <article className={statCardStyles.card}>
                  <p className={statCardStyles.label}>Verified matches</p>
                  <p className={statCardStyles.value}>
                    {verified.matchesCompleted}
                  </p>
                </article>
                <article className={statCardStyles.card}>
                  <p className={statCardStyles.label}>Human pool</p>
                  <p className={statCardStyles.value}>{verified.humanMatches}</p>
                </article>
                <article className={statCardStyles.card}>
                  <p className={statCardStyles.label}>Practice vs AI</p>
                  <p className={statCardStyles.value}>
                    {verified.practiceAiMatches}
                  </p>
                </article>
                <article className={statCardStyles.card}>
                  <p className={statCardStyles.label}>Global go-out TEI</p>
                  <p className={statCardStyles.value}>
                    {displayHumanObjectiveRating(visibleStats, 'go-out') ??
                      displayHumanObjectiveTei(visibleStats, 'go-out') ??
                      '—'}
                  </p>
                </article>
                <article className={statCardStyles.card}>
                  <p className={statCardStyles.label}>Global points TEI</p>
                  <p className={statCardStyles.value}>
                    {displayHumanObjectiveRating(visibleStats, 'points') ??
                      displayHumanObjectiveTei(visibleStats, 'points') ??
                      '—'}
                  </p>
                </article>
              </div>
            ) : null}

            {crewTeiRows.length > 0 && !loading ? (
              <div className={styles.nestedBlock}>
                <h3 className={styles.localAiTitle}>Crew TEI</h3>
                <p className={styles.localAiLead}>
                  Unassisted rated matches scoped to each crew charter. Global
                  Official rows also feed the human pool ladder.
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
              </div>
            ) : null}

            <div className={styles.nestedBlock}>
              <h3 className={styles.localAiTitle}>Practice vs AI</h3>
              <p className={styles.localAiLead}>
                Matches bucketed by the highest AI commission track at your
                table. Go-out and points each have their own solo TEI track —
                updated only on server-verified unassisted wins and losses.
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
                    {(Object.keys(LOCAL_AI_LABELS) as AiSkillLevel[]).map(
                      (skill) => {
                        const bucket = localAi[skill];
                        const solo = unassistedMatchStats(bucket);
                        const assisted = assistedMatchStats(bucket);
                        const goOutRating =
                          displayObjectiveRating(bucket, 'go-out') ??
                          displayObjectiveTei(bucket, 'go-out');
                        const pointsRating =
                          displayObjectiveRating(bucket, 'points') ??
                          displayObjectiveTei(bucket, 'points');
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
                                  (
                                  {formatWinRate(
                                    objectiveWinRate(bucket, 'go-out')!,
                                  )}
                                  )
                                </span>
                              )}
                            </td>
                            <td>
                              {pointsRating ?? '—'}
                              {objectiveWinRate(bucket, 'points') !== null && (
                                <span className={styles.objectiveSub}>
                                  {' '}
                                  (
                                  {formatWinRate(
                                    objectiveWinRate(bucket, 'points')!,
                                  )}
                                  )
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
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      <section className={styles.productSection} data-product="lattice">
        <header className={styles.productHeader}>
          <img
            className={styles.latticeLogo}
            src="/SubspaceLattice-text-title-pretty.svg"
            alt="Subspace Lattice"
            width={200}
            height={40}
          />
          <div>
            <h2 className={styles.productTitle}>Subspace Lattice</h2>
            <p className={styles.productLead}>
              Separate OpenSkill pool — local AI and rated online sectors.
            </p>
          </div>
        </header>

        {needsSignIn ? (
          <p className={styles.productEmpty}>
            Sign in to see your Lattice TEI on this profile. The section stays
            here even before your first sector.
          </p>
        ) : (
          <div className={styles.localAiTableWrap}>
            <table className={styles.localAiTable}>
              <thead>
                <tr>
                  <th>Track</th>
                  <th>TEI</th>
                  <th>Wins</th>
                  <th>Matches</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Local AI</td>
                  <td>
                    {lattice.localAi.displayGrade ? (
                      <TeiGradeText grade={lattice.localAi.displayGrade} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{lattice.localAi.wins}</td>
                  <td>{lattice.localAi.matches}</td>
                </tr>
                <tr>
                  <td>Online</td>
                  <td>
                    {lattice.online.displayGrade ? (
                      <TeiGradeText grade={lattice.online.displayGrade} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{lattice.online.wins}</td>
                  <td>{lattice.online.matches}</td>
                </tr>
              </tbody>
            </table>
            {lattice.localAi.matches === 0 && lattice.online.matches === 0 ? (
              <p className={styles.productEmpty}>
                No Lattice games yet — finish a local AI or rated online sector
                to open a TEI track.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {isOwnProfile && !loading && configured ? (
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
              Used on Warp and Lattice TEI ladders, and as the default name for
              online / pass-and-play seats (overridable per match).
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

          <CaptainIdentityFieldset
            gender={captainGender}
            onGenderChange={setCaptainGender}
            pronouns={captainPronouns}
            onPronounsChange={setCaptainPronouns}
            speakAs={speakAs}
            onSpeakAsChange={setSpeakAs}
            disabled={saving}
          />

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
            {saving ? 'Saving…' : 'Save Federation Profile'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
