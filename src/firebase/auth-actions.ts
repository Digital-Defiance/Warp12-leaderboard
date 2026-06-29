import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithPopup,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';

import { getFirebaseAuth } from './config.js';
import {
  clearPersistedAuthError,
  persistAuthError,
} from './auth-error-store.js';

export function isAnonymousUser(user: User | null): boolean {
  return user?.isAnonymous ?? true;
}

export function isVerifiedUser(user: User | null): boolean {
  return Boolean(user && !user.isAnonymous);
}

export function formatAuthError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before finishing.';
    case 'auth/popup-blocked':
      return 'Popup blocked by the browser. Allow popups for this site, or try again.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in is already in progress. Wait a moment and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Firebase sign-in.';
    case 'auth/credential-already-in-use':
      return 'That Google account already exists. Sign out, then sign in with Google again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is linked to another sign-in method.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this Firebase project.';
    case 'auth/web-storage-unsupported':
      return 'Browser storage is blocked. Allow cookies/storage for this site.';
    case 'auth/network-request-failed':
      return 'Network error during sign-in. Check your connection and try again.';
    default: {
      const message = err instanceof Error ? err.message : 'Sign-in failed.';
      return code ? `${message} (${code})` : message;
    }
  }
}

function looksLikeRedirectReturn(): boolean {
  const { search, hash } = window.location;
  return (
    search.includes('apiKey=') ||
    search.includes('authType=') ||
    hash.includes('/__/auth/')
  );
}

/** React StrictMode mounts twice — only consume redirect result once per page load. */
let redirectResultPromise: Promise<User | null> | null = null;

async function completeGoogleRedirectOnce(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }
  try {
    const result = await getRedirectResult(auth);
    if (result?.user && !result.user.isAnonymous) {
      clearPersistedAuthError();
      return result.user;
    }
    if (looksLikeRedirectReturn()) {
      persistAuthError(
        'Google sign-in returned but no session was saved. Allow site storage/cookies, then try again with the popup sign-in button.',
        null
      );
    }
    return result?.user ?? null;
  } catch (err) {
    persistAuthError(formatAuthError(err), err);
    throw err;
  }
}

/** Call once on load to finish a redirect-based Google sign-in. */
export function completeGoogleRedirect(): Promise<User | null> {
  redirectResultPromise ??= completeGoogleRedirectOnce();
  return redirectResultPromise;
}

async function signInWithGooglePopup(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase auth unavailable');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    return auth.currentUser;
  }

  try {
    if (auth.currentUser?.isAnonymous) {
      const result = await linkWithPopup(auth.currentUser, provider);
      clearPersistedAuthError();
      return result.user;
    }
    const result = await signInWithPopup(auth, provider);
    clearPersistedAuthError();
    return result.user;
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : '';
    if (code === 'auth/credential-already-in-use') {
      await signOut(auth);
      const result = await signInWithPopup(auth, provider);
      clearPersistedAuthError();
      return result.user;
    }
    throw err;
  }
}

/**
 * Google sign-in via popup (reliable on custom domains).
 * Falls back to full-page redirect only when the popup is blocked.
 */
export async function startGoogleSignIn(): Promise<'redirecting' | User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase auth unavailable');
  }

  try {
    return await signInWithGooglePopup();
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : '';
    if (code !== 'auth/popup-blocked') {
      throw err;
    }
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  if (auth.currentUser?.isAnonymous) {
    await signOut(auth);
  }
  await signInWithRedirect(auth, provider);
  return 'redirecting';
}

export async function continueAsGuest(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase auth unavailable');
  }
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }
  await signOut(auth);
}
