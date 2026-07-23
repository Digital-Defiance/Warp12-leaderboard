import { Link } from 'react-router-dom';

import { Warp12Logo } from '../Warp12Logo.js';
import panelStyles from '../components/panel.module.scss';
import homeStyles from './home-page.module.scss';
import styles from './standings-hub-page.module.scss';

const LATTICE_URL = 'https://lattice.iwgf.org';
const BRIDGE_URL = 'https://warp.iwgf.org';

/**
 * Federation standings splash — pick Warp Dominoes or Subspace Lattice TEI.
 */
export function StandingsHubPage() {
  return (
    <div className={styles.page} data-testid="standings-hub">
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Interstellar Warp Gaming Federation</p>
        <h1 className={panelStyles.panelTitle}>Federation Standings</h1>
        <p className={panelStyles.panelBody}>
          One federation, separate TEI pools. Choose a discipline to view rated
          captains — call signs come from your{' '}
          <Link to="/profile">Federation Profile</Link>.
        </p>
      </section>

      <div className={styles.productCards}>
        <Link
          to="/leaderboard/warp"
          className={styles.productCard}
          data-testid="standings-warp"
        >
          <div className={styles.productLogo}>
            <Warp12Logo width={220} marginLeft="0" />
          </div>
          <span className={homeStyles.cardEyebrow}>Warp Dominoes</span>
          <span className={homeStyles.cardTitle}>Warp 12 TEI</span>
          <span className={homeStyles.cardBody}>
            Global Official, human-pool, verified fleet, and practice vs AI —
            the classic Warp ladders.
          </span>
        </Link>

        <Link
          to="/leaderboard/lattice"
          className={styles.productCard}
          data-testid="standings-lattice"
        >
          <div className={styles.productLogo}>
            <img
              src="/SubspaceLattice-text-title-pretty.svg"
              alt="Subspace Lattice"
              width={240}
              height={48}
            />
          </div>
          <span className={homeStyles.cardEyebrow}>Subspace Lattice</span>
          <span className={homeStyles.cardTitle}>Lattice TEI</span>
          <span className={homeStyles.cardBody}>
            Local AI and rated online sectors in Lattice’s own TEI pool —
            same TEI alphabet, separate standings.
          </span>
        </Link>
      </div>

      <p className={styles.playLinks}>
        <a href={BRIDGE_URL} target="_blank" rel="noopener noreferrer">
          Open the Bridge
        </a>
        <span aria-hidden="true"> · </span>
        <a href={LATTICE_URL} target="_blank" rel="noopener noreferrer">
          Take Command
        </a>
      </p>
    </div>
  );
}
