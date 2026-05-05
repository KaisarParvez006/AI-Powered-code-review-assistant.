import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'

/**
 * Firebase sends a password reset link to email (not numeric OTP).
 * UI copy references "email link" for clarity.
 */
export default function ForgotPassword() {
  const { sendReset, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearError()
    if (!isFirebaseConfigured()) return
    setPending(true)
    try {
      await sendReset(email.trim())
      setSent(true)
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
      <div className="relative z-10 mx-auto max-w-md px-4 py-16">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
          <p className="mt-1 text-sm text-slate-400">
            We&apos;ll email you a secure link to choose a new password (Firebase Auth).
          </p>
          {sent ? (
            <p className="mt-6 text-sm text-emerald-400">
              If an account exists for that address, check your inbox and follow the link.
            </p>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
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
              {!isFirebaseConfigured() && (
                <p className="text-sm text-amber-300/90">Configure Firebase to enable password reset.</p>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={pending || !isFirebaseConfigured()}
                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-sm">
            <Link to="/login" className="text-cyan-400 hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
