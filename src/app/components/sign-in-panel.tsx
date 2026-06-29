import { useState } from 'react';

import {
  formatAuthError,
  isVerifiedUser,
  signOutUser,
  startGoogleSignIn,
  continueAsGuest,
} from '../../firebase/auth-actions.js';
import {
  persistAuthError,
  readPersistedAuthError,
} from '../../firebase/auth-error-store.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import panelStyles from './panel.module.scss';
import styles from './sign-in-panel.module.scss';

export function SignInPanel({
  requireVerified = false,
  title = 'Sign in',
  hint = 'Use Google for rated matches and officiation. Guest access is for browsing only.',
}: {
  requireVerified?: boolean;
  title?: string;
  hint?: string;
}) {
  const auth = useFirebaseAuth();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!auth.configured) {
    return (
      <div className={panelStyles.errorState}>
        Firebase is not configured in this build.
      </div>
    );
  }

  if (auth.user && (!requireVerified || isVerifiedUser(auth.user))) {
    return (
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Authentication</p>
        <div className={styles.signedIn}>
          <p>
            Signed in as{' '}
            <strong>{auth.user.displayName ?? auth.user.email ?? auth.user.uid}</strong>
          </p>
          <button type="button" className={styles.buttonSecondary} onClick={() => void signOutUser()}>
            Sign out
          </button>
        </div>
      </section>
    );
  }

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      const result = await startGoogleSignIn();
      if (result === 'redirecting') {
        return;
      }
      setBusy(false);
    } catch (err) {
      const message = formatAuthError(err);
      persistAuthError(message, err);
      setLocalError(message);
      setBusy(false);
    }
  };

  const errorMessage =
    localError ?? auth.error ?? readPersistedAuthError();

  const dismissError = () => {
    setLocalError(null);
    auth.clearError();
  };

  return (
    <section className={panelStyles.panel}>
      <p className={panelStyles.panelEyebrow}>Authentication</p>
      <h2 className={panelStyles.panelTitle}>{title}</h2>
      <p className={panelStyles.panelBody}>{hint}</p>
      {auth.user?.isAnonymous && requireVerified && (
        <p className={panelStyles.panelBody}>
          You have a guest session from browsing. Continue with Google to link or replace
          it with a permanent account.
        </p>
      )}
      {errorMessage && (
        <div className={styles.errorBox} role="alert">
          <p className={panelStyles.errorState}>{errorMessage}</p>
          <button type="button" className={styles.buttonSecondary} onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.buttonPrimary}
          disabled={!auth.ready || busy}
          onClick={() => void handleGoogleSignIn()}
        >
          {busy ? 'Opening Google sign-in…' : 'Continue with Google'}
        </button>
        {!requireVerified && (
          <button
            type="button"
            className={styles.buttonSecondary}
            disabled={!auth.ready || busy}
            onClick={() =>
              void continueAsGuest().catch((err) => {
                const message = formatAuthError(err);
                persistAuthError(message, err);
                setLocalError(message);
              })
            }
          >
            Continue as guest
          </button>
        )}
      </div>
    </section>
  );
}
