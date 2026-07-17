import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { callFunction } from '../../firebase/functions-client.js';
import panelStyles from '../components/panel.module.scss';
import styles from './verify-page.module.scss';

type VerifyResult = {
  ok: true;
  valid: boolean;
  matchCode: string;
  status: string;
  source?: string;
  gameId?: string | null;
  certificate: {
    matchCode: string;
    issuedAt: string;
    objective: string;
    players: Array<{
      uid: string;
      displayName: string;
      rank: number;
      score: number;
      humanMuDelta?: number;
      crewMuDelta?: number;
    }>;
    charter?: { name: string; slug: string };
    signature?: string;
    verifyUrl?: string;
  };
  pdfUrl: string | null;
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function VerifyPage() {
  const [params, setParams] = useSearchParams();
  const codeFromUrl = params.get('code') ?? '';
  const [codeInput, setCodeInput] = useState(codeFromUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const autoCode = useMemo(() => codeFromUrl.trim(), [codeFromUrl]);

  const runVerify = async (raw: string) => {
    const matchCode = raw.trim();
    if (!matchCode) {
      setError('Enter a match code (MT-… or ON-…).');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await callFunction<{ matchCode: string }, VerifyResult>(
        'verifyMatchCertificate',
        { matchCode }
      );
      setResult(res);
      setParams({ code: res.matchCode }, { replace: true });
      setCodeInput(res.matchCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!autoCode) {
      return;
    }
    void runVerify(autoCode);
    // Intentionally only when URL code changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCode]);

  return (
    <div className={styles.page}>
      <section className={panelStyles.panel} aria-labelledby="verify-title">
        <p className={panelStyles.panelEyebrow}>Federation record</p>
        <h1 id="verify-title" className={panelStyles.panelTitle}>
          Verify match certificate
        </h1>
        <p className={panelStyles.panelBody}>
          Enter an official <code>MT-</code> code or an online sector{' '}
          <code>ON-</code> code. We check the HMAC signature and offer a
          time-limited PDF download when available.
        </p>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void runVerify(codeInput);
          }}
        >
          <label className={styles.label}>
            Match code
            <input
              className={styles.input}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="MT-7K3Q or ON-…"
              aria-label="Match certificate code"
            />
          </label>
          <button
            type="submit"
            className={styles.btn}
            disabled={busy || !codeInput.trim()}
          >
            {busy ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        {error ? (
          <p className={panelStyles.errorState} role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className={styles.result} role="status">
            <p
              className={
                result.valid ? styles.validBadge : styles.invalidBadge
              }
            >
              {result.valid
                ? 'Signature valid'
                : 'Signature invalid — do not trust this certificate'}
            </p>
            <dl className={styles.meta}>
              <div>
                <dt>Code</dt>
                <dd className={styles.mono}>{result.matchCode}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{result.status}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{result.source ?? 'official'}</dd>
              </div>
              <div>
                <dt>Issued</dt>
                <dd>{fmtWhen(result.certificate.issuedAt)}</dd>
              </div>
              <div>
                <dt>Objective</dt>
                <dd>{result.certificate.objective}</dd>
              </div>
              {result.certificate.charter ? (
                <div>
                  <dt>Charter</dt>
                  <dd>
                    <Link to={`/crews/${result.certificate.charter.slug}`}>
                      {result.certificate.charter.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>

            <h2 className={styles.standingsTitle}>Standings</h2>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Captain</th>
                    <th scope="col">Score</th>
                    <th scope="col">Δμ</th>
                  </tr>
                </thead>
                <tbody>
                  {[...result.certificate.players]
                    .sort((a, b) => a.rank - b.rank)
                    .map((p) => (
                      <tr key={p.uid}>
                        <td>{p.rank}</td>
                        <td>{p.displayName}</td>
                        <td>{p.score}</td>
                        <td className={styles.mono}>
                          {p.humanMuDelta != null
                            ? `${p.humanMuDelta >= 0 ? '+' : ''}${p.humanMuDelta.toFixed(3)}`
                            : p.crewMuDelta != null
                              ? `${p.crewMuDelta >= 0 ? '+' : ''}${p.crewMuDelta.toFixed(3)} crew`
                              : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {result.pdfUrl ? (
              <p className={styles.pdfRow}>
                <a
                  className={styles.btn}
                  href={result.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download signed PDF
                </a>
                <span className={styles.pdfHint}>Link expires in about one hour.</span>
              </p>
            ) : (
              <p className={panelStyles.emptyState}>No PDF on file for this code.</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
