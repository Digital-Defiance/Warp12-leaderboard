import { Link, matchPath, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { FirebaseAuthProvider } from '../firebase/auth-context.js';
import { AuthNotice } from './components/auth-notice.js';
import { HttpErrorNotice } from './components/http-error-notice.js';
import { Warp12Logo } from './Warp12Logo';
import { HomePage } from './pages/home-page';
import { LeaderboardPage } from './pages/leaderboard-page';
import { MatchLogDetailPage } from './pages/match-log-detail-page';
import { MatchLogsPage } from './pages/match-logs-page';
import { MatchesPage } from './pages/matches-page';
import { MatchDetailPage } from './pages/match-detail-page';
import { OfficiatePage } from './pages/officiate-page';
import { OfficiateDetailPage } from './pages/officiate-detail-page';
import { AdminPage } from './pages/admin-page';
import { ProfilePage } from './pages/profile-page';
import styles from './app.module.scss';
import type { ReactNode } from 'react';
import { Warp12LogoTournament } from './Warp12Logo-tournament.js';

const BRIDGE_URL = 'https://warp12.app';

const LOGO_MAP: { pattern: string; logo: ReactNode }[] = [
  { pattern: '/admin', logo: <Warp12LogoTournament width={280} /> },
  { pattern: '/matches', logo: <Warp12LogoTournament width={280} /> },
  { pattern: '/matches/:matchCode?', logo: <Warp12LogoTournament width={280} /> },
  { pattern: '/officiate', logo: <Warp12LogoTournament width={280} /> },
  { pattern: '/officiate/:matchCode?', logo: <Warp12LogoTournament width={280} /> },
  { pattern: '/', logo: <Warp12Logo width={280} /> }, // everything else uses the default logo
];

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.navLink} active` : styles.navLink;
}

function AppShell() {
  const location = useLocation();
  const matchedRoute = LOGO_MAP.find((route) => 
    matchPath({ path: route.pattern, end: false }, location.pathname)
  );

  // Use the matched logo, or fallback to the standard one
  const currentLogo = matchedRoute ? matchedRoute.logo : LOGO_MAP[LOGO_MAP.length - 1].logo;

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
        <Link to="/" className={styles.logo}>
          <div>
            {currentLogo}
            <p className={styles.subtitle}>Fleet Performance Archive</p>
          </div>
        </Link>
        <nav className={styles.nav} aria-label="Primary">
          <NavLink to="/matches" className={navClass}>
            Matches
          </NavLink>
          <NavLink to="/officiate" className={navClass}>
            Officiate
          </NavLink>
          <NavLink to="/leaderboard" className={navClass}>
            Leaderboard
          </NavLink>
          <NavLink to="/logs" className={navClass}>
            Logs
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Profile
          </NavLink>
          <a href={BRIDGE_URL} className={styles.navLink}>
            Play
          </a>
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
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/logs" element={<MatchLogsPage />} />
            <Route path="/logs/:shareSlug" element={<MatchLogDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:uid" element={<ProfilePage />} />
          </Routes>
        </div>
      </main>

      <footer className={styles.footer}>
        Same Firebase project as the bridge — stats and logs at leaderboard.warp12.app.{' '}
        <a href={BRIDGE_URL} className={styles.footerLink}>
          Return to the bridge
        </a>
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
