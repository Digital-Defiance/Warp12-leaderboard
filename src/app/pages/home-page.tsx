import { Link } from 'react-router-dom';

import panelStyles from '../components/panel.module.scss';
import styles from './home-page.module.scss';
import type { FC } from 'react';

const BRIDGE_URL = 'https://warp.iwdf.org';

export const HomePage: FC = () => {
  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <h1 className={styles.hColor}>Welcome to the Federation.</h1>
        <p>For generations, dominoes has been treated as a casual parlor game.{' '}
          <span className={styles.iwdfFederation}>The Interstellar Warp Domino Federation</span>{' '}
          (<span className={`${styles.hColor} ${styles.iwdfFederationWide}`}>IWDF</span>)
          was founded on a different premise: that the strategic placement of interlocking
          numerical tiles is a profound tactical discipline. What casual players see as matching
          pips, a Captain recognizes as vector management and probability control. The board is
          your bridge. Chart your trail.
        </p>
        <h2 className={styles.hColor}>A New Era for the Board</h2>
        <p>What was once a chaotic parlor game of "trains" has been engineered into Warp Dominoes—a
          unified tournament discipline. The IWDF sanctions gameplay across multiple scales of
          engagement. Whether you are running a lightning-fast <span className={styles.hColor}><a className={styles.aNoUnderline} href="https://warp.iwdf.org/factor?factor=9" target="_blank" rel="noopener noreferrer">Warp 9</a></span>{' '}
         (Double-Nine) skirmish, competing in the standard <span className={styles.hColor}>
          <a className={styles.aNoUnderline} href="https://warp.iwdf.org/factor?factor=12" target="_blank" rel="noopener noreferrer">Warp 12</a></span>{' '}
         (Double-Twelve) ladders, or enduring a massive <span className={styles.hColor}><a className={styles.aNoUnderline} href="https://warp.iwdf.org/factor?factor=15" target="_blank" rel="noopener noreferrer">Warp 15</a></span>{' '}
         (Double-Fifteen) campaign, the core challenge remains absolute: optimize your hand, secure your
         private line, and force your opponents to break their trajectory.
        </p>
        <p>The Federation officially endorses Warp factors from <a className={styles.aNoUnderline} href="https://warp.iwdf.org/factor?factor=9" target="_blank" rel="noopener noreferrer">9</a> to <a className={styles.aNoUnderline} href="https://warp.iwdf.org/factor?factor=18" target="_blank" rel="noopener noreferrer">18</a> (Double-Nine to Double-Eighteen), but{' '}
          <Link to="/warp-factor">only Warp 12 is rated for official matches</Link>.
        </p>
      </section>

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
          Authenticate your table. Log round totals, track tile efficiency, and verify your human-pool TEI on the global record.
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
          Private charters for your table. Scope group TEI separately from the global standard using your own custom directives.
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
          No more scrap paper. Enter end-of-round pip totals to instantly calculate penalties, track distributions, and output a Federation scorecard.
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
        <h2 className={styles.roadmapTitle}>Coming soon from the bridge</h2>
        <ul className={styles.roadmapList}>
          <li>Publish round logs directly from the in-game log viewer</li>
          <li>Sync achievements with Apple Game Center and Google Play Games</li>
          <li>Submit scores to Xbox Live via the Windows desktop build</li>
        </ul>
        <a href={BRIDGE_URL} className={styles.playLink}>
          Play Warp 12 on the bridge
        </a>
      </section>

      <section className={panelStyles.panel}>
      <h2 className={styles.roadmapTitle}>Open a Channel</h2>
      <p>The Federation is actively expanding its roster of verified Captains.
        Whether you play strictly against the ship's computer or you host officiated,
        high-stakes matches at your dining room table, your stats belong in the Archive.</p>
      <Link to="/profile" className={styles.playLink}>
        Establish Your Captain Profile
      </Link>
      </section>
    </div>
  );
}
