import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

import { RATED_OBJECTIVE_LABEL } from '../../firebase/rated-match-schema.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import {
  getCharterLeaderboard,
  listMyCharters,
} from '../../firebase/charter-service.js';
import {
  charterSummaryLine,
  type PublicCharterView,
} from '../../firebase/charter-schema.js';
import { fetchPlayerStats } from '../../firebase/leaderboard-service.js';
import {
  groupObjectiveTeiStats,
  humanObjectiveTeiStats,
} from '../../firebase/schema.js';
import {
  computeHumanTei,
  DEFAULT_ROUNDS_BY_OBJECTIVE,
  type CalculatorCaptain,
  type CalculatorObjective,
  type CalculatorResult,
  type CalculatorRound,
} from '../../lib/human-tei-calculator.js';
import panelStyles from '../components/panel.module.scss';
import formStyles from '../components/sign-in-panel.module.scss';
import { Warp12LogoTournament } from '../Warp12Logo-tournament.js';
import styles from './tei-calculator-page.module.scss';

const MIN_CAPTAINS = 2;
const MAX_CAPTAINS = 8;

function createId(): string {
  return crypto.randomUUID();
}

function emptyPips(captainIds: readonly string[]): Record<string, string> {
  return Object.fromEntries(captainIds.map((id) => [id, '']));
}

function defaultCaptains(): CalculatorCaptain[] {
  return [
    { id: createId(), name: '', startingTei: 1000, priorMatches: 0 },
    { id: createId(), name: '', startingTei: 1000, priorMatches: 0 },
    { id: createId(), name: '', startingTei: 1000, priorMatches: 0 },
    { id: createId(), name: '', startingTei: 1000, priorMatches: 0 },
  ];
}

function defaultRounds(
  captainIds: readonly string[],
  objective: CalculatorObjective,
  roundCount?: number
): CalculatorRound[] {
  const count = roundCount ?? DEFAULT_ROUNDS_BY_OBJECTIVE[objective];
  return Array.from({ length: count }, () => ({
    id: createId(),
    pipsByCaptainId: emptyPips(captainIds),
  }));
}

function captainsForCharter(
  charter: PublicCharterView,
  current: readonly CalculatorCaptain[]
): CalculatorCaptain[] {
  const next = current.slice(0, charter.playerCount);
  while (next.length < charter.playerCount) {
    next.push({
      id: createId(),
      name: '',
      startingTei: 1000,
      priorMatches: 0,
    });
  }
  return next;
}

function rankClass(rank: number): string {
  if (rank === 1) {
    return styles.rank1;
  }
  if (rank === 2) {
    return styles.rank2;
  }
  if (rank === 3) {
    return styles.rank3;
  }
  return styles.rankOther;
}

function deltaClass(delta: number): string {
  if (delta > 0) {
    return styles.deltaUp;
  }
  if (delta < 0) {
    return styles.deltaDown;
  }
  return styles.deltaFlat;
}

function formatDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }
  return String(delta);
}

export function TeiCalculatorPage() {
  const auth = useFirebaseAuth();
  const [printInk, setPrintInk] = useState(false);
  const [objective, setObjective] = useState<CalculatorObjective>('points');
  const [missionLabel, setMissionLabel] = useState('');
  const [previewCharterId, setPreviewCharterId] = useState('');
  const [myCharters, setMyCharters] = useState<PublicCharterView[]>([]);
  const [crewBusy, setCrewBusy] = useState(false);
  const [crewNotice, setCrewNotice] = useState<string | null>(null);
  const [captains, setCaptains] = useState(defaultCaptains);
  const [rounds, setRounds] = useState(() =>
    defaultRounds(
      defaultCaptains().map((captain) => captain.id),
      'points'
    )
  );
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captainIds = useMemo(() => captains.map((captain) => captain.id), [captains]);
  const isGoOut = objective === 'go-out';
  const selectedCharter =
    myCharters.find((crew) => crew.charterId === previewCharterId) ?? null;
  const charterLocked = selectedCharter !== null;
  const teiPoolLabel = selectedCharter
    ? selectedCharter.isGlobalOfficial
      ? 'Global Official (crew + global pools)'
      : `${selectedCharter.name} crew`
    : 'Global human pool';

  useEffect(() => {
    if (!auth.user || auth.user.isAnonymous) {
      setMyCharters([]);
      return;
    }
    void listMyCharters().then(setMyCharters).catch(() => setMyCharters([]));
  }, [auth.user]);

  const applyCharterTemplate = (charter: PublicCharterView) => {
    const nextCaptains = captainsForCharter(charter, captains);
    const nextObjective = charter.objective;
    setObjective(nextObjective);
    setCaptains(nextCaptains);
    setRounds(
      defaultRounds(
        nextCaptains.map((captain) => captain.id),
        nextObjective,
        nextObjective === 'points' ? charter.campaignRounds : 1
      )
    );
    setResult(null);
    setError(null);
    setCrewNotice(null);
  };

  const handlePreviewCharterChange = (charterId: string) => {
    setPreviewCharterId(charterId);
    setResult(null);
    setError(null);
    setCrewNotice(null);
    if (!charterId) {
      return;
    }
    const charter = myCharters.find((crew) => crew.charterId === charterId);
    if (charter) {
      applyCharterTemplate(charter);
    }
  };

  const loadCrewLadderTei = async () => {
    if (!selectedCharter) {
      return;
    }
    setCrewBusy(true);
    setCrewNotice(null);
    setError(null);
    try {
      const { entries } = await getCharterLeaderboard({
        charterId: selectedCharter.charterId,
      });
      const roster = entries.slice(0, selectedCharter.playerCount);
      const nextCaptains = captainsForCharter(selectedCharter, roster.map((entry) => ({
        id: entry.uid,
        name: entry.displayName,
        startingTei: entry.tei ?? 1000,
        priorMatches: entry.matches,
      })));
      setCaptains(nextCaptains);
      setResult(null);
      setCrewNotice(
        roster.length > 0
          ? `Loaded ${roster.length} crew member${roster.length === 1 ? '' : 's'} from the ladder.`
          : 'No crew ratings yet — using default 1000 TEI placeholders.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load crew ladder.');
    } finally {
      setCrewBusy(false);
    }
  };

  const loadGlobalPoolTei = async () => {
    if (!auth.user || auth.user.isAnonymous) {
      return;
    }
    setCrewBusy(true);
    setCrewNotice(null);
    setError(null);
    try {
      const stats = await fetchPlayerStats(auth.user.uid);
      if (!stats) {
        setCrewNotice('No saved global TEI on your profile yet.');
        return;
      }
      const track = humanObjectiveTeiStats(stats, objective);
      setCaptains((current) =>
        current.map((captain, index) =>
          index === 0
            ? {
                ...captain,
                name: captain.name || stats.displayName,
                startingTei: track.unassistedTei ?? captain.startingTei,
                priorMatches: track.unassistedMatches,
              }
            : captain
        )
      );
      setResult(null);
      setCrewNotice('Loaded your global human-pool TEI into the first captain row.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile TEI.');
    } finally {
      setCrewBusy(false);
    }
  };

  const loadDualPoolTei = async () => {
    if (!selectedCharter?.isGlobalOfficial || !auth.user || auth.user.isAnonymous) {
      return;
    }
    setCrewBusy(true);
    setCrewNotice(null);
    setError(null);
    try {
      const [leaderboard, stats] = await Promise.all([
        getCharterLeaderboard({ charterId: selectedCharter.charterId }),
        fetchPlayerStats(auth.user.uid),
      ]);
      const globalTrack = stats
        ? humanObjectiveTeiStats(stats, objective)
        : null;
      const crewTrack = stats
        ? groupObjectiveTeiStats(stats, selectedCharter.charterId, objective)
        : null;
      const roster = leaderboard.entries.slice(0, selectedCharter.playerCount);
      const nextCaptains = captainsForCharter(
        selectedCharter,
        roster.map((entry) => ({
          id: entry.uid,
          name: entry.displayName,
          startingTei: entry.tei ?? 1000,
          priorMatches: entry.matches,
        }))
      );
      setCaptains(nextCaptains);
      setResult(null);
      const you = roster.find((entry) => entry.uid === auth.user?.uid);
      setCrewNotice(
        you
          ? `Crew ladder loaded. Your crew TEI: ${you.tei ?? '—'} · global: ${
              globalTrack?.unassistedTei ?? '—'
            } (same Δ applies to each pool when rated).`
          : `Crew ladder loaded. Your global TEI: ${
              globalTrack?.unassistedTei ?? '—'
            } · crew bucket: ${crewTrack?.unassistedTei ?? '—'}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load TEI pools.');
    } finally {
      setCrewBusy(false);
    }
  };

  const syncRoundKeys = (
    nextCaptains: readonly CalculatorCaptain[],
    currentRounds: readonly CalculatorRound[]
  ): CalculatorRound[] => {
    const ids = nextCaptains.map((captain) => captain.id);
    return currentRounds.map((round) => {
      const pipsByCaptainId: Record<string, string> = {};
      for (const id of ids) {
        pipsByCaptainId[id] = round.pipsByCaptainId[id] ?? '';
      }
      return { ...round, pipsByCaptainId };
    });
  };

  const handleObjectiveChange = (nextObjective: CalculatorObjective) => {
    if (charterLocked && selectedCharter && nextObjective !== selectedCharter.objective) {
      return;
    }
    setObjective(nextObjective);
    setRounds(
      defaultRounds(
        captainIds,
        nextObjective,
        nextObjective === 'points' ? selectedCharter?.campaignRounds : 1
      )
    );
    setResult(null);
    setError(null);
  };

  const addCaptain = () => {
    if (captains.length >= MAX_CAPTAINS || charterLocked) {
      return;
    }
    const captain: CalculatorCaptain = {
      id: createId(),
      name: '',
      startingTei: 1000,
      priorMatches: 0,
    };
    const nextCaptains = [...captains, captain];
    setCaptains(nextCaptains);
    setRounds((current) => syncRoundKeys(nextCaptains, current));
    setResult(null);
  };

  const removeCaptain = (id: string) => {
    if (captains.length <= MIN_CAPTAINS || charterLocked) {
      return;
    }
    const nextCaptains = captains.filter((captain) => captain.id !== id);
    setCaptains(nextCaptains);
    setRounds((current) => syncRoundKeys(nextCaptains, current));
    setResult(null);
  };

  const updateCaptain = (
    id: string,
    patch: Partial<Pick<CalculatorCaptain, 'name' | 'startingTei' | 'priorMatches'>>
  ) => {
    setCaptains((current) =>
      current.map((captain) => (captain.id === id ? { ...captain, ...patch } : captain))
    );
    setResult(null);
  };

  const addRound = () => {
    if (isGoOut || charterLocked) {
      return;
    }
    setRounds((current) => [
      ...current,
      { id: createId(), pipsByCaptainId: emptyPips(captainIds) },
    ]);
    setResult(null);
  };

  const removeRound = () => {
    if (isGoOut || rounds.length <= 1 || charterLocked) {
      return;
    }
    setRounds((current) => current.slice(0, -1));
    setResult(null);
  };

  const updatePip = (roundId: string, captainId: string, value: string) => {
    setRounds((current) =>
      current.map((round) =>
        round.id === roundId
          ? {
              ...round,
              pipsByCaptainId: { ...round.pipsByCaptainId, [captainId]: value },
            }
          : round
      )
    );
    setResult(null);
  };

  const handleCalculate = () => {
    const computed = computeHumanTei(objective, captains, rounds);
    if ('kind' in computed) {
      setError(computed.message);
      setResult(null);
      return;
    }
    setError(null);
    setResult(computed);
  };

  const handlePrint = () => {
    flushSync(() => setPrintInk(true));
    window.print();
  };

  useEffect(() => {
    const armPrintInk = () => {
      flushSync(() => setPrintInk(true));
    };
    const disarmPrintInk = () => {
      setPrintInk(false);
    };
    window.addEventListener('beforeprint', armPrintInk);
    window.addEventListener('afterprint', disarmPrintInk);
    return () => {
      window.removeEventListener('beforeprint', armPrintInk);
      window.removeEventListener('afterprint', disarmPrintInk);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('tei-print-ink', printInk);
    return () => {
      document.body.classList.remove('tei-print-ink');
    };
  }, [printInk]);

  const handleReset = () => {
    const freshCaptains = defaultCaptains();
    setMissionLabel('');
    setPreviewCharterId('');
    setCrewNotice(null);
    setObjective('points');
    setCaptains(freshCaptains);
    setRounds(defaultRounds(freshCaptains.map((captain) => captain.id), 'points'));
    setResult(null);
    setError(null);
  };

  const printedAt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
    [result]
  );

  const scoreSectionTitle = isGoOut ? 'Sector finish' : 'Round pip totals';
  const scoreColumnLabel = isGoOut ? 'Tiles left' : 'Pips';
  const standingColumnLabel = isGoOut ? 'Finish' : 'Total pips';

  return (
    <div className={styles.page}>
      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <p className={panelStyles.panelEyebrow}>Human-pool TEI</p>
        <h1 className={panelStyles.panelTitle}>Campaign scorecard calculator</h1>
        <p className={styles.disclaimer}>
          Offline fan tool for living-room Mexican Train — pick your objective, enter scores,
          then compute TEI updates (TEI spec §6.5). Results are not saved; use{' '}
          <a href="/officiate">officiated matches</a> or online rated sectors for
          authoritative ratings.
        </p>
      </section>

      {myCharters.length > 0 && (
        <section className={`${panelStyles.panel} ${styles.noPrint}`}>
          <h2 className={panelStyles.panelTitle}>Crew preview (optional)</h2>
          <p className={styles.footerNote}>
            Same calculator — choose which TEI pool you are simulating. Crew charters lock
            fleet size and objective to the charter. Global Official updates both crew and
            global ladders when a match is rated for real.
          </p>
          <div className={styles.missionField} style={{ marginTop: '0.75rem' }}>
            <label htmlFor="crew-preview">Preview pool</label>
            <select
              id="crew-preview"
              className={styles.select}
              value={previewCharterId}
              onChange={(event) => handlePreviewCharterChange(event.target.value)}
            >
              <option value="">Global human pool (manual TEI)</option>
              {myCharters.map((crew) => (
                <option key={crew.charterId} value={crew.charterId}>
                  {charterSummaryLine(crew)}
                </option>
              ))}
            </select>
          </div>
          {selectedCharter && (
            <p className={styles.footerNote} style={{ marginTop: '0.5rem' }}>
              Charter: {charterSummaryLine(selectedCharter)}
              {selectedCharter.isGlobalOfficial
                ? ' — rated play updates crew and global TEI.'
                : ' — rated play updates crew TEI only.'}
            </p>
          )}
          <div className={styles.toolbar} style={{ marginTop: '0.75rem' }}>
            <div className={styles.toolbarGroup}>
              {selectedCharter ? (
                <button
                  type="button"
                  className={formStyles.buttonSecondary}
                  disabled={crewBusy}
                  onClick={() => void loadCrewLadderTei()}
                >
                  {crewBusy ? 'Loading…' : 'Load crew ladder TEI'}
                </button>
              ) : (
                auth.user &&
                !auth.user.isAnonymous && (
                  <button
                    type="button"
                    className={formStyles.buttonSecondary}
                    disabled={crewBusy}
                    onClick={() => void loadGlobalPoolTei()}
                  >
                    {crewBusy ? 'Loading…' : 'Load my global TEI'}
                  </button>
                )
              )}
              {selectedCharter?.isGlobalOfficial &&
                auth.user &&
                !auth.user.isAnonymous && (
                  <button
                    type="button"
                    className={formStyles.buttonSecondary}
                    disabled={crewBusy}
                    onClick={() => void loadDualPoolTei()}
                  >
                    {crewBusy ? 'Loading…' : 'Load Global Official pools'}
                  </button>
                )}
            </div>
          </div>
          {crewNotice && (
            <p className={styles.footerNote} style={{ marginTop: '0.5rem' }}>
              {crewNotice}
            </p>
          )}
        </section>
      )}

      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <h2 className={panelStyles.panelTitle}>Mission</h2>
        <div className={styles.missionGrid}>
          <div className={styles.missionField}>
            <label htmlFor="objective">Objective</label>
            <select
              id="objective"
              className={styles.select}
              value={objective}
              disabled={charterLocked}
              onChange={(event) =>
                handleObjectiveChange(event.target.value as CalculatorObjective)
              }
            >
              <option value="points">{RATED_OBJECTIVE_LABEL.points} campaign</option>
              <option value="go-out">{RATED_OBJECTIVE_LABEL['go-out']} sector</option>
            </select>
          </div>
          <div className={styles.missionField}>
            <label htmlFor="mission-label">Sector label (optional, for print)</label>
            <input
              id="mission-label"
              type="text"
              value={missionLabel}
              placeholder="Friday fleet night"
              onChange={(event) => setMissionLabel(event.target.value)}
            />
          </div>
        </div>
        <p className={styles.footerNote} style={{ marginTop: '0.75rem' }}>
          {isGoOut
            ? 'Go-out: one sector per calculation. Enter tiles left in hand at finish — the victor has 0 (empty hand).'
            : 'Points: enter pip totals for each round. Lowest cumulative total wins the campaign.'}
        </p>
        {!isGoOut ? (
          <div className={styles.toolbar} style={{ marginTop: '1rem' }}>
            <span className={styles.toolbarLabel}>Campaign rounds</span>
            <div className={styles.toolbarGroup}>
              <button
                type="button"
                className={styles.roundButton}
                onClick={removeRound}
                disabled={rounds.length <= 1 || charterLocked}
                aria-label="Remove last round"
              >
                −
              </button>
              <span className={styles.num}>{rounds.length}</span>
              <button
                type="button"
                className={styles.roundButton}
                onClick={addRound}
                disabled={charterLocked}
                aria-label="Add round"
              >
                +
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <div className={styles.toolbar}>
          <h2 className={panelStyles.panelTitle} style={{ margin: 0 }}>
            Captains
          </h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={addCaptain}
            disabled={captains.length >= MAX_CAPTAINS || charterLocked}
          >
            Add captain
          </button>
        </div>
        <div className={styles.captainGrid}>
          {captains.map((captain) => (
            <div key={captain.id} className={styles.captainRow}>
              <label>
                Call sign
                <input
                  type="text"
                  value={captain.name}
                  placeholder="Captain Kirk"
                  onChange={(event) =>
                    updateCaptain(captain.id, { name: event.target.value })
                  }
                />
              </label>
              <label>
                Current TEI
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={captain.startingTei}
                  onChange={(event) =>
                    updateCaptain(captain.id, {
                      startingTei: Number(event.target.value) || 0,
                    })
                  }
                />
              </label>
              <label>
                Rated N
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={captain.priorMatches}
                  onChange={(event) =>
                    updateCaptain(captain.id, {
                      priorMatches: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className={styles.rowRemove}
                onClick={() => removeCaptain(captain.id)}
                disabled={captains.length <= MIN_CAPTAINS || charterLocked}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className={styles.footerNote} style={{ marginTop: '0.75rem' }}>
          Rated N = matches already played on the {RATED_OBJECTIVE_LABEL[objective]}{' '}
          track in the <strong>{teiPoolLabel}</strong> bucket (sets K-factor: 40 / 32 / 24).
        </p>
      </section>

      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <h2 className={panelStyles.panelTitle}>{scoreSectionTitle}</h2>
        <div className={styles.scoreWrap}>
          <table className={styles.scoreTable}>
            <thead>
              <tr>
                <th scope="col">{isGoOut ? 'Sector' : 'Round'}</th>
                {captains.map((captain) => (
                  <th key={captain.id} scope="col">
                    {captain.name.trim() || 'Captain'}
                    <span className={styles.columnHint}>{scoreColumnLabel}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round, index) => (
                <tr key={round.id}>
                  <td>{isGoOut ? 'Finish' : `Round ${index + 1}`}</td>
                  {captains.map((captain) => (
                    <td key={captain.id}>
                      <input
                        className={styles.pipInput}
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        aria-label={`${isGoOut ? 'Tiles left' : `Round ${index + 1} pips`} for ${captain.name || 'captain'}`}
                        value={round.pipsByCaptainId[captain.id] ?? ''}
                        onChange={(event) =>
                          updatePip(round.id, captain.id, event.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.buttonPrimary} onClick={handleCalculate}>
            Calculate TEI
          </button>
          <button
            type="button"
            className={formStyles.buttonSecondary}
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </section>

      {result ? (
        <section
          className={`${panelStyles.panel} ${styles.printSheet}${printInk ? ` ${styles.printInk}` : ''}`}
          id="tei-print-sheet"
        >
          <div className={styles.printHeader}>
            <Warp12LogoTournament
              width={240}
              numberColor={printInk ? '#000000' : '#ffffff'}
              taglineColor={printInk ? '#000000' : '#e2e8f0'}
            />
            <h2 className={styles.printTitle}>
              {missionLabel.trim() || 'Warp 12 campaign scorecard'}
            </h2>
            <p className={styles.printMeta}>
              {RATED_OBJECTIVE_LABEL[result.objective]} track · {teiPoolLabel} ·{' '}
              {result.objective === 'points'
                ? `${result.roundCount} round${result.roundCount === 1 ? '' : 's'}`
                : 'single sector'}{' '}
              · {printedAt}
            </p>
          </div>

          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Captain</th>
                <th>{standingColumnLabel}</th>
                <th>TEI before</th>
                <th>TEI after</th>
                <th>Δ TEI</th>
                <th>K</th>
                <th>Class after</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.captainId}>
                  <td>
                    <span className={`${styles.rankBadge} ${rankClass(row.rank)}`}>
                      {row.rank}
                    </span>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.standingLabel}</td>
                  <td className={styles.num}>{row.teiBefore}</td>
                  <td className={styles.num}>{row.teiAfter}</td>
                  <td className={`${styles.num} ${deltaClass(row.teiDelta)}`}>
                    {formatDelta(row.teiDelta)}
                  </td>
                  <td className={styles.num}>{row.kFactor}</td>
                  <td>
                    {row.tacticalClassAfter}
                    <span className={styles.footerNote}> · {row.tacticalTaglineAfter}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {result.objective === 'points' ? (
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Captain</th>
                  {Array.from({ length: result.roundCount }, (_, index) => (
                    <th key={index}>R{index + 1}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={`${row.captainId}-rounds`}>
                    <td>{row.name}</td>
                    {row.roundValues.map((value, index) => (
                      <td key={index} className={styles.num}>
                        {value}
                      </td>
                    ))}
                    <td className={styles.num}>{row.standingValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <p className={styles.footerNote}>
            Unofficial estimate per TEI spec v1.1 §6.5 (pairwise human pool,{' '}
            {RATED_OBJECTIVE_LABEL[result.objective].toLowerCase()} track).
            {result.objective === 'points'
              ? ' Lowest cumulative pip total wins.'
              : ' First empty hand wins; others ranked by tiles remaining.'}{' '}
            Ties share competition rank. Not recorded on leaderboard.warp12.app.
          </p>

          <div className={`${styles.actions} ${styles.noPrint}`}>
            <button type="button" className={styles.buttonPrimary} onClick={handlePrint}>
              Print scorecard
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
