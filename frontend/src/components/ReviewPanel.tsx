import { AlertTriangle, Info, ShieldAlert, Zap } from 'lucide-react'
import clsx from 'clsx'
import type { ReviewIssue, ReviewResult } from '../types'

const icons = {
  bug: AlertTriangle,
  performance: Zap,
  security: ShieldAlert,
  style: Info,
}

function Sev({ s }: { s: ReviewIssue['severity'] }) {
  const map = {
    critical: 'text-red-400 border-red-500/40 bg-red-500/10',
    warning: 'text-amber-300 border-amber-500/35 bg-amber-500/10',
    info: 'text-sky-300 border-sky-500/35 bg-sky-500/10',
  }
  return (
    <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border', map[s])}>
      {s}
    </span>
  )
}

type Props = {
  result: ReviewResult | null
  loading: boolean
  error: string | null
  onApplyFix: (fix: string, line: number) => void
  theme: 'dark' | 'light'
}

export function ReviewPanel({ result, loading, error, onApplyFix, theme }: Props) {
  const border = theme === 'light' ? 'border-slate-200' : 'border-white/10'
  const head = theme === 'light' ? 'text-slate-900' : 'text-white'

  return (
    <aside
      className={clsx(
        'flex h-full min-h-0 w-full flex-col border-l',
        border,
        theme === 'light' ? 'bg-slate-50/80' : 'bg-[#07080c]/90',
      )}
    >
      <div className={clsx('border-b px-4 py-3', border)}>
        <h2 className={clsx('text-sm font-semibold', head)}>AI review</h2>
        <p className="text-xs text-slate-500">Gemini · structured JSON</p>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="animate-spin">⟳</span> Analyzing code…
          </div>
        )}
        {error && (
          <div className={clsx('rounded-lg border p-3', theme === 'dark' ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50')}>
            <p className={clsx('text-xs font-semibold mb-1', theme === 'dark' ? 'text-red-300' : 'text-red-600')}>
              {error.toLowerCase().includes('fetch') ? '⚠️ Backend offline' : '⚠️ Review failed'}
            </p>
            <p className={clsx('text-xs', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
              {error.toLowerCase().includes('fetch')
                ? 'Start the backend: cd backend && uvicorn main:app --reload'
                : error}
            </p>
          </div>
        )}
        {!loading && !error && !result && (
          <p className="text-sm text-slate-500">Run a review to see issues and a score.</p>
        )}

        {result && (
          <div className="space-y-4">
            <div
              className={clsx(
                'rounded-xl border p-4',
                theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={clsx('text-3xl font-bold', head)}>{result.summary.score}</span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              {result.summary.strengths.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-emerald-400">Strengths</p>
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-400">
                    {result.summary.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.summary.improvements.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-amber-300">Improve</p>
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-400">
                    {result.summary.improvements.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {result.issues.map((issue, idx) => {
                const Icon = icons[issue.type] ?? Info
                return (
                  <div
                    key={`${issue.line}-${idx}`}
                    className={clsx(
                      'rounded-lg border p-3 text-sm',
                      theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/20',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span className="font-mono text-xs text-slate-500">L{issue.line}</span>
                      <Sev s={issue.severity} />
                      <span className="text-xs uppercase text-slate-500">{issue.type}</span>
                    </div>
                    <p
                      className={clsx(
                        'mt-2',
                        theme === 'light' ? 'text-slate-700' : 'text-slate-300',
                      )}
                    >
                      {issue.message}
                    </p>
                    {issue.suggested_fix?.trim() && (
                      <div className="mt-2">
                        <pre
                          className={clsx(
                            'max-h-40 overflow-auto rounded-md p-2 text-xs',
                            theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-black/40 text-slate-200',
                          )}
                        >
                          {issue.suggested_fix}
                        </pre>
                        <button
                          type="button"
                          onClick={() => onApplyFix(issue.suggested_fix, issue.line)}
                          className="mt-2 w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
                        >
                          Apply fix
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
