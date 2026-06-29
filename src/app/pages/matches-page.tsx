import { useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';

import { SignInPanel } from '../components/sign-in-panel.js';
import { isVerifiedUser } from '../../firebase/auth-actions.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import { checkInToMatch } from '../../firebase/rated-match-service.js';
import { normalizeMatchCode } from '../../firebase/rated-match-schema.js';
import panelStyles from '../components/panel.module.scss';
import formStyles from '../components/sign-in-panel.module.scss';
import styles from './matches-page.module.scss';

export function MatchesPage() {
  const auth = useFirebaseAuth();
  const [search] = useSearchParams();
  const [matchCode, setMatchCode] = useState(search.get('code') ?? '');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckIn = async () => {
    if (!auth.user || !isVerifiedUser(auth.user)) {
      setError('Sign in with Google before checking in.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const code = normalizeMatchCode(matchCode);
      const result = await checkInToMatch({
        matchCode: code,
        displayName: displayName.trim() || auth.user.displayName || 'Captain',
      });
      setMessage(`Checked in to ${result.matchCode}.`);
      setMatchCode(result.matchCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Rated matches</p>
        <h1 className={panelStyles.panelTitle}>Check in to an offline event</h1>
        <p className={panelStyles.panelBody}>
          Your match official will share a code such as <span className={formStyles.code}>MT-7K3Q</span>.
          After the game, they enter standings and approve the match — TEI updates only then.
        </p>
      </section>

      <SignInPanel
        requireVerified
        title="Captain sign-in"
        hint="Rated human-pool TEI requires a persistent Google account."
      />

      <section className={panelStyles.panel}>
        <div className={formStyles.form}>
          <div className={formStyles.field}>
            <label htmlFor="match-code">Match code</label>
            <input
              id="match-code"
              value={matchCode}
              onChange={(event) => setMatchCode(event.target.value)}
              placeholder="MT-7K3Q"
              autoComplete="off"
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="display-name">Call sign for this event</label>
            <input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={auth.user?.displayName ?? 'Captain'}
            />
          </div>
          <button
            type="button"
            className={formStyles.buttonPrimary}
            disabled={busy || !matchCode.trim()}
            onClick={() => void handleCheckIn()}
          >
            {busy ? 'Checking in…' : 'Check in'}
          </button>
          {message && <p className={styles.success}>{message}</p>}
          {error && <p className={panelStyles.errorState}>{error}</p>}
          {matchCode.trim() && (
            <p>
              <Link to={`/matches/${encodeURIComponent(normalizeMatchCode(matchCode))}`}>
                View match details →
              </Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
