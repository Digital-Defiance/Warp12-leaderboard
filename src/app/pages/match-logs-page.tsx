import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import panelStyles from '../components/panel.module.scss';
import { fetchPublicMatchLogs } from '../../firebase/leaderboard-service.js';
import { isFirebaseConfigured } from '../../firebase/config.js';
import type { PublishedLogDocument } from '../../firebase/schema.js';
import styles from './match-logs-page.module.scss';

function formatPublishedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function MatchLogsPage() {
  const [logs, setLogs] = useState<PublishedLogDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const rows = await fetchPublicMatchLogs(30);
        if (!cancelled) {
          setLogs(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load match logs');
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
  }, [configured]);

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Mission Archive</p>
        <h1 className={panelStyles.panelTitle}>Published Round Logs</h1>
        <p className={panelStyles.panelBody}>
          Captains can publish round transcripts from the bridge table. Each log
          keeps the formatted lines from the in-game log export, sector code, and
          round metadata for sharing and review.
        </p>
      </section>

      {!configured && (
        <p className={panelStyles.errorState}>
          Firebase is not configured. Add your Warp 12 credentials to load logs.
        </p>
      )}

      {configured && loading && (
        <p className={panelStyles.loadingState}>Retrieving archived logs…</p>
      )}

      {error && <p className={panelStyles.errorState}>{error}</p>}

      {configured && !loading && !error && logs.length === 0 && (
        <p className={panelStyles.emptyState}>
          No public logs yet. Publish a round log from Warp 12 to seed the archive.
        </p>
      )}

      {logs.length > 0 && (
        <ul className={styles.list}>
          {logs.map((log) => (
            <li key={log.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <Link to={`/logs/${log.shareSlug}`} className={styles.itemTitle}>
                  Round {log.roundNumber}
                  {log.sectorCode ? ` · ${log.sectorCode}` : ''}
                </Link>
                <span className={styles.itemDate}>{formatPublishedAt(log.publishedAt)}</span>
              </div>
              <p className={styles.itemMeta}>
                {log.authorDisplayName} · {log.summary.mode} · {log.summary.captainCount}{' '}
                captains
                {log.summary.winnerDisplayName
                  ? ` · winner ${log.summary.winnerDisplayName}`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
