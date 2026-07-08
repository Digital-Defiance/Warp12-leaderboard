import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SignInPanel } from '../components/sign-in-panel.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import {
  createCharter,
  joinCharter,
  listListedCharters,
  listMyCharters,
} from '../../firebase/charter-service.js';
import { charterSummaryLine, formatCrewInviteCode } from '../../firebase/charter-schema.js';
import type { RatedObjective } from '../../firebase/charter-schema.js';
import {
  CharterSetupFields,
  DEFAULT_CHARTER_SETUP,
  type CharterSetupValue,
} from '../components/charter-setup-fields.js';
import panelStyles from '../components/panel.module.scss';
import formStyles from '../components/sign-in-panel.module.scss';
import styles from './matches-page.module.scss';

export function CrewsPage() {
  const auth = useFirebaseAuth();
  const [crews, setCrews] = useState<Awaited<ReturnType<typeof listMyCharters>>>([]);
  const [listed, setListed] = useState<Awaited<ReturnType<typeof listListedCharters>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [objective, setObjective] = useState<RatedObjective>('points');
  const [playerCount, setPlayerCount] = useState(4);
  const [campaignRounds, setCampaignRounds] = useState(13);
  const [charterSetup, setCharterSetup] =
    useState<CharterSetupValue>(DEFAULT_CHARTER_SETUP);
  const [crewCodeInput, setCrewCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{
    inviteUrl: string;
    crewCode: string;
  } | null>(null);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const mine =
          auth.user && !auth.user.isAnonymous
            ? await listMyCharters()
            : [];
        const discoverable =
          auth.user && !auth.user.isAnonymous
            ? await listListedCharters()
            : [];
        if (!cancelled) {
          setListed(discoverable);
          setCrews(mine);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load crews.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth.user]);

  const handleCreate = async () => {
    if (!auth.user) {
      return;
    }
    setBusy(true);
    setError(null);
    setCreatedInvite(null);
    try {
      const result = await createCharter({
        name: name.trim(),
        slug: slug.trim() || undefined,
        objective,
        playerCount,
        campaignRounds: objective === 'points' ? campaignRounds : 1,
        modules: charterSetup.modules,
        houseRules: charterSetup.houseRules,
      });
      setCreatedInvite({ inviteUrl: result.inviteUrl, crewCode: result.crewCode });
      setCrews(await listMyCharters());
      setName('');
      setSlug('');
      setCharterSetup(DEFAULT_CHARTER_SETUP);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create crew.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!auth.user || !crewCodeInput.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    setJoinNotice(null);
    try {
      const code = formatCrewInviteCode(crewCodeInput);
      const result = await joinCharter({ crewCode: code });
      setJoinNotice(`Joined ${result.charter.name}.`);
      setCrews(await listMyCharters());
      setCrewCodeInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid crew code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Crews</p>
        <h1 className={panelStyles.panelTitle}>Friend-group ladders</h1>
        <p className={panelStyles.panelBody}>
          A crew is a charter: frozen lobby setup (rules, modules, fleet size,
          objective). Rated matches and online sectors that match the charter
          update crew TEI — not the global pool unless you use Global Official.
        </p>
      </section>

      <SignInPanel
        requireVerified
        title="Captain sign-in"
        hint="Google sign-in is required to join crews and appear on crew ladders."
      />

      {auth.user && !auth.user.isAnonymous && (
        <section className={panelStyles.panel}>
          <h2 className={panelStyles.panelTitle}>Join with crew code</h2>
          <p className={panelStyles.panelBody}>
            Enter a <code>CREW-</code> code from the crew owner (in-person handoff).
          </p>
          <div className={formStyles.form}>
            <div className={formStyles.field}>
              <label htmlFor="crew-code">Crew code</label>
              <input
                id="crew-code"
                value={crewCodeInput}
                onChange={(e) => setCrewCodeInput(e.target.value)}
                placeholder="CREW-7K3Q"
              />
            </div>
            <button
              type="button"
              className={formStyles.buttonPrimary}
              disabled={busy || crewCodeInput.trim().length < 4}
              onClick={() => void handleJoinByCode()}
            >
              {busy ? 'Joining…' : 'Join crew'}
            </button>
            {joinNotice && <p className={styles.success}>{joinNotice}</p>}
          </div>
        </section>
      )}

      <section className={panelStyles.panel}>
        <h2 className={panelStyles.panelTitle}>Discover crews</h2>
        {(!auth.user || auth.user.isAnonymous) && (
          <p className={panelStyles.panelBody}>
            Sign in to browse listed crews.{' '}
            <Link to="/crews/global-official">Global Official</Link> is always open.
          </p>
        )}
        {auth.user && !auth.user.isAnonymous && loading && (
          <p className={panelStyles.panelBody}>Loading…</p>
        )}
        {auth.user && !auth.user.isAnonymous && listed.length === 0 && !loading && (
          <p className={panelStyles.panelBody}>
            No listed crews yet. Global Official is always open —{' '}
            <Link to="/crews/global-official">view ladder →</Link>
          </p>
        )}
        <ul className={panelStyles.panelBody}>
          {listed.map((crew) => (
            <li key={crew.charterId}>
              <Link to={`/crews/${crew.slug}`}>{crew.name}</Link>
              {' — '}
              {charterSummaryLine(crew)}
              {crew.isGlobalOfficial ? ' · open membership' : ' · listed'}
            </li>
          ))}
        </ul>
      </section>

      {auth.user && !auth.user.isAnonymous && (
        <>
          <section className={panelStyles.panel}>
            <h2 className={panelStyles.panelTitle}>Your crews</h2>
            {loading && <p className={panelStyles.panelBody}>Loading…</p>}
            {error && <p className={panelStyles.errorState}>{error}</p>}
            {!loading && crews.length === 0 && (
              <p className={panelStyles.panelBody}>
                No crews yet. Create one below, join with a <code>CREW-</code> code,
                or accept an invite link.
              </p>
            )}
            <ul className={panelStyles.panelBody}>
              {crews.map((crew) => (
                <li key={crew.charterId}>
                  <Link to={`/crews/${crew.slug}`}>{crew.name}</Link>
                  {' — '}
                  {charterSummaryLine(crew)}
                  {crew.isGlobalOfficial ? ' · open membership' : ''}
                </li>
              ))}
            </ul>
          </section>

          <section className={panelStyles.panel}>
            <h2 className={panelStyles.panelTitle}>Create a crew</h2>
            <div className={formStyles.form}>
              <div className={formStyles.field}>
                <label htmlFor="crew-name">Crew name</label>
                <input
                  id="crew-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Oak Street Crew"
                />
              </div>
              <div className={formStyles.field}>
                <label htmlFor="crew-slug">URL slug (optional)</label>
                <input
                  id="crew-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="oak-street"
                />
              </div>
              <div className={formStyles.field}>
                <label htmlFor="crew-objective">Objective</label>
                <select
                  id="crew-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as RatedObjective)}
                >
                  <option value="points">Points</option>
                  <option value="go-out">Go-out</option>
                </select>
              </div>
              <div className={formStyles.field}>
                <label htmlFor="crew-size">Fleet size</label>
                <select
                  id="crew-size"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} captains
                    </option>
                  ))}
                </select>
              </div>
              {objective === 'points' && (
                <div className={formStyles.field}>
                  <label htmlFor="crew-rounds">Campaign rounds</label>
                  <input
                    id="crew-rounds"
                    type="number"
                    min={1}
                    max={13}
                    value={campaignRounds}
                    onChange={(e) => setCampaignRounds(Number(e.target.value))}
                  />
                </div>
              )}
              <CharterSetupFields
                value={charterSetup}
                onChange={setCharterSetup}
                disabled={busy}
                playerCount={playerCount}
              />
              <button
                type="button"
                className={formStyles.buttonPrimary}
                disabled={busy || name.trim().length < 2}
                onClick={() => void handleCreate()}
              >
                {busy ? 'Creating…' : 'Create crew'}
              </button>
              {createdInvite && (
                <p className={styles.success}>
                  Crew created. Code: <code>{createdInvite.crewCode}</code>
                  {' · '}
                  <a href={createdInvite.inviteUrl}>invite link</a>
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
