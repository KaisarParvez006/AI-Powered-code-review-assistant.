import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'

export default function Signup() {
  const { signUp, loginGoogle, user, error, clearError } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFirebaseConfigured()) {
      return
    }
    clearError()
    setPending(true)
    try {
      await signUp(email.trim(), password, name.trim() || undefined)
      nav('/dashboard')
    } catch {
      /* context */
    } finally {
      setPending(false)
    }
  }

  async function onGoogle() {
    clearError()
    setPending(true)
    try {
      await loginGoogle()
      nav('/dashboard')
    } catch {
      /* */
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#050508] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,50,255,0.35),transparent)]" />
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 md:px-6">
          <BrandLogo to="/" />
        </div>
      </header>
      <div className="relative z-10 mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Email verification is sent after signup (Firebase).</p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-medium text-slate-400">Display name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
              />
            </div>
            {!isFirebaseConfigured() && (
              <p className="text-sm text-amber-300/90">
                Add Firebase env vars to enable signup, or use demo login on the login page.
              </p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={pending || !isFirebaseConfigured()}
              className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? 'Creating…' : 'Sign up'}
            </button>
          </form>
          {isFirebaseConfigured() && (
            <button
              type="button"
              onClick={onGoogle}
              disabled={pending}
              className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            >
              Continue with Google
            </button>
          )}
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-cyan-400 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
