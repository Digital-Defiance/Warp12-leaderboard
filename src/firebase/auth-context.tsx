import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  completeGoogleRedirect,
  formatAuthError,
  isVerifiedUser,
} from './auth-actions.js';
import {
  clearPersistedAuthError,
  persistAuthError,
  readPersistedAuthError,
} from './auth-error-store.js';
import { getFirebaseAuth, isFirebaseConfigured } from './config.js';

export interface FirebaseAuthState {
  /** False until redirect result is processed — avoid calling functions before this. */
  ready: boolean;
  configured: boolean;
  user: User | null;
  error: string | null;
  clearError: () => void;
}

const FirebaseAuthContext = createContext<FirebaseAuthState>({
  ready: false,
  configured: false,
  user: null,
  error: null,
  clearError: () => undefined,
});

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<FirebaseAuthState, 'clearError'>>({
    ready: false,
    configured: isFirebaseConfigured(),
    user: null,
    error: readPersistedAuthError(),
  });

  const clearError = () => {
    clearPersistedAuthError();
    setState((prev) => ({ ...prev, error: null }));
  };

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState((prev) => ({ ...prev, ready: true }));
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setState({
        ready: true,
        configured: false,
        user: null,
        error: 'Firebase auth unavailable',
      });
      return;
    }

    let active = true;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!active) {
        return;
      }
      setState((prev) => ({
        ...prev,
        configured: true,
        user,
        error: isVerifiedUser(user)
          ? null
          : prev.error ?? readPersistedAuthError(),
      }));
      if (isVerifiedUser(user)) {
        clearPersistedAuthError();
      }
    });

    void completeGoogleRedirect()
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = formatAuthError(err);
        persistAuthError(message, err);
        setState((prev) => ({ ...prev, error: message }));
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setState((prev) => ({ ...prev, ready: true }));
      });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const value = useMemo(
    (): FirebaseAuthState => ({
      ...state,
      clearError,
    }),
    [state]
  );

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth(): FirebaseAuthState {
  return useContext(FirebaseAuthContext);
}
