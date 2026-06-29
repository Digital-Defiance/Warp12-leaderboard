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
          <span className={styles.cardEyebrow}>Rankings</span>
          <span className={styles.cardTitle}>Verified Leaderboards</span>
          <span className={styles.cardBody}>
            Officiated human-pool TEI and replay-verified practice vs AI — unassisted only.
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
