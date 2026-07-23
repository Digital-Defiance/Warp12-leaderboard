import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';

import { getFirestoreDb, isFirebaseConfigured } from '../../firebase/config.js';
import panelStyles from '../components/panel.module.scss';
import { TeiGradeText } from '../components/tei-grade-text.js';
import styles from './leaderboard-page.module.scss';

const LATTICE_URL = 'https://lattice.iwgf.org';

type TeiTrack = 'localAi' | 'online';

interface LatticeRow {
  uid: string;
  displayName: string;
  displayGrade: string;
  matches: number;
  wins: number;
}

function mapLatticeTeiDocs(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  track: TeiTrack,
): LatticeRow[] {
  return docs
    .map((docSnap) => {
      const skill = docSnap.data[track] as
        | {
            displayGrade?: string;
            matches?: number;
            wins?: number;
          }
        | undefined;
      if (!skill?.displayGrade || !(skill.matches && skill.matches > 0)) {
        return null;
      }
      return {
        uid: docSnap.id,
        displayName: String(docSnap.data.displayName ?? 'Commander'),
        displayGrade: skill.displayGrade,
        matches: skill.matches,
        wins: skill.wins ?? 0,
      };
    })
    .filter((row): row is LatticeRow => row !== null)
    .sort((a, b) => {
      const scoreA = Number(a.displayGrade.slice(1)) || 0;
      const scoreB = Number(b.displayGrade.slice(1)) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.matches - a.matches;
    });
}

async function fetchLatticeTei(track: TeiTrack, max = 50): Promise<LatticeRow[]> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }
  const field = track === 'online' ? 'online.matches' : 'localAi.matches';
  const snap = await getDocs(
    query(collection(db, 'latticeTei'), orderBy(field, 'desc'), limit(max)),
  );
  return mapLatticeTeiDocs(
    snap.docs.map((docSnap) => ({
      id: docSnap.id,
      data: docSnap.data() as Record<string, unknown>,
    })),
    track,
  );
}

export function LatticeLeaderboardPage() {
  const [track, setTrack] = useState<TeiTrack>('localAi');
  const [rows, setRows] = useState<LatticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void fetchLatticeTei(track)
      .then(setRows)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load standings');
      })
      .finally(() => setLoading(false));
  }, [configured, track]);

  return (
    <div className={styles.page} data-testid="lattice-leaderboard">
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>
          <Link to="/leaderboard">← Federation Standings</Link>
          {' · '}
          Subspace Lattice
        </p>
        <h1 className={panelStyles.panelTitle}>Lattice TEI</h1>
        <p className={panelStyles.panelBody}>
          A wholly new discipline under an existing charter — hubs, sensor nets,
          and sector integration on an eleven-by-eleven void. TEI ratings in{' '}
          <code>latticeTei</code> stay separate from Warp Dominoes ladders; names
          come from your{' '}
          <Link to="/profile">Federation Profile</Link> call sign.
          {track === 'localAi'
            ? ' Fast P0 · Normal I10 · Strong I52.'
            : ' Rated sectors only — assisted matches stay off the board.'}
        </p>
      </section>

      <div className={styles.boardTabs} role="tablist">
        <button
          type="button"
          role="tab"
          className={styles.boardTab}
          data-active={track === 'localAi' ? 'true' : undefined}
          data-testid="tei-track-local"
          aria-selected={track === 'localAi'}
          onClick={() => setTrack('localAi')}
        >
          Local AI
        </button>
        <button
          type="button"
          role="tab"
          className={styles.boardTab}
          data-active={track === 'online' ? 'true' : undefined}
          data-testid="tei-track-online"
          aria-selected={track === 'online'}
          onClick={() => setTrack('online')}
        >
          Online
        </button>
      </div>

      {!configured && (
        <p className={panelStyles.errorState}>Firebase is not configured.</p>
      )}
      {loading && <p className={panelStyles.loadingState}>Loading standings…</p>}
      {error && <p className={panelStyles.errorState}>{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className={panelStyles.emptyState} data-testid="leaderboard-empty">
          {track === 'online'
            ? 'No rated online games yet. Finish a rated Lattice sector to appear here.'
            : 'No rated games yet. Finish a local AI match on Lattice to appear here.'}
        </p>
      )}

      {rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table data-testid="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Commander</th>
                <th>TEI</th>
                <th>W–L</th>
                <th>Games</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.uid}>
                  <td>{index + 1}</td>
                  <td>
                    <Link to={`/profile/${row.uid}`} className={styles.captainLink}>
                      {row.displayName}
                    </Link>
                  </td>
                  <td>
                    <TeiGradeText grade={row.displayGrade} />
                  </td>
                  <td>
                    {row.wins}–{Math.max(0, row.matches - row.wins)}
                  </td>
                  <td>{row.matches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.playCta}>
        <a href={LATTICE_URL} target="_blank" rel="noopener noreferrer">
          Take Command
        </a>
      </p>
    </div>
  );
}
