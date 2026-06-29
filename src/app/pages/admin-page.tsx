import { useState } from 'react';

import { SignInPanel } from '../components/sign-in-panel.js';
import { isVerifiedUser } from '../../firebase/auth-actions.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import { useWarpRoles } from '../../firebase/use-warp-roles.js';
import { bootstrapAdmin, setUserRoles } from '../../firebase/rated-match-service.js';
import type { WarpRole } from '../../firebase/rated-match-schema.js';
import panelStyles from '../components/panel.module.scss';
import formStyles from '../components/sign-in-panel.module.scss';
import styles from './matches-page.module.scss';

function sessionLabel(user: ReturnType<typeof useFirebaseAuth>['user']): string {
  if (!user) {
    return 'Not signed in';
  }
  if (user.isAnonymous) {
    return 'Guest session (anonymous)';
  }
  return user.email ?? user.displayName ?? user.uid;
}

export function AdminPage() {
  const auth = useFirebaseAuth();
  const roles = useWarpRoles();
  const verified = isVerifiedUser(auth.user);
  const [targetUid, setTargetUid] = useState('');
  const [grantOfficial, setGrantOfficial] = useState(true);
  const [grantAdmin, setGrantAdmin] = useState(false);
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSetRoles = async () => {
    const nextRoles: WarpRole[] = [];
    if (grantOfficial) {
      nextRoles.push('match_official');
    }
    if (grantAdmin) {
      nextRoles.push('admin');
    }
    if (!targetUid.trim() || nextRoles.length === 0) {
      setError('Enter a uid and select at least one role.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setUserRoles({ uid: targetUid.trim(), roles: nextRoles });
      setMessage(`Updated roles for ${targetUid.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set roles.');
    } finally {
      setBusy(false);
    }
  };

  const handleBootstrap = async () => {
    if (!auth.user || !isVerifiedUser(auth.user)) {
      setError('Sign in with Google above before claiming admin.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await auth.user.getIdToken(true);
      await bootstrapAdmin(bootstrapSecret);
      await roles.refresh();
      setMessage('Bootstrap complete — you are now admin. Refresh token applied.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bootstrap failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Administration</p>
        <h1 className={panelStyles.panelTitle}>Roles & bootstrap</h1>
        <p className={panelStyles.panelBody}>
          Grant match official or admin roles via Firebase custom claims. The first
          admin is bootstrapped with a one-time secret configured on Cloud Functions.
        </p>
      </section>

      {(auth.error ?? error) && (
        <section className={panelStyles.panel} role="alert">
          <p className={panelStyles.errorState}>{auth.error ?? error}</p>
          <button
            type="button"
            className={formStyles.buttonSecondary}
            onClick={() => {
              auth.clearError();
              setError(null);
            }}
          >
            Dismiss
          </button>
        </section>
      )}

      <SignInPanel requireVerified title="Admin sign-in" />

      {auth.ready && (
        <section className={panelStyles.panel}>
          <p className={panelStyles.panelEyebrow}>Session</p>
          <p className={panelStyles.panelBody}>
            <strong>{sessionLabel(auth.user)}</strong>
            {auth.user && (
              <>
                {' '}
                · uid <code>{auth.user.uid}</code>
              </>
            )}
          </p>
          <p className={panelStyles.panelBody}>
            Roles:{' '}
            {roles.loading
              ? 'loading…'
              : roles.roles.length > 0
                ? roles.roles.join(', ')
                : 'none'}
          </p>
          {auth.user?.isAnonymous && (
            <p className={panelStyles.panelBody}>
              Bootstrap needs a Google account, not a guest session. Use{' '}
              <strong>Continue with Google</strong> above.
            </p>
          )}
          {verified && roles.isAdmin && (
            <p className={panelStyles.panelBody}>
              You already have admin access — use the grant-roles panel below.
            </p>
          )}
        </section>
      )}

      {!roles.isAdmin && verified && (
        <section className={panelStyles.panel}>
          <h2 className={panelStyles.panelTitle}>Bootstrap first admin</h2>
          <p className={panelStyles.panelBody}>
            Paste the bootstrap secret from <code>functions/.env</code> (deployed with
            Cloud Functions). Wrong secret returns “Invalid bootstrap secret.”
          </p>
          <div className={formStyles.form}>
            <div className={formStyles.field}>
              <label htmlFor="bootstrap-secret">Bootstrap secret</label>
              <input
                id="bootstrap-secret"
                type="password"
                value={bootstrapSecret}
                onChange={(event) => setBootstrapSecret(event.target.value)}
              />
            </div>
            <button
              type="button"
              className={formStyles.buttonPrimary}
              disabled={busy || !bootstrapSecret}
              onClick={() => void handleBootstrap()}
            >
              Claim admin
            </button>
          </div>
        </section>
      )}

      {roles.isAdmin && (
        <section className={panelStyles.panel}>
          <h2 className={panelStyles.panelTitle}>Grant roles</h2>
          <p className={panelStyles.panelBody}>
            Paste a Firebase uid (Authentication → Users in the console). To
            officiate yourself, grant <code>match_official</code> on your own uid.
          </p>
          <div className={formStyles.form}>
            <div className={formStyles.field}>
              <label htmlFor="target-uid">Firebase uid</label>
              <input
                id="target-uid"
                value={targetUid}
                onChange={(event) => setTargetUid(event.target.value)}
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={grantOfficial}
                onChange={(event) => setGrantOfficial(event.target.checked)}
              />{' '}
              match_official
            </label>
            <label>
              <input
                type="checkbox"
                checked={grantAdmin}
                onChange={(event) => setGrantAdmin(event.target.checked)}
              />{' '}
              admin
            </label>
            <button
              type="button"
              className={formStyles.buttonPrimary}
              disabled={busy}
              onClick={() => void handleSetRoles()}
            >
              Save roles
            </button>
          </div>
        </section>
      )}

      {message && <p className={styles.success}>{message}</p>}
      {error && <p className={panelStyles.errorState}>{error}</p>}
    </div>
  );
}
