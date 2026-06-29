import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import panelStyles from '../components/panel.module.scss';
import { fetchMatchLogBySlug } from '../../firebase/leaderboard-service.js';
import { isFirebaseConfigured } from '../../firebase/config.js';
import type { PublishedLogDocument } from '../../firebase/schema.js';
import styles from './match-log-detail-page.module.scss';

export function MatchLogDetailPage() {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const [log, setLog] = useState<PublishedLogDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured || !shareSlug) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!shareSlug) {
        setError('Missing log slug.');
        setLoading(false);
        return;
      }

      try {
        const row = await fetchMatchLogBySlug(shareSlug);
        if (!cancelled) {
          setLog(row);
          if (!row) {
            setError('Log not found or not public.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load log');
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
  }, [configured, shareSlug]);

  return (
    <div className={styles.page}>
      <Link to="/logs" className={styles.backLink}>
        ← Back to logs
      </Link>

      {!configured && (
        <p className={panelStyles.errorState}>Firebase is not configured.</p>
      )}

      {configured && loading && (
        <p className={panelStyles.loadingState}>Loading log transcript…</p>
      )}

      {error && <p className={panelStyles.errorState}>{error}</p>}

      {log && (
        <>
          <section className={panelStyles.panel}>
            <p className={panelStyles.panelEyebrow}>Round Transcript</p>
            <h1 className={panelStyles.panelTitle}>
              Round {log.roundNumber}
              {log.sectorCode ? ` · ${log.sectorCode}` : ''}
            </h1>
            <p className={panelStyles.panelBody}>
              Published by {log.authorDisplayName} · {log.summary.mode} match ·{' '}
              {log.summary.captainCount} captains
              {log.summary.winnerDisplayName
                ? ` · winner ${log.summary.winnerDisplayName}`
                : ''}
            </p>
          </section>

          <pre className={styles.transcript}>{log.lines.join('\n')}</pre>
        </>
      )}
    </div>
  );
}
