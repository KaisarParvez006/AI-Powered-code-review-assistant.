import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId)
}

let app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* env vars.')
  }
  if (!app) {
    app = initializeApp(cfg)
  }
  return app
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

export function getDb() {
  return getFirestore(getFirebaseApp())
}

export const googleProvider = new GoogleAuthProvider()
