import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

import { RATED_OBJECTIVE_LABEL } from '../../firebase/rated-match-schema.js';
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
  objective: CalculatorObjective
): CalculatorRound[] {
  const count = DEFAULT_ROUNDS_BY_OBJECTIVE[objective];
  return Array.from({ length: count }, () => ({
    id: createId(),
    pipsByCaptainId: emptyPips(captainIds),
  }));
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
  const [printInk, setPrintInk] = useState(false);
  const [objective, setObjective] = useState<CalculatorObjective>('points');
  const [missionLabel, setMissionLabel] = useState('');
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
    setObjective(nextObjective);
    setRounds(defaultRounds(captainIds, nextObjective));
    setResult(null);
    setError(null);
  };

  const addCaptain = () => {
    if (captains.length >= MAX_CAPTAINS) {
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
    if (captains.length <= MIN_CAPTAINS) {
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
    if (isGoOut) {
      return;
    }
    setRounds((current) => [
      ...current,
      { id: createId(), pipsByCaptainId: emptyPips(captainIds) },
    ]);
    setResult(null);
  };

  const removeRound = () => {
    if (isGoOut || rounds.length <= 1) {
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
          then compute human-pool TEI updates (TEI spec §6.5). Results are not submitted to
          the leaderboard; use{' '}
          <a href="/officiate">officiated matches</a> for authoritative ratings.
        </p>
      </section>

      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <h2 className={panelStyles.panelTitle}>Mission</h2>
        <div className={styles.missionGrid}>
          <div className={styles.missionField}>
            <label htmlFor="objective">Objective</label>
            <select
              id="objective"
              className={styles.select}
              value={objective}
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
                disabled={rounds.length <= 1}
                aria-label="Remove last round"
              >
                −
              </button>
              <span className={styles.num}>{rounds.length}</span>
              <button
                type="button"
                className={styles.roundButton}
                onClick={addRound}
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
            disabled={captains.length >= MAX_CAPTAINS}
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
                disabled={captains.length <= MIN_CAPTAINS}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className={styles.footerNote} style={{ marginTop: '0.75rem' }}>
          Rated N = human-pool matches already played on the {RATED_OBJECTIVE_LABEL[objective]}{' '}
          track (sets K-factor: 40 / 32 / 24).
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
              {RATED_OBJECTIVE_LABEL[result.objective]} track · human-pool TEI ·{' '}
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
