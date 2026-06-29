import { useEffect, useState } from 'react';

import {
  clearLastHttpError,
  HTTP_ERROR_EVENT,
  readLastHttpError,
} from '../../firebase/http-error-capture.js';
import styles from './auth-notice.module.scss';

export function HttpErrorNotice() {
  const [message, setMessage] = useState<string | null>(() => readLastHttpError());

  useEffect(() => {
    const refresh = () => setMessage(readLastHttpError());
    refresh();
    window.addEventListener(HTTP_ERROR_EVENT, refresh);
    window.addEventListener('storage', refresh);
    const timer = window.setInterval(refresh, 1000);
    return () => {
      window.removeEventListener(HTTP_ERROR_EVENT, refresh);
      window.removeEventListener('storage', refresh);
      window.clearInterval(timer);
    };
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className={styles.notice} role="alert">
      <p className={styles.message}>
        <strong>Last HTTP error</strong> (saved locally — copy this):
      </p>
      <pre className={styles.detail}>{message}</pre>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => {
          clearLastHttpError();
          setMessage(null);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
