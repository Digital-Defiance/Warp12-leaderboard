import { readPersistedAuthError } from '../../firebase/auth-error-store.js';
import { useFirebaseAuth } from '../../firebase/auth-context.js';
import styles from './auth-notice.module.scss';

export function AuthNotice() {
  const auth = useFirebaseAuth();
  const message = auth.error ?? readPersistedAuthError();

  if (!message) {
    return null;
  }

  return (
    <div className={styles.notice} role="alert">
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.dismiss} onClick={auth.clearError}>
        Dismiss
      </button>
    </div>
  );
}
