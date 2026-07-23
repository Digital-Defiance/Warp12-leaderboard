import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';

import { fetchActiveSectorCount } from '../../firebase/active-sectors.js';
import panelStyles from '../components/panel.module.scss';
import styles from './home-page.module.scss';

const BRIDGE_URL = 'https://warp.iwgf.org';
const LATTICE_URL = 'https://lattice.iwgf.org';

function formatSectorLine(
  count: number | null,
  error: boolean,
  scanning: string,
  unavailable: string,
  zero: string,
  one: string,
  many: (n: number) => string,
): string {
  if (count == null && !error) return scanning;
  if (error) return unavailable;
  if (count === 0) return zero;
  if (count === 1) return one;
  return many(count ?? 0);
}

export const HomePage: FC = () => {
  const [warpSectors, setWarpSectors] = useState<number | null>(null);
  const [latticeSectors, setLatticeSectors] = useState<number | null>(null);
  const [activeError, setActiveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchActiveSectorCount()
        .then((res) => {
          if (!cancelled) {
            setWarpSectors(res.active);
            setLatticeSectors(
              typeof res.latticeActive === 'number' ? res.latticeActive : 0,
            );
            setActiveError(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setActiveError(true);
          }
        });
    };
    load();
    const timer = window.setInterval(load, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <h1 className={styles.hColor}>Welcome to the Federation.</h1>
        <p>
          Classical dominoes was once a positional craft. Over generations,
          social multi-trail variants loosened the standard — more company, less
          command. The{' '}
          <span className={styles.iwgfFederation}>
            Interstellar Warp Gaming Federation
          </span>{' '}
          (
          <span className={`${styles.hColor} ${styles.iwgfFederationWide}`}>
            IWGF
          </span>
          ) was founded to reverse that drift: restore rigor, keep the joy, and
          give captains a shared charter — one call sign, rated sectors, and an
          archive worthy of the Bridge.
        </p>
        <p>
          <Link className={styles.inlineLink} to="/leaderboard/warp">
            Warp Dominoes
          </Link>{' '}
          is that restoration — and a revitalization. New command modules were
          forged into the ruleset, then pressure-tested across hundreds of
          thousands of simulated campaigns until the void felt fair. Later,{' '}
          <Link className={styles.inlineLink} to="/leaderboard/lattice">
            Subspace Lattice
          </Link>{' '}
          arrived as something wholly new — hubs, sensor nets, sector
          integration — and the Federation already knew how to host it. Different
          boards. Same decorum.
        </p>
        <div className={styles.activePulseGroup} role="status" aria-live="polite">
          <p className={styles.activePulse}>
            {formatSectorLine(
              warpSectors,
              activeError,
              'Scanning Warp sectors…',
              'Warp sector count temporarily unavailable.',
              'No Warp sectors underway — open one on the Bridge.',
              '1 Warp sector underway on the Bridge.',
              (n) => `${n} Warp sectors underway on the Bridge.`,
            )}
          </p>
          <p className={styles.activePulse}>
            {formatSectorLine(
              latticeSectors,
              activeError,
              'Scanning Lattice sectors…',
              'Lattice sector count temporarily unavailable.',
              'No Lattice sectors underway — take command of one.',
              '1 Lattice sector underway in Subspace.',
              (n) => `${n} Lattice sectors underway in Subspace.`,
            )}
          </p>
        </div>
        <p>
          Rated results earn{' '}
          <strong className={styles.hColor}>Tactical Engine Intelligence</strong>{' '}
          — the same TEI alphabet, different proving grounds. Set your call sign
          once; climb Warp and Lattice on their own ladders.
        </p>
      </section>

      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Fleet Command Archive</p>
        <h1 className={panelStyles.panelTitle}>Share stats. Publish match logs.</h1>
        <p className={panelStyles.panelBody}>
          The Federation archive tracks captain performance across Warp Dominoes
          and Subspace Lattice. Standings, officiated nights, crew charters, and
          published logs live here under one IWGF roof.
        </p>
      </section>

      <div className={styles.cards}>
        <Link to="/leaderboard" className={styles.card}>
          <span className={styles.cardEyebrow}>Standings</span>
          <span className={styles.cardTitle}>Federation Standings</span>
          <span className={styles.cardBody}>
            Choose Warp Dominoes or Subspace Lattice TEI — separate pools, one
            federation.
          </span>
        </Link>

        <Link to="/profile" className={styles.card}>
          <span className={styles.cardEyebrow}>Identity</span>
          <span className={styles.cardTitle}>Federation Profile</span>
          <span className={styles.cardBody}>
            Set your IWGF call sign for Warp, Lattice, and TEI ladders. Link
            Game Center, Play Games, or Xbox Live IDs.
          </span>
        </Link>

        <Link to="/leaderboard/warp" className={styles.card}>
          <span className={styles.cardEyebrow}>Warp Dominoes</span>
          <span className={styles.cardTitle}>Global Official ladder</span>
          <span className={styles.cardBody}>
            Public Warp 12 rankings — Official rules, verified rated play, season
            leaderboard.
          </span>
        </Link>

        <Link to="/leaderboard/lattice" className={styles.card}>
          <span className={styles.cardEyebrow}>Subspace Lattice</span>
          <span className={styles.cardTitle}>Lattice TEI</span>
          <span className={styles.cardBody}>
            Local AI and rated online sectors — Lattice’s OpenSkill pool on the
            shared federation site.
          </span>
        </Link>

        <Link to="/matches" className={styles.card}>
          <span className={styles.cardEyebrow}>Warp · Rated play</span>
          <span className={styles.cardTitle}>Officiated matches</span>
          <span className={styles.cardBody}>
            Authenticate your table. Log round totals, track tile efficiency, and
            verify your human-pool TEI on the global record.
          </span>
        </Link>

        <Link to="/crews" className={styles.card}>
          <span className={styles.cardEyebrow}>Warp · Friends</span>
          <span className={styles.cardTitle}>Crew ladders</span>
          <span className={styles.cardBody}>
            Private charters for your table. Scope group TEI separately from the
            global standard using your own custom directives.
          </span>
        </Link>

        <Link to="/calculator" className={styles.card}>
          <span className={styles.cardEyebrow}>Warp · Offline tool</span>
          <span className={styles.cardTitle}>TEI scorecard calculator</span>
          <span className={styles.cardBody}>
            No more scrap paper. Enter end-of-round pip totals to instantly
            calculate penalties, track distributions, and output a Federation
            scorecard.
          </span>
        </Link>

        <Link to="/logs" className={styles.card}>
          <span className={styles.cardEyebrow}>Warp · Archive</span>
          <span className={styles.cardTitle}>Published Logs</span>
          <span className={styles.cardBody}>
            Shared round transcripts with sector codes and timestamps.
          </span>
        </Link>
      </div>

      <section className={styles.roadmap}>
        <h2 className={styles.roadmapTitle}>Open a channel</h2>
        <p className={styles.roadmapLead}>
          Whether you train against the ship’s computer or host high-stakes
          tables, your record belongs in the archive.
        </p>
        <div className={styles.playRow}>
          <a href={BRIDGE_URL} className={styles.playLink}>
            Open the Bridge
          </a>
          <span aria-hidden="true"> · </span>
          <a href={LATTICE_URL} className={styles.playLink}>
            Take Command
          </a>
          <span aria-hidden="true"> · </span>
          <Link to="/profile" className={styles.playLink}>
            Federation Profile
          </Link>
        </div>
        <p className={styles.warpDoctrineLink}>
          New to Warp Dominoes?{' '}
          <Link to="/warp-factor">Read the Warp 12 command standard</Link>
          {' — '}including why parlor “trains” became a federation discipline.
        </p>
      </section>
    </div>
  );
};
