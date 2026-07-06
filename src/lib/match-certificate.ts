import type { RatedMatchCertificate } from '../firebase/rated-match-schema.js';

export function downloadMatchCertificate(cert: RatedMatchCertificate): void {
  const json = JSON.stringify(cert, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `warp12-${cert.matchCode}-certificate.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
