import { Link, matchPath, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { FirebaseAuthProvider } from '../firebase/auth-context.js';
import { AuthNotice } from './components/auth-notice.js';
import { HttpErrorNotice } from './components/http-error-notice.js';
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
import { TeiCalculatorPage } from './pages/tei-calculator-page';
import { CrewsPage } from './pages/crews-page';
import { CrewDetailPage } from './pages/crew-detail-page';
import { CrewJoinPage } from './pages/crew-join-page';
import { VerifyPage } from './pages/verify-page';
import styles from './app.module.scss';
import { IWDFLogo } from './IWDFLogo';
import { Warp12 } from './pages/warp12';

const BRIDGE_URL = 'https://warp.iwdf.org';

const SLUG_MAP: { pattern: string; slug: string }[] = [
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

function AppShell() {
  const location = useLocation();
  const matchedRoute = SLUG_MAP.find((route) => 
    matchPath({ path: route.pattern, end: false }, location.pathname)
  );

  // Use the matched slug, or fallback to the standard one
  const currentSlug = matchedRoute ? matchedRoute.slug : SLUG_MAP[SLUG_MAP.length - 1].slug;

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
            <IWDFLogo width={280} />
            <p className={styles.subtitle}>{currentSlug}</p>
          </div>
        </Link>
        <nav className={styles.nav} aria-label="Primary">
          <NavLink to="/matches" className={navClass}>
            Matches
          </NavLink>
          <NavLink to="/officiate" className={navClass}>
            Officiate
          </NavLink>
          <NavLink to="/crews" className={navClass}>
            Crews
          </NavLink>
          <NavLink to="/verify" className={navClass}>
            Verify
          </NavLink>
          <NavLink to="/leaderboard" className={navClass}>
            Leaderboard
          </NavLink>
          <NavLink to="/calculator" className={navClass}>
            TEI Calc
          </NavLink>
          <NavLink to="/logs" className={navClass}>
            Logs
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Profile
          </NavLink>
          <a href={BRIDGE_URL} target='_blank' rel='noopener noreferrer' className={styles.navLink}>
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
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/crews" element={<CrewsPage />} />
            <Route path="/crews/:slug/join" element={<CrewJoinPage />} />
            <Route path="/crews/:slug" element={<CrewDetailPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
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
