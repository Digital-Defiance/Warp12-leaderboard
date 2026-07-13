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
  groupObjectiveRatingStats,
  humanObjectiveRatingStats,
} from '../../firebase/schema.js';
import {
  computeHumanTei,
  DEFAULT_ROUNDS_BY_OBJECTIVE,
  DEFAULT_CAPTAIN_GRADE,
  DEFAULT_CAPTAIN_RATING,
  GRADE_OPTIONS,
  parseGradeString,
  type CalculatorCaptain,
  type CalculatorObjective,
  type CalculatorResult,
  type CalculatorRound,
} from '../../lib/human-tei-calculator.js';
import type { TeiGrade } from 'warp12-engine';
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
  return Array.from({ length: 4 }, () => ({
    id: createId(),
    name: '',
    startingGrade: DEFAULT_CAPTAIN_GRADE,
    startingRating: DEFAULT_CAPTAIN_RATING,
    priorMatches: 0,
  }));
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
  const next = current.slice(0, charter.playerCount) as CalculatorCaptain[];
  while (next.length < charter.playerCount) {
    next.push({ id: createId(), name: '', startingGrade: DEFAULT_CAPTAIN_GRADE, startingRating: DEFAULT_CAPTAIN_RATING, priorMatches: 0 });
  }
  return next;
}

function rankClass(rank: number): string {
  if (rank === 1) return styles.rank1;
  if (rank === 2) return styles.rank2;
  if (rank === 3) return styles.rank3;
  return styles.rankOther;
}

function deltaClass(delta: number): string {
  if (delta > 0) return styles.deltaUp;
  if (delta < 0) return styles.deltaDown;
  return styles.deltaFlat;
}

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
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
    defaultRounds(defaultCaptains().map((c) => c.id), 'points')
  );
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Raw text the user is typing for numeric captain fields. Kept separate from
  // the committed numeric state so keystrokes aren't clamped/re-parsed mid-edit
  // (which caused stale/duplicated digits like "011"). Cleared on blur once the
  // clamped value is committed via updateCaptain.
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, string>>({});
  const [matchDrafts, setMatchDrafts] = useState<Record<string, string>>({});

  const captainIds = useMemo(() => captains.map((c) => c.id), [captains]);
  const isGoOut = objective === 'go-out';
  const selectedCharter = myCharters.find((c) => c.charterId === previewCharterId) ?? null;
  const charterLocked = selectedCharter !== null;
  const teiPoolLabel = selectedCharter
    ? selectedCharter.isGlobalOfficial
      ? 'Global Official (crew + global pools)'
      : `${selectedCharter.name} crew`
    : 'Global human pool';

  useEffect(() => {
    if (!auth.user || auth.user.isAnonymous) { setMyCharters([]); return; }
    void listMyCharters().then(setMyCharters).catch(() => setMyCharters([]));
  }, [auth.user]);

  const applyCharterTemplate = (charter: PublicCharterView) => {
    const nextCaptains = captainsForCharter(charter, captains);
    const nextObjective = charter.objective as CalculatorObjective;
    setObjective(nextObjective);
    setCaptains(nextCaptains);
    setRounds(defaultRounds(
      nextCaptains.map((c) => c.id), nextObjective,
      nextObjective === 'points' ? charter.campaignRounds : 1
    ));
    setResult(null); setError(null); setCrewNotice(null);
  };

  const handlePreviewCharterChange = (charterId: string) => {
    setPreviewCharterId(charterId);
    setResult(null); setError(null); setCrewNotice(null);
    if (!charterId) return;
    const charter = myCharters.find((c) => c.charterId === charterId);
    if (charter) applyCharterTemplate(charter);
  };

  /** Convert a stored grade string like "V67" or a raw StoredRating into captain fields. */
  function gradeStringToCaptainFields(
    gradeString: string | number | undefined,
    fallbackGrade: TeiGrade = DEFAULT_CAPTAIN_GRADE
  ): { startingGrade: TeiGrade; startingRating: number } {
    if (typeof gradeString === 'string') {
      const parsed = parseGradeString(gradeString);
      if (parsed) return { startingGrade: parsed.grade, startingRating: parsed.score };
    }
    if (typeof gradeString === 'number') {
      // Legacy integer display rating — treat as score, grade unknown
      return { startingGrade: fallbackGrade, startingRating: Math.max(0, Math.min(99, Math.round(gradeString))) };
    }
    return { startingGrade: DEFAULT_CAPTAIN_GRADE, startingRating: DEFAULT_CAPTAIN_RATING };
  }

  const loadCrewLadderTei = async () => {
    if (!selectedCharter) return;
    setCrewBusy(true); setCrewNotice(null); setError(null);
    try {
      const { entries } = await getCharterLeaderboard({ charterId: selectedCharter.charterId });
      const roster = entries.slice(0, selectedCharter.playerCount);
      const nextCaptains = captainsForCharter(selectedCharter, roster.map((entry) => ({
        id: entry.uid,
        name: entry.displayName,
        ...gradeStringToCaptainFields(entry.tei ?? undefined),
        priorMatches: entry.matches,
      })));
      setCaptains(nextCaptains); setResult(null);
      setCrewNotice(roster.length > 0
        ? `Loaded ${roster.length} crew member${roster.length === 1 ? '' : 's'} from the ladder.`
        : 'No crew ratings yet — using default starting ratings.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load crew ladder.');
    } finally { setCrewBusy(false); }
  };

  const loadGlobalPoolTei = async () => {
    if (!auth.user || auth.user.isAnonymous) return;
    setCrewBusy(true); setCrewNotice(null); setError(null);
    try {
      const stats = await fetchPlayerStats(auth.user.uid);
      if (!stats) { setCrewNotice('No saved global TEI on your profile yet.'); return; }
      const track = humanObjectiveRatingStats(stats, objective);
      const gradeStr = track.rating?.displayGrade;
      const fields = gradeStringToCaptainFields(gradeStr);
      setCaptains((cur) => cur.map((c, i) => i === 0
        ? { ...c, name: c.name || stats.displayName, ...fields, priorMatches: track.unassistedMatches }
        : c
      ));
      setResult(null);
      setCrewNotice(`Loaded your global human-pool rating (${gradeStr ?? '—'}) into the first captain row.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile TEI.');
    } finally { setCrewBusy(false); }
  };

  const loadDualPoolTei = async () => {
    if (!selectedCharter?.isGlobalOfficial || !auth.user || auth.user.isAnonymous) return;
    setCrewBusy(true); setCrewNotice(null); setError(null);
    try {
      const [leaderboard, stats] = await Promise.all([
        getCharterLeaderboard({ charterId: selectedCharter.charterId }),
        fetchPlayerStats(auth.user.uid),
      ]);
      const globalGrade = stats ? humanObjectiveRatingStats(stats, objective).rating?.displayGrade : undefined;
      const crewGrade = stats ? groupObjectiveRatingStats(stats, selectedCharter.charterId, objective).rating?.displayGrade : undefined;
      const roster = leaderboard.entries.slice(0, selectedCharter.playerCount);
      setCaptains(captainsForCharter(selectedCharter, roster.map((entry) => ({
        id: entry.uid, name: entry.displayName,
        ...gradeStringToCaptainFields(entry.tei ?? undefined),
        priorMatches: entry.matches,
      }))));
      setResult(null);
      const you = roster.find((e) => e.uid === auth.user?.uid);
      setCrewNotice(you
        ? `Crew ladder loaded. Your crew rating: ${you.tei ?? '—'} · global: ${globalGrade ?? '—'}.`
        : `Crew ladder loaded. Your global rating: ${globalGrade ?? '—'} · crew: ${crewGrade ?? '—'}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load TEI pools.');
    } finally { setCrewBusy(false); }
  };

  const syncRoundKeys = (
    nextCaptains: readonly CalculatorCaptain[],
    currentRounds: readonly CalculatorRound[]
  ): CalculatorRound[] => {
    const ids = nextCaptains.map((c) => c.id);
    return currentRounds.map((round) => ({
      ...round,
      pipsByCaptainId: Object.fromEntries(ids.map((id) => [id, round.pipsByCaptainId[id] ?? ''])),
    }));
  };

  const handleObjectiveChange = (nextObjective: CalculatorObjective) => {
    if (charterLocked && selectedCharter && nextObjective !== selectedCharter.objective) return;
    setObjective(nextObjective);
    setRounds(defaultRounds(captainIds, nextObjective,
      nextObjective === 'points' ? selectedCharter?.campaignRounds : 1));
    setResult(null); setError(null);
  };

  const addCaptain = () => {
    if (captains.length >= MAX_CAPTAINS || charterLocked) return;
    const captain: CalculatorCaptain = { id: createId(), name: '', startingGrade: DEFAULT_CAPTAIN_GRADE, startingRating: DEFAULT_CAPTAIN_RATING, priorMatches: 0 };
    const next = [...captains, captain];
    setCaptains(next); setRounds((cur) => syncRoundKeys(next, cur)); setResult(null);
  };

  const removeCaptain = (id: string) => {
    if (captains.length <= MIN_CAPTAINS || charterLocked) return;
    const next = captains.filter((c) => c.id !== id);
    setCaptains(next); setRounds((cur) => syncRoundKeys(next, cur)); setResult(null);
  };

  const updateCaptain = (id: string, patch: Partial<Pick<CalculatorCaptain, 'name' | 'startingGrade' | 'startingRating' | 'priorMatches'>>) => {
    setCaptains((cur) => cur.map((c) => c.id === id ? { ...c, ...patch } : c));
    setResult(null);
  };

  /** Allow free typing (including empty string / partial numbers) while focused. */
  const handleRatingDraftChange = (id: string, raw: string) => {
    setRatingDrafts((cur) => ({ ...cur, [id]: raw }));
  };

  /** Clamp to 0-99 and commit once the user leaves the field. */
  const commitRatingDraft = (id: string) => {
    setRatingDrafts((cur) => {
      const raw = cur[id];
      if (raw !== undefined) {
        const clamped = Math.max(0, Math.min(99, Math.round(Number(raw)) || 0));
        updateCaptain(id, { startingRating: clamped });
      }
      const next = { ...cur };
      delete next[id];
      return next;
    });
  };

  const handleMatchDraftChange = (id: string, raw: string) => {
    setMatchDrafts((cur) => ({ ...cur, [id]: raw }));
  };

  const commitMatchDraft = (id: string) => {
    setMatchDrafts((cur) => {
      const raw = cur[id];
      if (raw !== undefined) {
        const clamped = Math.max(0, Math.round(Number(raw)) || 0);
        updateCaptain(id, { priorMatches: clamped });
      }
      const next = { ...cur };
      delete next[id];
      return next;
    });
  };

  const addRound = () => {
    if (isGoOut || charterLocked) return;
    setRounds((cur) => [...cur, { id: createId(), pipsByCaptainId: emptyPips(captainIds) }]);
    setResult(null);
  };

  const removeRound = () => {
    if (isGoOut || rounds.length <= 1 || charterLocked) return;
    setRounds((cur) => cur.slice(0, -1)); setResult(null);
  };

  const updatePip = (roundId: string, captainId: string, value: string) => {
    setRounds((cur) => cur.map((r) =>
      r.id === roundId
        ? { ...r, pipsByCaptainId: { ...r.pipsByCaptainId, [captainId]: value } }
        : r
    ));
    setResult(null);
  };

  const handleCalculate = () => {
    const computed = computeHumanTei(objective, captains, rounds);
    if ('kind' in computed) { setError(computed.message); setResult(null); return; }
    setError(null); setResult(computed);
  };

  const handlePrint = () => { flushSync(() => setPrintInk(true)); window.print(); };

  useEffect(() => {
    const arm = () => { flushSync(() => setPrintInk(true)); };
    const disarm = () => { setPrintInk(false); };
    window.addEventListener('beforeprint', arm);
    window.addEventListener('afterprint', disarm);
    return () => { window.removeEventListener('beforeprint', arm); window.removeEventListener('afterprint', disarm); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('tei-print-ink', printInk);
    return () => { document.body.classList.remove('tei-print-ink'); };
  }, [printInk]);

  const handleReset = () => {
    const fresh = defaultCaptains();
    setMissionLabel(''); setPreviewCharterId(''); setCrewNotice(null);
    setObjective('points'); setCaptains(fresh);
    setRounds(defaultRounds(fresh.map((c) => c.id), 'points'));
    setResult(null); setError(null);
  };

  const printedAt = useMemo(() =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    [result]
  );

  const scoreSectionTitle = isGoOut ? 'Sector finish' : 'Round points';
  const scoreColumnLabel = isGoOut ? 'Tiles left' : 'Points';
  const standingColumnLabel = isGoOut ? 'Finish' : 'Total points';

  return (
    <div className={styles.page}>
      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <p className={panelStyles.panelEyebrow}>Human-pool TEI</p>
        <h1 className={panelStyles.panelTitle}>Campaign scorecard calculator</h1>
        <p className={styles.disclaimer}>
          Offline fan tool — pick your objective, enter scores, compute estimated rating
          updates. Results are unofficial; use{' '}
          <a href="/officiate">officiated matches</a> or online rated sectors for
          authoritative ratings.
        </p>
      </section>

      {myCharters.length > 0 && (
        <section className={`${panelStyles.panel} ${styles.noPrint}`}>
          <h2 className={panelStyles.panelTitle}>Crew preview (optional)</h2>
          <div className={styles.missionField} style={{ marginTop: '0.75rem' }}>
            <label htmlFor="crew-preview">Preview pool</label>
            <select id="crew-preview" className={styles.select} value={previewCharterId}
              onChange={(e) => handlePreviewCharterChange(e.target.value)}>
              <option value="">Global human pool (manual ratings)</option>
              {myCharters.map((crew) => (
                <option key={crew.charterId} value={crew.charterId}>{charterSummaryLine(crew)}</option>
              ))}
            </select>
          </div>
          {selectedCharter && (
            <p className={styles.footerNote} style={{ marginTop: '0.5rem' }}>
              Charter: {charterSummaryLine(selectedCharter)}
              {selectedCharter.isGlobalOfficial ? ' — rated play updates crew and global TEI.' : ' — rated play updates crew TEI only.'}
            </p>
          )}
          <div className={styles.toolbar} style={{ marginTop: '0.75rem' }}>
            <div className={styles.toolbarGroup}>
              {selectedCharter ? (
                <button type="button" className={formStyles.buttonSecondary} disabled={crewBusy}
                  onClick={() => void loadCrewLadderTei()}>
                  {crewBusy ? 'Loading…' : 'Load crew ladder ratings'}
                </button>
              ) : (auth.user && !auth.user.isAnonymous && (
                <button type="button" className={formStyles.buttonSecondary} disabled={crewBusy}
                  onClick={() => void loadGlobalPoolTei()}>
                  {crewBusy ? 'Loading…' : 'Load my global rating'}
                </button>
              ))}
              {selectedCharter?.isGlobalOfficial && auth.user && !auth.user.isAnonymous && (
                <button type="button" className={formStyles.buttonSecondary} disabled={crewBusy}
                  onClick={() => void loadDualPoolTei()}>
                  {crewBusy ? 'Loading…' : 'Load Global Official pools'}
                </button>
              )}
            </div>
          </div>
          {crewNotice && <p className={styles.footerNote} style={{ marginTop: '0.5rem' }}>{crewNotice}</p>}
        </section>
      )}

      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <h2 className={panelStyles.panelTitle}>Mission</h2>
        <div className={styles.missionGrid}>
          <div className={styles.missionField}>
            <label htmlFor="objective">Objective</label>
            <select id="objective" className={styles.select} value={objective} disabled={charterLocked}
              onChange={(e) => handleObjectiveChange(e.target.value as CalculatorObjective)}>
              <option value="points">{RATED_OBJECTIVE_LABEL.points} campaign</option>
              <option value="go-out">{RATED_OBJECTIVE_LABEL['go-out']} sector</option>
            </select>
          </div>
          <div className={styles.missionField}>
            <label htmlFor="mission-label">Sector label (optional, for print)</label>
            <input id="mission-label" type="text" value={missionLabel} placeholder="Friday fleet night"
              onChange={(e) => setMissionLabel(e.target.value)} />
          </div>
        </div>
        {!isGoOut && (
          <div className={styles.toolbar} style={{ marginTop: '1rem' }}>
            <span className={styles.toolbarLabel}>Campaign rounds</span>
            <div className={styles.toolbarGroup}>
              <button type="button" className={styles.roundButton} onClick={removeRound}
                disabled={rounds.length <= 1 || charterLocked} aria-label="Remove last round">−</button>
              <span className={styles.num}>{rounds.length}</span>
              <button type="button" className={styles.roundButton} onClick={addRound}
                disabled={charterLocked} aria-label="Add round">+</button>
            </div>
          </div>
        )}
        <p className={styles.footerNote} style={{ marginTop: '0.75rem' }}>
          {isGoOut
            ? 'Go-out: one sector per calculation. Enter tiles left in hand — the victor has 0.'
            : 'Points: enter each captain\u2019s pip count left in hand per round. Lowest cumulative total wins the campaign.'}
        </p>
      </section>

      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <div className={styles.toolbar}>
          <h2 className={panelStyles.panelTitle} style={{ margin: 0 }}>Captains</h2>
          <button type="button" className={styles.iconButton} onClick={addCaptain}
            disabled={captains.length >= MAX_CAPTAINS || charterLocked}>Add captain</button>
        </div>
        <p className={styles.footerNote} style={{ marginBottom: '0.75rem' }}>
          Set each captain's current TEI grade and rating. The grade (confidence letter) and rating (0–99 skill) together
          make up the TEI shown on the leaderboard — e.g. <strong>V67</strong> means Veteran confidence, rating 67.
        </p>
        <div className={styles.captainGrid}>
          {captains.map((captain) => (
            <div key={captain.id} className={styles.captainRow}>
              <label>
                Call sign
                <input type="text" value={captain.name} placeholder="Captain Armstrong"
                  onChange={(e) => updateCaptain(captain.id, { name: e.target.value })} />
              </label>
              <label>
                Grade
                <select
                  className={styles.select}
                  value={captain.startingGrade}
                  onChange={(e) => updateCaptain(captain.id, { startingGrade: e.target.value as TeiGrade })}
                  aria-label={`${captain.name || 'Captain'} grade`}
                >
                  {GRADE_OPTIONS.map((opt) => (
                    <option key={opt.grade} value={opt.grade}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Rating (0–99)
                <input type="number" min={0} max={99} step={1}
                  value={ratingDrafts[captain.id] ?? captain.startingRating}
                  aria-label={`${captain.name || 'Captain'} rating`}
                  onChange={(e) => handleRatingDraftChange(captain.id, e.target.value)}
                  onBlur={() => commitRatingDraft(captain.id)} />
              </label>
              <label>
                Rated matches
                <input type="number" min={0} step={1}
                  value={matchDrafts[captain.id] ?? captain.priorMatches}
                  onChange={(e) => handleMatchDraftChange(captain.id, e.target.value)}
                  onBlur={() => commitMatchDraft(captain.id)} />
              </label>
              <button type="button" className={styles.rowRemove} onClick={() => removeCaptain(captain.id)}
                disabled={captains.length <= MIN_CAPTAINS || charterLocked}>Remove</button>
            </div>
          ))}
        </div>
        <p className={styles.footerNote} style={{ marginTop: '0.75rem' }}>
          Rated matches = games already played on the {RATED_OBJECTIVE_LABEL[objective]} track in the{' '}
          <strong>{teiPoolLabel}</strong> pool. More matches = higher confidence, smaller expected update.
        </p>
      </section>

      <section className={`${panelStyles.panel} ${styles.noPrint}`}>
        <h2 className={panelStyles.panelTitle}>{scoreSectionTitle}</h2>
        <div className={styles.scoreWrap}>
          <table className={styles.scoreTable}>
            <thead>
              <tr>
                <th scope="col">{isGoOut ? 'Sector' : 'Round'}</th>
                {captains.map((c) => (
                  <th key={c.id} scope="col">
                    {c.name.trim() || 'Captain'}
                    <span className={styles.columnHint}>{scoreColumnLabel}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round, index) => (
                <tr key={round.id}>
                  <td>{isGoOut ? 'Finish' : `Round ${index + 1}`}</td>
                  {captains.map((c) => (
                    <td key={c.id}>
                      <input className={styles.pipInput} type="number" min={0} step={1} inputMode="numeric"
                        aria-label={`${isGoOut ? 'Tiles left' : `Round ${index + 1} points`} for ${c.name || 'captain'}`}
                        value={round.pipsByCaptainId[c.id] ?? ''}
                        onChange={(e) => updatePip(round.id, c.id, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.buttonPrimary} onClick={handleCalculate}>Calculate TEI</button>
          <button type="button" className={formStyles.buttonSecondary} onClick={handleReset}>Reset</button>
        </div>
      </section>

      {result && (
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
            <h2 className={styles.printTitle}>{missionLabel.trim() || 'Warp 12 campaign scorecard'}</h2>
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
                <th>Rating before</th>
                <th>Rating after</th>
                <th>Δ rating</th>
                <th>Class after</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.captainId}>
                  <td>
                    <span className={`${styles.rankBadge} ${rankClass(row.rank)}`}>{row.rank}</span>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.standingLabel}</td>
                  <td className={styles.num}>{row.gradeBefore}</td>
                  <td className={styles.num}>
                    {row.gradeAfter}
                    {row.gradeChanged && (
                      <span className={styles.gradePromotion} aria-label="Grade changed"> ↑</span>
                    )}
                  </td>
                  <td className={`${styles.num} ${deltaClass(row.ratingDelta)}`}>
                    {formatDelta(row.ratingDelta)}
                  </td>
                  <td>
                    {row.tacticalClassAfter}
                    <span className={styles.footerNote}> · {row.tacticalTaglineAfter}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {result.objective === 'points' && (
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Captain</th>
                  {Array.from({ length: result.roundCount }, (_, i) => <th key={i}>R{i + 1}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={`${row.captainId}-rounds`}>
                    <td>{row.name}</td>
                    {row.roundValues.map((v, i) => <td key={i} className={styles.num}>{v}</td>)}
                    <td className={styles.num}>{row.standingValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className={styles.footerNote}>
            Unofficial estimate — authoritative rating calculations are performed server-side.
            {result.objective === 'points' ? ' Lowest cumulative pip total wins.' : ' First empty hand wins; others ranked by tiles remaining.'}{' '}
            Ties share competition rank. Not recorded on iwdf.org.
          </p>
          <p className={styles.footerNote}>
            Grade key: <strong>P</strong> Provisional · <strong>I</strong> Improving · <strong>C</strong> Consistent · <strong>V</strong> Veteran · <strong>E</strong> Elite.
            The rating (0–99) reflects conservative skill (μ − 3σ). Grade reflects data confidence (σ).
          </p>

          <div className={`${styles.actions} ${styles.noPrint}`}>
            <button type="button" className={styles.buttonPrimary} onClick={handlePrint}>Print scorecard</button>
          </div>
        </section>
      )}
    </div>
  );
}
