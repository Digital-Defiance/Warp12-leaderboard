import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { SignInPanel } from '../components/sign-in-panel.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import { joinCharter } from '../../firebase/charter-service.js';
import panelStyles from '../components/panel.module.scss';
import pageStyles from './matches-page.module.scss';

export function CrewJoinPage() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const auth = useFirebaseAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!auth.user || auth.user.isAnonymous || !token || joined) {
      return;
    }
    setBusy(true);
    void joinCharter({ slug, inviteToken: token })
      .then(() => setJoined(true))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Invalid or expired invite.');
      })
      .finally(() => setBusy(false));
  }, [auth.user, slug, token, joined]);

  return (
    <div className={pageStyles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Crew invite</p>
        <h1 className={panelStyles.panelTitle}>Join crew</h1>
        <p className={panelStyles.panelBody}>
          You were invited to <strong>{slug}</strong>. Sign in with Google to
          accept membership.
        </p>
      </section>

      <SignInPanel
        requireVerified
        title="Captain sign-in"
        hint="Invite links require a verified Google account."
      />

      {!token && (
        <p className={panelStyles.errorState}>
          Missing invite token. Ask the crew owner for a fresh link.
        </p>
      )}

      {busy && <p className={panelStyles.panelBody}>Joining crew…</p>}
      {joined && (
        <p className={pageStyles.success}>
          Welcome aboard.{' '}
          <Link to={`/crews/${slug}`}>View crew ladder →</Link>
        </p>
      )}
      {error && <p className={panelStyles.errorState}>{error}</p>}
    </div>
  );
}
