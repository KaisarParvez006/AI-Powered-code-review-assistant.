import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User as FbUser,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDb, getFirebaseAuth, googleProvider, isFirebaseConfigured } from '../lib/firebase'

const DEMO_KEY = 'codexa_demo_user'

export type AppUser = {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
  photoURL: string | null
}

export type AuthMode = 'firebase' | 'demo'

type AuthContextValue = {
  user: AppUser | null
  firebaseUser: FbUser | null
  mode: AuthMode
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginGoogle: () => Promise<void>
  logout: () => Promise<void>
  sendReset: (email: string) => Promise<void>
  resendVerification: () => Promise<void>
  enterDemo: () => void
  clearError: () => void
}

const Ctx = createContext<AuthContextValue | null>(null)

function mapUser(u: FbUser): AppUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    emailVerified: u.emailVerified,
    photoURL: u.photoURL,
  }
}

const demoAppUser: AppUser = {
  uid: 'demo-user',
  email: 'demo@codexa.local',
  displayName: 'Demo User',
  emailVerified: true,
  photoURL: null,
}

function getFriendlyErrorMessage(error: any): string {
  const code = error?.code || ''
  console.log('[Auth] Firebase error code:', code)

  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Incorrect password.'
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials or sign up if you don’t have an account.'
    case 'auth/email-already-in-use':
      return 'This email is already registered.'
    case 'auth/operation-not-allowed':
      return 'Email/Password login is not enabled in the Firebase Console.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.'
    default:
      return error?.message || 'Authentication failed.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FbUser | null>(null)
  const [mode, setMode] = useState<AuthMode>('firebase')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw === '1') {
      setUser(demoAppUser)
      setFirebaseUser(null)
      setMode('demo')
      setLoading(false)
      return
    }
    if (!isFirebaseConfigured()) {
      setLoading(false)
      return
    }
    const auth = getFirebaseAuth()
    const unsub = auth.onAuthStateChanged((u) => {
      setFirebaseUser(u)
      setUser(u ? mapUser(u) : null)
      setMode('firebase')
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const ensureProfile = useCallback(async (u: FbUser, name?: string) => {
    if (!isFirebaseConfigured()) return
    const db = getDb()
    await setDoc(
      doc(db, 'users', u.uid),
      {
        email: u.email,
        displayName: name || u.displayName || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }, [])

  // (No redirect-result listener needed — we use signInWithPopup now)

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setError(null)
      if (!isFirebaseConfigured()) {
        setError('Firebase is not configured.')
        return
      }
      try {
        const auth = getFirebaseAuth()
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (displayName) {
          await updateProfile(cred.user, { displayName })
        }
        await sendEmailVerification(cred.user)
        await ensureProfile(cred.user, displayName)
      } catch (e: unknown) {
        console.error('[Auth] Signup error:', e)
        const msg = getFriendlyErrorMessage(e)
        setError(msg)
        throw e
      }
    },
    [ensureProfile],
  )

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured.')
      return
    }
    try {
      const auth = getFirebaseAuth()
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: unknown) {
      console.error('[Auth] Login error:', e)
      const msg = getFriendlyErrorMessage(e)
      setError(msg)
      throw e
    }
  }, [])

  const loginGoogle = useCallback(async () => {
    setError(null)
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured.')
      return
    }
    try {
      const auth = getFirebaseAuth()
      // signInWithPopup keeps the current page alive and resolves the promise
      // once the user picks their account — no timing race with onAuthStateChanged.
      const cred = await signInWithPopup(auth, googleProvider)
      await ensureProfile(cred.user)
    } catch (e: unknown) {
      console.error('[Auth] Google login error:', e)
      setError(getFriendlyErrorMessage(e))
      throw e
    }
  }, [ensureProfile])

  const logout = useCallback(async () => {
    localStorage.removeItem(DEMO_KEY)
    if (mode === 'demo' || !isFirebaseConfigured()) {
      setUser(null)
      setFirebaseUser(null)
      setMode('firebase')
      return
    }
    await signOut(getFirebaseAuth())
  }, [mode])

  const sendReset = useCallback(async (email: string) => {
    setError(null)
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured.')
      return
    }
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email)
    } catch (e: unknown) {
      setError(getFriendlyErrorMessage(e))
    }
  }, [])

  const resendVerification = useCallback(async () => {
    if (!firebaseUser || mode !== 'firebase') return
    try {
      await sendEmailVerification(firebaseUser)
    } catch (e: unknown) {
      setError(getFriendlyErrorMessage(e))
    }
  }, [firebaseUser, mode])

  const enterDemo = useCallback(() => {
    localStorage.setItem(DEMO_KEY, '1')
    setUser(demoAppUser)
    setFirebaseUser(null)
    setMode('demo')
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      mode,
      loading,
      error,
      signUp,
      login,
      loginGoogle,
      logout,
      sendReset,
      resendVerification,
      enterDemo,
      clearError,
    }),
    [
      user,
      firebaseUser,
      mode,
      loading,
      error,
      signUp,
      login,
      loginGoogle,
      logout,
      sendReset,
      resendVerification,
      enterDemo,
      clearError,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
