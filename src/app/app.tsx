import { Link, matchPath, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { FirebaseAuthProvider } from '../firebase/auth-context.js';
import { AuthNotice } from './components/auth-notice.js';
import { HttpErrorNotice } from './components/http-error-notice.js';
import {
  ProductNavMenu,
  type ProductNavItem,
} from './components/product-nav-menu.js';
import { HomePage } from './pages/home-page';
import { LeaderboardPage } from './pages/leaderboard-page';
import { LatticeLeaderboardPage } from './pages/lattice-leaderboard-page';
import { StandingsHubPage } from './pages/standings-hub-page';
import { MatchLogDetailPage } from './pages/match-log-detail-page';
import { MatchLogsPage } from './pages/match-logs-page';
import { MatchesPage } from './pages/matches-page';
import { MatchDetailPage } from './pages/match-detail-page';
import { OfficiatePage } from './pages/officiate-page';
import { OfficiateDetailPage } from './pages/officiate-detail-page';
import { AdminPage } from './pages/admin-page';
import { ProfilePage } from './pages/profile-page';
import { TeiCalculatorPage } from './pages/tei-calculator-page';
import { CrewsPage } from './pages/crews-page';
import { CrewDetailPage } from './pages/crew-detail-page';
import { CrewJoinPage } from './pages/crew-join-page';
import { VerifyPage } from './pages/verify-page';
import styles from './app.module.scss';
import { IWGFLogo } from './IWGFLogo.js';
import { Warp12Logo } from './Warp12Logo.js';
import { Warp12 } from './pages/warp12';

const BRIDGE_URL = 'https://warp.iwgf.org';
const LATTICE_URL = 'https://lattice.iwgf.org';

const WARP_NAV: ProductNavItem[] = [
  { kind: 'route', to: '/leaderboard/warp', label: 'Warp TEI' },
  { kind: 'route', to: '/matches', label: 'Matches' },
  { kind: 'route', to: '/officiate', label: 'Officiate' },
  { kind: 'route', to: '/crews', label: 'Crews' },
  { kind: 'route', to: '/verify', label: 'Verify' },
  { kind: 'route', to: '/calculator', label: 'TEI Calc' },
  { kind: 'route', to: '/logs', label: 'Logs' },
  { kind: 'external', href: BRIDGE_URL, label: 'Open the Bridge' },
];

const LATTICE_NAV: ProductNavItem[] = [
  { kind: 'route', to: '/leaderboard/lattice', label: 'Lattice TEI' },
  {
    kind: 'external',
    href: `${LATTICE_URL}/docs/subspace-lattice-manual.pdf`,
    label: 'Manual',
  },
  {
    kind: 'external',
    href: `${LATTICE_URL}/docs/rules.pdf`,
    label: 'Rules',
  },
  { kind: 'external', href: LATTICE_URL, label: 'Take Command' },
];

const WARP_ACTIVE_PREFIXES = [
  '/leaderboard/warp',
  '/matches',
  '/officiate',
  '/crews',
  '/verify',
  '/calculator',
  '/logs',
  '/warp-factor',
];

const LATTICE_ACTIVE_PREFIXES = ['/leaderboard/lattice'];

const SLUG_MAP: { pattern: string; slug: string }[] = [
  { pattern: '/leaderboard/warp', slug: 'Warp 12 TEI' },
  { pattern: '/leaderboard/lattice', slug: 'Lattice TEI' },
  { pattern: '/leaderboard', slug: 'Federation Standings' },
  { pattern: '/admin', slug: "Admin" },
  { pattern: '/crews', slug: "Crews and Charters" },
  { pattern: '/crews/:slug/join', slug: "Crews and Charters" },
  { pattern: '/crews/:slug', slug: "Crews and Charters" },
  { pattern: '/matches', slug: "Tournament Reporting" },
  { pattern: '/matches/:matchCode?', slug: "Tournament Reporting" },
  { pattern: '/officiate', slug: "Tournament Reporting" },
  { pattern: '/officiate/:matchCode?', slug: "Tournament Reporting" },
  { pattern: '/verify', slug: "Certificate Verification" },
  { pattern: '/warp-factor', slug: "Official Position" },
  { pattern: '/', slug: "Fleet Performance Archive" }, // everything else uses the default slug
];

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.navLink} active` : styles.navLink;
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function resolveHeaderProduct(
  pathname: string,
): 'warp' | 'lattice' | null {
  if (LATTICE_ACTIVE_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix))) {
    return 'lattice';
  }
  if (WARP_ACTIVE_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix))) {
    return 'warp';
  }
  return null;
}

function AppShell() {
  const location = useLocation();
  // profile.iwgf.org shares this hosting site — land on Federation Profile.
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'profile.iwgf.org' &&
    (location.pathname === '/' || location.pathname === '')
  ) {
    return <Navigate to="/profile" replace />;
  }
  const matchedRoute = SLUG_MAP.find((route) => 
    matchPath({ path: route.pattern, end: false }, location.pathname)
  );

  // Use the matched slug, or fallback to the standard one
  const currentSlug = matchedRoute ? matchedRoute.slug : SLUG_MAP[SLUG_MAP.length - 1].slug;
  const headerProduct = resolveHeaderProduct(location.pathname);

  return (
    <div
      className={styles.shell}
      style={{
        ['--warp-void' as string]: '#050816',
        ['--warp-text' as string]: '#e2e8f0',
        ['--warp-text-muted' as string]: '#94a3b8',
        ['--warp-accent' as string]: '#38bdf8',
        ['--warp-panel-border' as string]: '#334155',
      }}
    >
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <Link to="/" className={styles.logo}>
            <div>
              <IWGFLogo width={280} />
              <p className={styles.subtitle}>{currentSlug}</p>
            </div>
          </Link>
          {headerProduct === 'warp' ? (
            <div className={styles.productMark} aria-label="Warp Dominoes">
              <span className={styles.productMarkRule} aria-hidden="true" />
              <Warp12Logo width={160} marginLeft="0" />
            </div>
          ) : null}
          {headerProduct === 'lattice' ? (
            <div className={styles.productMark} aria-label="Subspace Lattice">
              <span className={styles.productMarkRule} aria-hidden="true" />
              <img
                className={styles.latticeMark}
                src="/SubspaceLattice-text-title-pretty.svg"
                alt="Subspace Lattice"
                width={180}
                height={36}
              />
            </div>
          ) : null}
        </div>
        <nav className={styles.nav} aria-label="Primary">
          <NavLink to="/leaderboard" end className={navClass}>
            Standings
          </NavLink>
          <ProductNavMenu
            label="Warp"
            items={WARP_NAV}
            activePrefixes={WARP_ACTIVE_PREFIXES}
          />
          <ProductNavMenu
            label="Lattice"
            items={LATTICE_NAV}
            activePrefixes={LATTICE_ACTIVE_PREFIXES}
          />
          <NavLink to="/profile" className={navClass}>
            Federation Profile
          </NavLink>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <AuthNotice />
          <HttpErrorNotice />
          <Routes>
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/matches/:matchCode" element={<MatchDetailPage />} />
            <Route path="/officiate" element={<OfficiatePage />} />
            <Route path="/officiate/:matchCode" element={<OfficiateDetailPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/crews" element={<CrewsPage />} />
            <Route path="/crews/:slug/join" element={<CrewJoinPage />} />
            <Route path="/crews/:slug" element={<CrewDetailPage />} />
            <Route path="/leaderboard" element={<StandingsHubPage />} />
            <Route path="/leaderboard/warp" element={<LeaderboardPage />} />
            <Route path="/leaderboard/lattice" element={<LatticeLeaderboardPage />} />
            <Route path="/calculator" element={<TeiCalculatorPage />} />
            <Route path="/logs" element={<MatchLogsPage />} />
            <Route path="/logs/:shareSlug" element={<MatchLogDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:uid" element={<ProfilePage />} />
            <Route path="/warp-factor" element={<Warp12 />} />
          </Routes>
        </div>
      </main>

      <footer className={styles.footer}>
        {location.pathname.startsWith('/leaderboard/warp') ? (
          <a href={BRIDGE_URL} className={styles.footerLink}>
            Open the Bridge
          </a>
        ) : location.pathname.startsWith('/leaderboard/lattice') ? (
          <a href={LATTICE_URL} className={styles.footerLink}>
            Take Command
          </a>
        ) : (
          <span className={styles.footerLinks}>
            <a href={BRIDGE_URL} className={styles.footerLink}>
              Open the Bridge
            </a>
            <span aria-hidden="true"> · </span>
            <a href={LATTICE_URL} className={styles.footerLink}>
              Take Command
            </a>
          </span>
        )}
      </footer>
    </div>
  );
}

export function App() {
  return (
    <FirebaseAuthProvider>
      <AppShell />
    </FirebaseAuthProvider>
  );
}

export default App;
