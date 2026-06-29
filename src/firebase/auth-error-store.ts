const AUTH_ERROR_KEY = 'warp12.auth.lastError';

export function persistAuthError(message: string, err?: unknown): void {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  const detail = code ? `${message} [${code}]` : message;
  try {
    localStorage.setItem(AUTH_ERROR_KEY, detail);
  } catch {
    // ignore quota / private mode
  }
  console.error('[Warp12 auth]', detail, err);
}

export function readPersistedAuthError(): string | null {
  try {
    return localStorage.getItem(AUTH_ERROR_KEY);
  } catch {
    return null;
  }
}

export function clearPersistedAuthError(): void {
  try {
    localStorage.removeItem(AUTH_ERROR_KEY);
  } catch {
    // ignore
  }
}
