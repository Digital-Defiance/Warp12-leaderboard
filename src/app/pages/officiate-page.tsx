import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SignInPanel } from '../components/sign-in-panel.js';
import { useWarpRoles } from '../../firebase/use-warp-roles.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import { createRatedMatch } from '../../firebase/rated-match-service.js';
import type { RatedObjective } from '../../firebase/rated-match-schema.js';
import panelStyles from '../components/panel.module.scss';
import formStyles from '../components/sign-in-panel.module.scss';
import styles from './matches-page.module.scss';

export function OfficiatePage() {
  const auth = useFirebaseAuth();
  const roles = useWarpRoles();
  const navigate = useNavigate();
  const [objective, setObjective] = useState<RatedObjective>('points');
  const [campaignRounds, setCampaignRounds] = useState(4);
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!auth.user) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createRatedMatch({
        objective,
        campaignRounds,
        venue,
        notes,
        officialDisplayName: auth.user.displayName ?? 'Match Official',
      });
      navigate(`/officiate/${encodeURIComponent(result.matchCode)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create match.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Officiation</p>
        <h1 className={panelStyles.panelTitle}>Run a rated offline match</h1>
        <p className={panelStyles.panelBody}>
          Create a match code for captains to check in, enter final standings after
          play, then approve to apply human-pool TEI.
        </p>
      </section>

      <SignInPanel
        requireVerified
        title="Official sign-in"
        hint="Match officials need a Google account and the match_official role."
      />

      {!roles.isOfficial && !roles.loading && (
        <p className={panelStyles.errorState}>
          Your account does not have the match official role yet. Ask an admin to
          grant access from the Admin panel.
        </p>
      )}

      {roles.isOfficial && (
        <section className={panelStyles.panel}>
          <div className={formStyles.form}>
            <div className={formStyles.field}>
              <label htmlFor="objective">Objective</label>
              <select
                id="objective"
                value={objective}
                onChange={(event) =>
                  setObjective(event.target.value as RatedObjective)
                }
              >
                <option value="points">Points</option>
                <option value="go-out">Go-out</option>
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="rounds">Campaign rounds</label>
              <input
                id="rounds"
                type="number"
                min={1}
                max={13}
                value={campaignRounds}
                onChange={(event) => setCampaignRounds(Number(event.target.value))}
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="venue">Venue (optional)</label>
              <input
                id="venue"
                value={venue}
                onChange={(event) => setVenue(event.target.value)}
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <button
              type="button"
              className={formStyles.buttonPrimary}
              disabled={busy}
              onClick={() => void handleCreate()}
            >
              {busy ? 'Creating…' : 'Create match code'}
            </button>
            {error && <p className={panelStyles.errorState}>{error}</p>}
          </div>
        </section>
      )}

      <p>
        <Link to="/matches">Captain check-in →</Link>
        {' · '}
        <Link to="/admin">Admin</Link>
      </p>
    </div>
  );
}
