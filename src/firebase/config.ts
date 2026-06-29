import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function readConfig(): FirebaseConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain:
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'warp-12.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'warp-12',
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
      'warp-12.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  };
}

export function isFirebaseConfigured(config: FirebaseConfig = readConfig()): boolean {
  return Boolean(config.apiKey && config.appId && config.messagingSenderId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = readConfig();
  if (!isFirebaseConfigured(config)) {
    return null;
  }

  app ??= initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  auth ??= getAuth(firebaseApp);
  return auth;
}

export function getFirestoreDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  db ??= getFirestore(firebaseApp);
  return db;
}

export const FIRESTORE_COLLECTIONS = {
  playerProfiles: 'playerProfiles',
  playerStats: 'playerStats',
  publishedLogs: 'publishedLogs',
  ratedMatches: 'ratedMatches',
} as const;
