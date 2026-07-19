import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { SignInPanel } from '../components/sign-in-panel.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import {
  getCharterLeaderboard,
  getCharterManageInfo,
  joinCharter,
  leaveCharter,
  listCharterJoinRequests,
  requestJoinCharter,
  resolveJoinRequest,
  rotateCharterInvite,
  updateCharterListing,
} from '../../firebase/charter-service.js';
import { charterSummaryLine } from '../../firebase/charter-schema.js';
import type {
  CharterJoinRequestView,
  CharterLeaderboardEntry,
  CharterManageInfo,
  PublicCharterView,
} from '../../firebase/charter-schema.js';
import panelStyles from '../components/panel.module.scss';
import formStyles from '../components/sign-in-panel.module.scss';
import styles from './leaderboard-page.module.scss';
import pageStyles from './matches-page.module.scss';

export function CrewDetailPage() {
  const { slug = '' } = useParams();
  const auth = useFirebaseAuth();
  const [charter, setCharter] = useState<PublicCharterView | null>(null);
  const [entries, setEntries] = useState<CharterLeaderboardEntry[]>([]);
  const [manage, setManage] = useState<CharterManageInfo | null>(null);
  const [joinRequests, setJoinRequests] = useState<CharterJoinRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const reload = async () => {
    const result = await getCharterLeaderboard({ slug });
    setCharter(result.charter);
    setEntries(result.entries);
    return result.charter;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void reload()
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Crew not found.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!auth.user || auth.user.isAnonymous || !charter) {
      setManage(null);
      setJoinRequests([]);
      return;
    }

    let cancelled = false;
    void getCharterManageInfo(charter.charterId)
      .then(async (info) => {
        if (cancelled) {
          return;
        }
        setManage(info);
        if (info.canManage && info.pendingRequestCount > 0) {
          const pending = await listCharterJoinRequests(charter.charterId);
          if (!cancelled) {
            setJoinRequests(pending.requests);
          }
        } else {
          setJoinRequests([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setManage(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth.user, charter]);

  const handleJoinOpen = async () => {
    if (!charter) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (charter.isGlobalOfficial) {
        await joinCharter({ slug: charter.slug });
      } else {
        await requestJoinCharter(charter.charterId);
      }
      setNotice(
        charter.isGlobalOfficial
          ? 'You joined this crew.'
          : charter.listed
            ? 'Join request sent — the owner will approve.'
            : 'You joined this crew.'
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join crew.');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!charter) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await leaveCharter(charter.charterId);
      setNotice('You left this crew.');
      const refreshed = await reload();
      if (auth.user && !auth.user.isAnonymous) {
        setManage(await getCharterManageInfo(refreshed.charterId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave crew.');
    } finally {
      setBusy(false);
    }
  };

  const handleRotateInvite = async () => {
    if (!charter) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await rotateCharterInvite(charter.charterId);
      setInviteUrl(result.inviteUrl);
      setManage(await getCharterManageInfo(charter.charterId));
      setNotice(`New invite: ${result.crewCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rotate invite.');
    } finally {
      setBusy(false);
    }
  };

  const handleListingToggle = async () => {
    if (!charter || !manage) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = !manage.listed;
      await updateCharterListing(charter.charterId, next);
      setManage({ ...manage, listed: next });
      setCharter({ ...charter, listed: next });
      setNotice(next ? 'Crew is now discoverable.' : 'Crew is invite-only again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update listing.');
    } finally {
      setBusy(false);
    }
  };

  const handleResolveRequest = async (targetUid: string, approve: boolean) => {
    if (!charter) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resolveJoinRequest({ charterId: charter.charterId, targetUid, approve });
      const pending = await listCharterJoinRequests(charter.charterId);
      setJoinRequests(pending.requests);
      setManage(await getCharterManageInfo(charter.charterId));
      await reload();
      setNotice(approve ? 'Captain approved.' : 'Request declined.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve request.');
    } finally {
      setBusy(false);
    }
  };

  const membershipLabel =
    manage?.role === 'owner'
      ? 'You own this crew.'
      : manage?.role === 'member'
        ? 'You are a member.'
        : null;

  return (
    <div className={pageStyles.page} data-testid="crew-detail-page">
      <p>
        <Link to="/crews">← All crews</Link>
      </p>

      <section className={panelStyles.panel}>
        <p className={panelStyles.panelEyebrow}>Crew charter</p>
        {loading && <p className={panelStyles.panelBody}>Loading crew…</p>}
        {error && <p className={panelStyles.errorState}>{error}</p>}
        {charter && (
          <>
            <h1 className={panelStyles.panelTitle}>{charter.name}</h1>
            <p className={panelStyles.panelBody}>{charterSummaryLine(charter)}</p>
            <p className={panelStyles.panelBody}>
              {charter.memberCount} member{charter.memberCount === 1 ? '' : 's'}
              {charter.seasonLabel ? ` · Season ${charter.seasonLabel}` : ''}
              {charter.isGlobalOfficial
                ? ' · open membership — also updates global TEI when rated'
                : charter.listed
                  ? ' · listed — request to join'
                  : ' · invite-only'}
            </p>
          </>
        )}
      </section>

      {charter && (
        <>
          <SignInPanel
            requireVerified
            title="Captain sign-in"
            hint="Sign in to join this crew or appear on its ladder."
          />

          {auth.user && !auth.user.isAnonymous && (
            <section className={panelStyles.panel}>
              {membershipLabel && (
                <p className={panelStyles.panelBody}>{membershipLabel}</p>
              )}

              {manage?.role !== 'member' && manage?.role !== 'owner' && (
                <>
                  {charter.isGlobalOfficial || charter.listed ? (
                    <button
                      type="button"
                      className={formStyles.buttonPrimary}
                      disabled={busy}
                      onClick={() => void handleJoinOpen()}
                    >
                      {busy
                        ? 'Working…'
                        : charter.isGlobalOfficial
                          ? 'Join Global Official'
                          : 'Request to join'}
                    </button>
                  ) : (
                    <p className={panelStyles.panelBody}>
                      Need an invite? Ask the owner for a{' '}
                      <code>CREW-</code> code or join link (
                      <code>/crews/{charter.slug}/join?token=…</code>).
                    </p>
                  )}
                </>
              )}

              {manage?.role === 'member' && !charter.isGlobalOfficial && (
                <button
                  type="button"
                  className={formStyles.buttonPrimary}
                  disabled={busy}
                  onClick={() => void handleLeave()}
                >
                  Leave crew
                </button>
              )}

              {manage?.canManage && (
                <div className={formStyles.form}>
                  <h2 className={panelStyles.panelTitle}>Owner controls</h2>
                  {manage.crewCode && (
                    <p className={panelStyles.panelBody}>
                      Crew code: <code>{manage.crewCode}</code> — share for in-person
                      join on the crews page.
                    </p>
                  )}
                  <button
                    type="button"
                    className={formStyles.buttonSecondary}
                    disabled={busy}
                    onClick={() => void handleRotateInvite()}
                  >
                    Rotate invite link &amp; code
                  </button>
                  <label className={formStyles.field}>
                    <input
                      type="checkbox"
                      checked={manage.listed}
                      disabled={busy}
                      onChange={() => void handleListingToggle()}
                    />{' '}
                    Listed — captains can request to join
                  </label>
                  {inviteUrl && (
                    <p className={pageStyles.success}>
                      New invite link: <a href={inviteUrl}>{inviteUrl}</a>
                    </p>
                  )}
                </div>
              )}

              {manage?.canManage && joinRequests.length > 0 && (
                <div className={formStyles.form}>
                  <h3 className={panelStyles.panelTitle}>Pending join requests</h3>
                  <table className={formStyles.table}>
                    <thead>
                      <tr>
                        <th>Captain</th>
                        <th>Requested</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {joinRequests.map((row) => (
                        <tr key={row.uid}>
                          <td>{row.displayName}</td>
                          <td>{new Date(row.requestedAt).toLocaleString()}</td>
                          <td>
                            <button
                              type="button"
                              className={formStyles.buttonSecondary}
                              disabled={busy}
                              onClick={() => void handleResolveRequest(row.uid, true)}
                            >
                              Approve
                            </button>{' '}
                            <button
                              type="button"
                              className={formStyles.buttonSecondary}
                              disabled={busy}
                              onClick={() => void handleResolveRequest(row.uid, false)}
                            >
                              Decline
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {notice && <p className={pageStyles.success}>{notice}</p>}
            </section>
          )}

          <section className={panelStyles.panel}>
            <h2 className={panelStyles.panelTitle}>Crew ladder</h2>
            {entries.length === 0 ? (
              <p className={panelStyles.panelBody}>
                No rated matches in this crew yet.
              </p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Captain</th>
                    <th>TEI</th>
                    <th>Matches</th>
                    <th>Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.uid}>
                      <td>{entry.rank}</td>
                      <td>
                        <Link to={`/profile/${entry.uid}`}>{entry.displayName}</Link>
                      </td>
                      <td>{entry.tei ?? '—'}</td>
                      <td>{entry.matches}</td>
                      <td>{entry.wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
