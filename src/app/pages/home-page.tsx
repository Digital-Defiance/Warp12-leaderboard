import { Link } from 'react-router-dom';

import panelStyles from '../components/panel.module.scss';
import styles from './home-page.module.scss';

const BRIDGE_URL = 'https://warp12.app';

export function HomePage() {
  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Fleet Command Archive</p>
        <h1 className={panelStyles.panelTitle}>Share stats. Publish match logs.</h1>
        <p className={panelStyles.panelBody}>
          The Warp 12 leaderboard tracks captain performance across local and online
          sectors. Publish round logs from the bridge table to build a searchable
          archive of memorable matches.
        </p>
      </section>

      <div className={styles.cards}>
        <Link to="/matches" className={styles.card}>
          <span className={styles.cardEyebrow}>Rated play</span>
          <span className={styles.cardTitle}>Officiated matches</span>
          <span className={styles.cardBody}>
            Check in with a match code, or officiate offline events for human-pool TEI.
          </span>
        </Link>

        <Link to="/leaderboard" className={styles.card}>
          <span className={styles.cardEyebrow}>Standard</span>
          <span className={styles.cardTitle}>Global Official ladder</span>
          <span className={styles.cardBody}>
            Public Warp 12 rankings — Official rules, verified rated play, season leaderboard.
          </span>
        </Link>

        <Link to="/crews" className={styles.card}>
          <span className={styles.cardEyebrow}>Friends</span>
          <span className={styles.cardTitle}>Crew ladders</span>
          <span className={styles.cardBody}>
            Private charters for your table — scoped group TEI separate from the global standard.
          </span>
        </Link>

        <Link to="/leaderboard" className={styles.card}>
          <span className={styles.cardEyebrow}>All pools</span>
          <span className={styles.cardTitle}>Full leaderboards</span>
          <span className={styles.cardBody}>
            Human pool, solo vs AI tiers, and combined verified fleet totals.
          </span>
        </Link>

        <Link to="/calculator" className={styles.card}>
          <span className={styles.cardEyebrow}>Offline tool</span>
          <span className={styles.cardTitle}>TEI scorecard calculator</span>
          <span className={styles.cardBody}>
            Enter round pip totals at the table, compute human-pool TEI, and print a scorecard.
          </span>
        </Link>

        <Link to="/logs" className={styles.card}>
          <span className={styles.cardEyebrow}>Archive</span>
          <span className={styles.cardTitle}>Published Logs</span>
          <span className={styles.cardBody}>
            Shared round transcripts with sector codes and timestamps.
          </span>
        </Link>

        <Link to="/profile" className={styles.card}>
          <span className={styles.cardEyebrow}>Identity</span>
          <span className={styles.cardTitle}>Captain Profile</span>
          <span className={styles.cardBody}>
            Link Game Center, Play Games, or Xbox Live IDs to your stats.
          </span>
        </Link>
      </div>

      <section className={styles.roadmap}>
        <h2 className={styles.roadmapTitle}>Coming from the bridge</h2>
        <ul className={styles.roadmapList}>
          <li>Publish round logs directly from the in-game log viewer</li>
          <li>Sync achievements with Apple Game Center and Google Play Games</li>
          <li>Submit scores to Xbox Live via the Windows desktop build</li>
        </ul>
        <a href={BRIDGE_URL} className={styles.playLink}>
          Play Warp 12 on the bridge
        </a>
      </section>
    </div>
  );
}
