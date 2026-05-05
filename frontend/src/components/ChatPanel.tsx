import { useState, useEffect } from 'react'
import { Send, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { chatAssistant } from '../lib/api'
import type { LangId } from '../types'

type Msg = { role: 'user' | 'assistant'; content: string }

type Props = {
  code: string
  language: LangId
  onApplyCode: (next: string) => void
  theme: 'dark' | 'light'
  onClose: () => void
  initialQuery?: string | null
  onClearInitialQuery?: () => void
}

export function ChatPanel({ code, language, onApplyCode, theme, onClose, initialQuery, onClearInitialQuery }: Props) {
  const [minimized, setMinimized] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Ask about this file — explain errors, suggest refactors, or request a full rewrite. I can propose code you can apply in one click.',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [pendingApply, setPendingApply] = useState<string | null>(null)

  async function sendMessage(text: string) {
    const t = text.trim()
    if (!t) return
    
    // Capture the next state immediately so we can use it for the API call
    const nextMsgs: Msg[] = [...msgs, { role: 'user', content: t }]
    setMsgs(nextMsgs)
    setLoading(true)
    setPendingApply(null)
    
    try {
      const history = nextMsgs.map((m) => ({ role: m.role, content: m.content }))
      const res = await chatAssistant(code, language, history)
      setMsgs((m) => [...m, { role: 'assistant', content: res.message }])
      if (res.apply_ready && res.proposed_code?.trim()) {
        setPendingApply(res.proposed_code)
      }
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Request failed'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    if (loading) return
    const t = input
    setInput('')
    await sendMessage(t)
  }

  // Handle external query
  useEffect(() => {
    if (initialQuery) {
      if (minimized) setMinimized(false)
      onClearInitialQuery?.()
      void sendMessage(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const panelBg =
    theme === 'light'
      ? 'border-slate-200 bg-white/90 text-slate-800 shadow-xl'
      : 'border-white/10 bg-[#0c0e14]/95 text-slate-100 shadow-2xl shadow-black/40'

  return (
    <div
      className={clsx(
        'pointer-events-auto z-20 flex max-h-[min(520px,70vh)] w-full max-w-[400px] flex-col overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-300',
        panelBg,
        minimized ? 'max-h-12' : '',
      )}
    >
      <div
        className={clsx(
          'flex items-center justify-between gap-2 border-b px-3 py-2',
          theme === 'light' ? 'border-slate-200' : 'border-white/10',
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          Assistant
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!minimized && (
        <>
          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm leading-relaxed">
            {msgs.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={clsx(
                  'rounded-lg px-2 py-1.5',
                  m.role === 'user'
                    ? theme === 'light'
                      ? 'ml-4 bg-violet-100'
                      : 'ml-4 bg-violet-600/25'
                    : theme === 'light'
                      ? 'mr-2 bg-slate-100'
                      : 'mr-2 bg-white/5',
                )}
              >
                <div className="text-xs opacity-70">{m.role === 'user' ? 'You' : 'CodeXa'}</div>
                <div className="mt-1 whitespace-pre-wrap text-sm">{m.content}</div>
              </div>
            ))}
            {loading && <div className="text-xs text-slate-400">Thinking…</div>}
          </div>
          {pendingApply && (
            <div
              className={clsx('border-t px-3 py-2', theme === 'light' ? 'border-slate-200' : 'border-white/10')}
            >
              <button
                type="button"
                onClick={() => {
                  onApplyCode(pendingApply)
                  setPendingApply(null)
                }}
                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 py-2 text-xs font-semibold text-white"
              >
                Apply proposed code
              </button>
            </div>
          )}
          <div
            className={clsx('flex gap-2 border-t p-2', theme === 'light' ? 'border-slate-200' : 'border-white/10')}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Ask about this code…"
              className={clsx(
                'flex-1 rounded-lg border px-2 py-2 text-sm outline-none ring-cyan-500/20 focus:ring-2',
                theme === 'light'
                  ? 'border-slate-200 bg-white text-slate-900'
                  : 'border-white/10 bg-black/30 text-slate-100',
              )}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-500/20 px-3 py-2 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
