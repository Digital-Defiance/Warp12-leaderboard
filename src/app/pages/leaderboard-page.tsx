import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  BOARD_OPTIONS,
  boardDescription,
  OBJECTIVE_OPTIONS,
  type BoardKind,
} from '../../lib/leaderboard-boards.js';
import panelStyles from '../components/panel.module.scss';
import {
  fetchLeaderboard,
  fetchHumanPoolLeaderboard,
  fetchLocalAiLeaderboard,
  seedDemoStatsIfEmpty,
} from '../../firebase/leaderboard-service.js';
import { isFirebaseConfigured } from '../../firebase/config.js';
import type {
  HumanPoolLeaderboardEntry,
  LeaderboardEntry,
  LocalAiLeaderboardEntry,
  RatedObjective,
} from '../../firebase/schema.js';
import styles from './leaderboard-page.module.scss';

function formatWinRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function LeaderboardPage() {
  const [board, setBoard] = useState<BoardKind>('fleet');
  const [objective, setObjective] = useState<RatedObjective>('go-out');
  const [fleetEntries, setFleetEntries] = useState<LeaderboardEntry[]>([]);
  const [localEntries, setLocalEntries] = useState<LocalAiLeaderboardEntry[]>(
    []
  );
  const [humanEntries, setHumanEntries] = useState<HumanPoolLeaderboardEntry[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isFirebaseConfigured();
  const activeBoard = BOARD_OPTIONS.find((option) => option.id === board);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await seedDemoStatsIfEmpty();
        if (board === 'fleet') {
          const rows = await fetchLeaderboard(25);
          if (!cancelled) {
            setFleetEntries(rows);
          }
        } else if (board === 'human') {
          const rows = await fetchHumanPoolLeaderboard(objective, 25);
          if (!cancelled) {
            setHumanEntries(rows);
          }
        } else {
          const rows = await fetchLocalAiLeaderboard(board, objective, 25);
          if (!cancelled) {
            setLocalEntries(rows);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
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
  }, [configured, board, objective]);

  const entries =
    board === 'fleet'
      ? fleetEntries
      : board === 'human'
        ? humanEntries
        : localEntries;
  const isLocalBoard = board !== 'fleet' && board !== 'human';
  const isHumanBoard = board === 'human';

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Fleet Rankings</p>
        <h1 className={panelStyles.panelTitle}>Leaderboard</h1>
        <p className={panelStyles.panelBody}>
          Rankings use verified pools only — officiated human matches and
          replay-verified practice vs AI. Unassisted matches count toward TEI;
          advisor-assisted practice is recorded but unrated.
        </p>
      </section>

      <div className={styles.boardTabs} role="tablist" aria-label="Leaderboard view">
        {BOARD_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={board === option.id}
            className={styles.boardTab}
            data-active={board === option.id ? 'true' : undefined}
            onClick={() => setBoard(option.id)}
          >
            <span>{option.label}</span>
            <span className={styles.boardBadge}>{option.badge}</span>
          </button>
        ))}
      </div>

      {board !== 'fleet' && (
        <div className={styles.boardTabs} role="tablist" aria-label="Objective">
          {OBJECTIVE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={objective === option.id}
              className={styles.boardTab}
              data-active={objective === option.id ? 'true' : undefined}
              onClick={() => setObjective(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {activeBoard && (
        <p className={styles.boardDescription}>
          <span className={styles.boardDescriptionBadge}>{activeBoard.badge}</span>
          {boardDescription(board, objective)}
        </p>
      )}

      {!configured && (
        <p className={panelStyles.errorState}>
          Firebase is not configured. Copy <code>.env.example</code> to{' '}
          <code>.env</code> and add your Warp 12 project credentials.
        </p>
      )}

      {configured && loading && (
        <p className={panelStyles.loadingState}>Scanning fleet records…</p>
      )}

      {error && <p className={panelStyles.errorState}>{error}</p>}

      {configured && !loading && !error && entries.length === 0 && (
        <p className={panelStyles.emptyState}>
          {isHumanBoard
            ? `No officiated ${objective === 'go-out' ? 'go-out' : 'points'} human-pool ratings yet.`
            : isLocalBoard
            ? `No replay-verified solo ${objective === 'go-out' ? 'go-out' : 'points'} stats for this AI tier yet.`
            : 'No verified match records yet — play a rated practice match or join an officiated event.'}
        </p>
      )}

      {fleetEntries.length > 0 && board === 'fleet' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Captain</th>
                <th>Verified wins</th>
                <th>Verified matches</th>
                <th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {fleetEntries.map((entry) => (
                <tr key={entry.uid}>
                  <td>{entry.rank}</td>
                  <td>
                    <Link to={`/profile/${entry.uid}`} className={styles.captainLink}>
                      {entry.displayName}
                    </Link>
                  </td>
                  <td>{entry.matchesWon}</td>
                  <td>{entry.matchesCompleted}</td>
                  <td>{formatWinRate(entry.winRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {humanEntries.length > 0 && board === 'human' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Captain</th>
                <th>Human-pool TEI</th>
                <th>Percentile</th>
                <th>Wins</th>
                <th>Officiated matches</th>
                <th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {humanEntries.map((entry) => (
                <tr key={entry.uid}>
                  <td>{entry.rank}</td>
                  <td>
                    <Link to={`/profile/${entry.uid}`} className={styles.captainLink}>
                      {entry.displayName}
                    </Link>
                  </td>
                  <td>{entry.unassistedTei ?? '—'}</td>
                  <td>{entry.unassistedPercentile}</td>
                  <td>{entry.unassistedWins}</td>
                  <td>{entry.unassistedMatches}</td>
                  <td>{formatWinRate(entry.unassistedWinRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {localEntries.length > 0 && isLocalBoard && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Captain</th>
                <th>Solo TEI</th>
                <th>Percentile</th>
                <th>Solo wins</th>
                <th>Verified matches</th>
                <th>Solo win rate</th>
              </tr>
            </thead>
            <tbody>
              {localEntries.map((entry) => (
                <tr key={entry.uid}>
                  <td>{entry.rank}</td>
                  <td>
                    <Link to={`/profile/${entry.uid}`} className={styles.captainLink}>
                      {entry.displayName}
                    </Link>
                  </td>
                  <td>{entry.unassistedTei ?? '—'}</td>
                  <td>{entry.unassistedPercentile}</td>
                  <td>{entry.unassistedWins}</td>
                  <td>{entry.unassistedMatches}</td>
                  <td>{formatWinRate(entry.unassistedWinRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
