import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { SignInPanel } from '../components/sign-in-panel.js';
import { useWarpRoles } from '../../firebase/use-warp-roles.js';
import {
  approveRatedMatch,
  fetchRatedMatch,
  rejectRatedMatch,
  submitMatchStandings,
} from '../../firebase/rated-match-service.js';
import {
  RATED_MATCH_STATUS_LABEL,
  RATED_OBJECTIVE_LABEL,
  type RatedMatchDocument,
  type RatedMatchStanding,
} from '../../firebase/rated-match-schema.js';
import panelStyles from '../components/panel.module.scss';
import formStyles from '../components/sign-in-panel.module.scss';
import styles from './matches-page.module.scss';

export function OfficiateDetailPage() {
  const { matchCode = '' } = useParams();
  const roles = useWarpRoles();
  const [match, setMatch] = useState<RatedMatchDocument | null>(null);
  const [rows, setRows] = useState<RatedMatchStanding[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const doc = await fetchRatedMatch(matchCode);
    setMatch(doc);
    if (doc?.standings.length) {
      setRows(doc.standings);
    } else if (doc) {
      setRows(
        doc.participants.map((participant, index) => ({
          uid: participant.uid,
          displayName: participant.displayName,
          rank: index + 1,
          score: 0,
        }))
      );
    }
  };

  useEffect(() => {
    void reload().catch(() => setError('Could not load match.'));
  }, [matchCode]);

  const canManage = useMemo(
    () => roles.isOfficial && match && match.status !== 'approved',
    [match, roles.isOfficial]
  );

  const updateRow = (
    uid: string,
    patch: Partial<Pick<RatedMatchStanding, 'rank' | 'score'>>
  ) => {
    setRows((current) =>
      current.map((row) => (row.uid === uid ? { ...row, ...patch } : row))
    );
  };

  const handleSubmitStandings = async () => {
    if (!match) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await submitMatchStandings({ matchCode: match.matchCode, standings: rows });
      setMessage('Standings submitted.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!match) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await approveRatedMatch(match.matchCode);
      setMessage('Match approved — TEI applied.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!match) {
      return;
    }
    setBusy(true);
    try {
      await rejectRatedMatch({ matchCode: match.matchCode });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!match) {
    return <p className={panelStyles.loadingState}>Loading match…</p>;
  }

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Officiation</p>
        <h1 className={panelStyles.panelTitle}>
          <span className={formStyles.code}>{match.matchCode}</span>
        </h1>
        <p className={panelStyles.panelBody}>
          Share this code with captains at{' '}
          <Link to={`/matches/${encodeURIComponent(match.matchCode)}`}>
            /matches/{match.matchCode}
          </Link>
        </p>
        <p className={panelStyles.panelBody}>
          {RATED_OBJECTIVE_LABEL[match.objective]} · {match.campaignRounds} rounds ·{' '}
          {RATED_MATCH_STATUS_LABEL[match.status]}
        </p>
      </section>

      <SignInPanel requireVerified title="Official sign-in" />

      <section className={panelStyles.panel}>
        <h2 className={panelStyles.panelTitle}>Checked-in captains</h2>
        <table className={formStyles.table}>
          <thead>
            <tr>
              <th>Captain</th>
              <th>Rank</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.uid}>
                <td>{row.displayName}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={row.rank}
                    disabled={!canManage}
                    onChange={(event) =>
                      updateRow(row.uid, { rank: Number(event.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.score}
                    disabled={!canManage}
                    onChange={(event) =>
                      updateRow(row.uid, { score: Number(event.target.value) })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {canManage && (
          <div className={formStyles.actions}>
            <button
              type="button"
              className={formStyles.buttonSecondary}
              disabled={busy || rows.length < 2}
              onClick={() => void handleSubmitStandings()}
            >
              Submit standings
            </button>
            <button
              type="button"
              className={formStyles.buttonPrimary}
              disabled={busy || match.status !== 'completed'}
              onClick={() => void handleApprove()}
            >
              Approve & apply TEI
            </button>
            <button
              type="button"
              className={formStyles.buttonSecondary}
              disabled={busy}
              onClick={() => void handleReject()}
            >
              Reject
            </button>
          </div>
        )}
        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={panelStyles.errorState}>{error}</p>}
      </section>

      <p>
        <Link to="/officiate">← Officiate home</Link>
      </p>
    </div>
  );
}
