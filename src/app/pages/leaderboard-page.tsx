import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  BOARD_OPTIONS,
  boardDescription,
  FLEET_SIZE_OPTIONS,
  OBJECTIVE_OPTIONS,
  type BoardKind,
} from '../../lib/leaderboard-boards.js';
import panelStyles from '../components/panel.module.scss';
import { TeiGradeText } from '../components/tei-grade-text.js';
import {
  fetchLeaderboard,
  fetchGroupTeiLeaderboard,
  fetchHumanPoolLeaderboard,
  fetchLocalAiLeaderboard,
  seedDemoStatsIfEmpty,
} from '../../firebase/leaderboard-service.js';
import { getCharter } from '../../firebase/charter-service.js';
import {
  charterSummaryLine,
  globalOfficialCharterId,
  globalOfficialSlug,
  GLOBAL_OFFICIAL_PLAYER_COUNTS,
  type PublicCharterView,
} from '../../firebase/charter-schema.js';
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
  const [board, setBoard] = useState<BoardKind>('global-official');
  const [objective, setObjective] = useState<RatedObjective>('points');
  const [fleetSize, setFleetSize] = useState<number>(4);
  const [hideProvisional, setHideProvisional] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  
  // Load advanced view preference from localStorage
  const [advancedView, setAdvancedView] = useState(() => {
    try {
      const stored = localStorage.getItem('warp12-leaderboard-advanced-view');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [globalOfficialCharter, setGlobalOfficialCharter] =
    useState<PublicCharterView | null>(null);
  const [fleetEntries, setFleetEntries] = useState<LeaderboardEntry[]>([]);
  const [localEntries, setLocalEntries] = useState<LocalAiLeaderboardEntry[]>(
    []
  );
  const [humanEntries, setHumanEntries] = useState<HumanPoolLeaderboardEntry[]>(
    []
  );
  const [globalOfficialEntries, setGlobalOfficialEntries] = useState<
    HumanPoolLeaderboardEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isFirebaseConfigured();
  const activeBoard = BOARD_OPTIONS.find((option) => option.id === board);
  const activeFleetSize = fleetSize;
  const globalOfficialSupported = GLOBAL_OFFICIAL_PLAYER_COUNTS.includes(
    fleetSize as (typeof GLOBAL_OFFICIAL_PLAYER_COUNTS)[number]
  );

  // Persist advanced view preference to localStorage
  const toggleAdvancedView = (enabled: boolean) => {
    setAdvancedView(enabled);
    try {
      localStorage.setItem('warp12-leaderboard-advanced-view', String(enabled));
    } catch {
      // ignore quota / private mode
    }
  };

  useEffect(() => {
    if (!configured || board !== 'global-official') {
      return;
    }
    void getCharter({ slug: globalOfficialSlug(fleetSize) })
      .then((charter) => {
        setGlobalOfficialCharter(charter);
        if (charter.objective === 'points' || charter.objective === 'go-out') {
          setObjective(charter.objective);
        }
      })
      .catch(() => setGlobalOfficialCharter(null));
  }, [configured, board, fleetSize]);

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
        } else if (board === 'global-official') {
          if (!globalOfficialSupported) {
            if (!cancelled) {
              setGlobalOfficialEntries([]);
            }
          } else {
            const rows = await fetchGroupTeiLeaderboard(
              globalOfficialCharterId(fleetSize),
              objective,
              25,
              globalOfficialCharter?.seasonKey
            );
            if (!cancelled) {
              setGlobalOfficialEntries(rows);
            }
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
  }, [configured, board, objective, fleetSize, globalOfficialSupported, globalOfficialCharter?.seasonKey]);

  const entries =
    board === 'fleet'
      ? fleetEntries
      : board === 'global-official'
        ? globalOfficialEntries
        : board === 'human'
          ? humanEntries
          : localEntries;

  const isLocalBoard = board !== 'fleet' && board !== 'human' && board !== 'global-official';
  const isHumanBoard = board === 'human';
  const isGlobalOfficialBoard = board === 'global-official';
  const teiColumnLabel = isGlobalOfficialBoard
    ? 'Global Official TEI'
    : isHumanBoard
      ? 'Human-pool TEI'
      : 'Solo TEI';

  // Apply filters to entries with TEI grades
  const filteredEntries = entries.filter((entry) => {
    if (board === 'fleet') return true; // Fleet board doesn't have TEI grades

    const teiEntry = entry as HumanPoolLeaderboardEntry | LocalAiLeaderboardEntry;
    const grade = teiEntry.unassistedTei;

    // Hide provisional filter (P grade)
    if (hideProvisional && typeof grade === 'string' && grade.startsWith('P')) {
      return false;
    }

    // Grade filter
    if (gradeFilter !== 'all' && typeof grade === 'string') {
      const entryGrade = grade.charAt(0);
      if (gradeFilter === 'elite' && entryGrade !== 'E') return false;
      if (gradeFilter === 'veteran' && entryGrade !== 'V') return false;
      if (gradeFilter === 'consistent' && entryGrade !== 'C') return false;
      if (gradeFilter === 'ev' && entryGrade !== 'E' && entryGrade !== 'V') return false;
    }

    return true;
  });

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Fleet Rankings</p>
        <h1 className={panelStyles.panelTitle}>Leaderboard</h1>
        <p className={panelStyles.panelBody}>
          <strong>Global Official</strong> is the public Warp 12 standard — Official
          rules, declared fleet size, rated sectors and officiated nights. Friend-group{' '}
          <Link to="/crews">crew ladders</Link> are separate. Solo practice vs AI uses
          replay-verified boards below.
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

      {isGlobalOfficialBoard && (
        <div className={styles.boardTabs} role="tablist" aria-label="Fleet size">
          {FLEET_SIZE_OPTIONS.map((size) => {
            const supported = GLOBAL_OFFICIAL_PLAYER_COUNTS.includes(
              size as (typeof GLOBAL_OFFICIAL_PLAYER_COUNTS)[number]
            );
            return (
              <button
                key={size}
                type="button"
                role="tab"
                aria-selected={fleetSize === size}
                className={styles.boardTab}
                data-active={fleetSize === size ? 'true' : undefined}
                disabled={!supported}
                title={
                  supported
                    ? undefined
                    : 'Global Official for this fleet size is not open this season — use a private crew.'
                }
                onClick={() => supported && setFleetSize(size)}
              >
                {size}p
              </button>
            );
          })}
        </div>
      )}

      {isGlobalOfficialBoard && globalOfficialCharter && (
        <p className={styles.boardDescription}>
          <span className={styles.boardDescriptionBadge}>Standard</span>
          {charterSummaryLine(globalOfficialCharter)}
          {globalOfficialCharter.seasonLabel
            ? ` · Season ${globalOfficialCharter.seasonLabel}`
            : ''}
          {' · '}
          <Link to={`/crews/${globalOfficialSlug(fleetSize)}`}>Join / crew page</Link>
        </p>
      )}

      {activeBoard && !isGlobalOfficialBoard && (
        <p className={styles.boardDescription}>
          <span className={styles.boardDescriptionBadge}>{activeBoard.badge}</span>
          {boardDescription(board, objective, {
            playerCount: activeFleetSize,
            seasonLabel: globalOfficialCharter?.seasonLabel,
          })}
        </p>
      )}

      {isGlobalOfficialBoard && !globalOfficialCharter && !loading && (
        <p className={styles.boardDescription}>
          {boardDescription('global-official', objective, { playerCount: fleetSize })}
        </p>
      )}

      {isGlobalOfficialBoard && !globalOfficialSupported && (
        <p className={panelStyles.panelBody}>
          Global Official is not open for <strong>{fleetSize} captains</strong>{' '}
          this season. Try 4p, 6p, or 8p — or create a{' '}
          <Link to="/crews">private crew</Link>.
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
          {isGlobalOfficialBoard && !globalOfficialSupported
            ? `No Global Official board for ${fleetSize} captains this season.`
            : isGlobalOfficialBoard
              ? `No Global Official ${objective === 'go-out' ? 'go-out' : 'points'} ratings yet — join the charter and play a rated sector or officiated match.`
              : isHumanBoard
                ? `No officiated ${objective === 'go-out' ? 'go-out' : 'points'} human-pool ratings yet.`
                : isLocalBoard
                  ? `No replay-verified solo ${objective === 'go-out' ? 'go-out' : 'points'} stats for this AI tier yet.`
                  : 'No verified match records yet — play a rated practice match or join an officiated event.'}
        </p>
      )}

      {!loading && !error && entries.length > 0 && board !== 'fleet' && (
        <div className={styles.filters}>
          <label className={styles.filterCheckbox}>
            <input
              type="checkbox"
              checked={hideProvisional}
              onChange={(e) => setHideProvisional(e.target.checked)}
            />
            <span>Hide provisional (P grade)</span>
          </label>
          <label className={styles.filterSelect}>
            <span>Grade filter:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="all">All grades</option>
              <option value="elite">Elite (E) only</option>
              <option value="veteran">Veteran (V) only</option>
              <option value="consistent">Consistent (C) only</option>
              <option value="ev">E + V only</option>
            </select>
          </label>
          <label className={styles.filterCheckbox}>
            <input
              type="checkbox"
              checked={advancedView}
              onChange={(e) => toggleAdvancedView(e.target.checked)}
            />
            <span>Advanced view (show μ, σ, ordinal rating)</span>
          </label>
        </div>
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

      {(filteredEntries.length > 0 && board === 'human') ||
      (filteredEntries.length > 0 && board === 'global-official') ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Captain</th>
                <th>{teiColumnLabel}</th>
                {advancedView && <th title="Skill estimate (μ) — The system's best guess at your true skill level. Higher is better.">μ</th>}
                {advancedView && <th title="Uncertainty (σ) — How confident the system is in your rating. Lower is better (more data).">σ</th>}
                {advancedView && <th title="Ordinal rating (μ - 3σ) — Conservative skill estimate used for matchmaking and sorting.">Ordinal</th>}
                <th>Percentile</th>
                <th>Wins</th>
                <th>Rated matches</th>
                <th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {(filteredEntries as HumanPoolLeaderboardEntry[]).map(
                (entry) => (
                  <tr key={entry.uid}>
                    <td>{entry.rank}</td>
                    <td>
                      <Link to={`/profile/${entry.uid}`} className={styles.captainLink}>
                        {entry.displayName}
                      </Link>
                    </td>
                    <td><TeiGradeText grade={entry.unassistedTei} /></td>
                    {advancedView && <td>{entry.mu?.toFixed(2) ?? '—'}</td>}
                    {advancedView && <td>{entry.sigma?.toFixed(2) ?? '—'}</td>}
                    {advancedView && <td>{entry.ordinalRating?.toFixed(1) ?? '—'}</td>}
                    <td>{entry.unassistedPercentile}</td>
                    <td>{entry.unassistedWins}</td>
                    <td>{entry.unassistedMatches}</td>
                    <td>{formatWinRate(entry.unassistedWinRate)}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {localEntries.length > 0 && isLocalBoard && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Captain</th>
                <th>{teiColumnLabel}</th>
                {advancedView && <th title="Skill estimate (μ) — The system's best guess at your true skill level. Higher is better.">μ</th>}
                {advancedView && <th title="Uncertainty (σ) — How confident the system is in your rating. Lower is better (more data).">σ</th>}
                {advancedView && <th title="Ordinal rating (μ - 3σ) — Conservative skill estimate used for matchmaking and sorting.">Ordinal</th>}
                <th>Percentile</th>
                <th>Solo wins</th>
                <th>Verified matches</th>
                <th>Solo win rate</th>
              </tr>
            </thead>
            <tbody>
              {(filteredEntries as LocalAiLeaderboardEntry[]).map((entry) => (
                <tr key={entry.uid}>
                  <td>{entry.rank}</td>
                  <td>
                    <Link to={`/profile/${entry.uid}`} className={styles.captainLink}>
                      {entry.displayName}
                    </Link>
                  </td>
                  <td><TeiGradeText grade={entry.unassistedTei} /></td>
                  {advancedView && <td>{entry.mu?.toFixed(2) ?? '—'}</td>}
                  {advancedView && <td>{entry.sigma?.toFixed(2) ?? '—'}</td>}
                  {advancedView && <td>{entry.ordinalRating?.toFixed(1) ?? '—'}</td>}
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
