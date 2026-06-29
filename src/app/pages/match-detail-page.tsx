import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { SignInPanel } from '../components/sign-in-panel.js';
import {
  RATED_MATCH_STATUS_LABEL,
  RATED_OBJECTIVE_LABEL,
  type RatedMatchDocument,
} from '../../firebase/rated-match-schema.js';
import { fetchRatedMatch } from '../../firebase/rated-match-service.js';
import panelStyles from '../components/panel.module.scss';
import formStyles from '../components/sign-in-panel.module.scss';
import styles from './matches-page.module.scss';

export function MatchDetailPage() {
  const { matchCode = '' } = useParams();
  const [match, setMatch] = useState<RatedMatchDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchRatedMatch(matchCode)
      .then((doc) => {
        if (!cancelled) {
          setMatch(doc);
          setError(doc ? null : 'Match not found.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load match.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [matchCode]);

  if (loading) {
    return <p className={panelStyles.loadingState}>Loading match…</p>;
  }

  if (!match) {
    return (
      <div className={styles.page}>
        <p className={panelStyles.errorState}>{error ?? 'Match not found.'}</p>
        <Link to="/matches">← Back to check-in</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Rated match</p>
        <h1 className={panelStyles.panelTitle}>
          <span className={formStyles.code}>{match.matchCode}</span>
        </h1>
        <p className={panelStyles.panelBody}>
          {RATED_OBJECTIVE_LABEL[match.objective]} · {match.campaignRounds} rounds ·{' '}
          {RATED_MATCH_STATUS_LABEL[match.status]}
        </p>
        {match.venue && <p className={panelStyles.panelBody}>Venue: {match.venue}</p>}
        <p className={panelStyles.panelBody}>
          Official: {match.officialDisplayName}
        </p>
      </section>

      <SignInPanel requireVerified title="Captain sign-in" />

      <section className={panelStyles.panel}>
        <h2 className={panelStyles.panelTitle}>Participants</h2>
        {match.participants.length === 0 ? (
          <p className={panelStyles.emptyState}>No captains checked in yet.</p>
        ) : (
          <table className={formStyles.table}>
            <thead>
              <tr>
                <th>Call sign</th>
                <th>Checked in</th>
              </tr>
            </thead>
            <tbody>
              {match.participants.map((participant) => (
                <tr key={participant.uid}>
                  <td>{participant.displayName}</td>
                  <td>{new Date(participant.checkedInAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {match.standings.length > 0 && (
        <section className={panelStyles.panel}>
          <h2 className={panelStyles.panelTitle}>Standings</h2>
          <table className={formStyles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Captain</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {match.standings.map((row) => (
                <tr key={row.uid}>
                  <td>{row.rank}</td>
                  <td>{row.displayName}</td>
                  <td>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p>
        <Link to="/matches">← Check in to another match</Link>
      </p>
    </div>
  );
}
