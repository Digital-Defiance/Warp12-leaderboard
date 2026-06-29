const HTTP_ERROR_KEY = 'warp12.http.lastError';
export const HTTP_ERROR_EVENT = 'warp12-http-error';

export function readLastHttpError(): string | null {
  try {
    return localStorage.getItem(HTTP_ERROR_KEY);
  } catch {
    return null;
  }
}

export function clearLastHttpError(): void {
  try {
    localStorage.removeItem(HTTP_ERROR_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(HTTP_ERROR_EVENT));
}

export function persistHttpError(status: number, url: string, body: string): void {
  const detail = `${status} ${url}\n${body.slice(0, 1200)}`;
  try {
    localStorage.setItem(HTTP_ERROR_KEY, detail);
  } catch {
    // ignore
  }
  console.error('[Warp12 http]', detail);
  window.dispatchEvent(new Event(HTTP_ERROR_EVENT));
}

export function persistCallableError(name: string, err: unknown): void {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  const message = err instanceof Error ? err.message : String(err);
  const detail = `callable ${name}\n${message}${code ? ` (${code})` : ''}`;
  try {
    localStorage.setItem(HTTP_ERROR_KEY, detail);
  } catch {
    // ignore
  }
  console.error('[Warp12 callable]', detail, err);
  window.dispatchEvent(new Event(HTTP_ERROR_EVENT));
}

export function installHttpErrorCapture(): void {
  if ((window as { __warp12HttpCapture?: boolean }).__warp12HttpCapture) {
    return;
  }
  (window as { __warp12HttpCapture?: boolean }).__warp12HttpCapture = true;

  const shouldCapture = (url: string) =>
    url.includes('cloudfunctions.net') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('www.googleapis.com/identitytoolkit') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('/api/fn/');

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    if (response.status >= 400) {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (shouldCapture(url)) {
        try {
          const body = await response.clone().text();
          persistHttpError(response.status, url, body);
        } catch {
          persistHttpError(response.status, url, '');
        }
      }
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    (this as XMLHttpRequest & { __warp12Url?: string }).__warp12Url = String(url);
    if (username === undefined) {
      return originalOpen.call(this, method, url, async ?? true);
    }
    return originalOpen.call(this, method, url, async ?? true, username, password);
  };

  XMLHttpRequest.prototype.send = function (...args: Parameters<XMLHttpRequest['send']>) {
    this.addEventListener('load', () => {
      const url = (this as XMLHttpRequest & { __warp12Url?: string }).__warp12Url ?? '';
      if (this.status >= 400 && shouldCapture(url)) {
        persistHttpError(this.status, url, this.responseText ?? '');
      }
    });
    return originalSend.apply(this, args);
  };
}
