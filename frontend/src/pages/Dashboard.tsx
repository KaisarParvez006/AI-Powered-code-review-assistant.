import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Code2, LogOut, Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { fetchMetrics } from '../lib/api'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [scores, setScores] = useState<{ date: string; score: number }[]>([])
  const [trends, setTrends] = useState<{ name: string; count: number }[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const m = await fetchMetrics(user?.uid ?? undefined)
        if (!cancelled) {
          setScores(m.score_history)
          setTrends(m.issue_trends)
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load metrics')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const shell = theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#050508] text-slate-100'

  return (
    <div className={clsx('min-h-screen', shell)}>
      <header
        className={clsx(
          'flex h-14 items-center justify-between border-b px-3 md:px-6',
          theme === 'light' ? 'border-slate-200 bg-white/90' : 'border-white/10 bg-black/40',
        )}
      >
        <BrandLogo to="/dashboard" compact />
        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <Code2 className="h-4 w-4" />
            Editor
          </Link>
          <button
            type="button"
            onClick={toggle}
            className={clsx('rounded-lg p-2', theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10')}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className={clsx('rounded-lg p-2', theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10')}
            title="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as{' '}
            <span className={theme === 'light' ? 'text-slate-800' : 'text-slate-300'}>{user?.email}</span>
          </p>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className={clsx(
              'rounded-2xl border p-4',
              theme === 'light' ? 'border-slate-200 bg-white' : 'glass-panel border-white/10',
            )}
          >
            <h2
              className={clsx(
                'text-sm font-semibold',
                theme === 'light' ? 'text-slate-800' : 'text-slate-300',
              )}
            >
              Score history
            </h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scores}>
                  <CartesianGrid stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'} strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: theme === 'light' ? '#fff' : '#0f172a',
                      border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
                      borderRadius: 8,
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className={clsx(
              'rounded-2xl border p-4',
              theme === 'light' ? 'border-slate-200 bg-white' : 'glass-panel border-white/10',
            )}
          >
            <h2
              className={clsx(
                'text-sm font-semibold',
                theme === 'light' ? 'text-slate-800' : 'text-slate-300',
              )}
            >
              Issue trends
            </h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                  <CartesianGrid stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'} strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: theme === 'light' ? '#fff' : '#0f172a',
                      border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Metrics API aggregates from `/metrics`; connect Firestore writes from the editor to personalize history per user.
        </p>
      </main>
    </div>
  )
}
