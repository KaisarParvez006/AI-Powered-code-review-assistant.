/**
 * Workspace — full mini-IDE page.
 *
 * Layout:
 *   Header  (logo · lang indicator · theme · dashboard · user · logout)
 *   ├─ FileExplorer (left 220px)
 *   ├─ Centre: FileToolbar + Monaco Editor + ChatPanel overlay
 *   └─ ReviewPanel (right ~360px)
 *   OutputConsole (bottom, collapsible + drag-resize)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { BarChart3, LogOut, MessageSquare, Moon, Play, Sun } from 'lucide-react'
import clsx from 'clsx'

import { BrandLogo } from '../components/BrandLogo'
import { ChatPanel } from '../components/ChatPanel'
import { ReviewPanel } from '../components/ReviewPanel'
import { FileExplorer } from '../components/FileExplorer'
import { FileToolbar } from '../components/FileToolbar'
import { OutputConsole } from '../components/OutputConsole'
import { useAuth } from '../contexts/AuthContext'
import type { AppUser } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useFileSystem } from '../hooks/useFileSystem'
import { reviewCode } from '../lib/api'
import { saveReviewRecord } from '../lib/firestore'
import { LANG_OPTIONS, type LangId, type ReviewResult, type RunOutput } from '../types'

// ---------------------------------------------------------------------------
// Backend execute response shape
// ---------------------------------------------------------------------------
interface ExecuteResult {
  stdout: string
  stderr: string
  exit_code: number
  time: string
}

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Utility: severity decorations
// ---------------------------------------------------------------------------
function severityClass(s: string, theme: 'dark' | 'light') {
  if (theme === 'light') {
    if (s === 'critical') return 'bg-red-200/80'
    if (s === 'warning') return 'bg-amber-200/80'
    return 'bg-sky-200/70'
  }
  if (s === 'critical') return 'bg-red-500/25'
  if (s === 'warning') return 'bg-amber-500/20'
  return 'bg-sky-500/15'
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------
function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'code.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Print helper
// ---------------------------------------------------------------------------
function printCode(filename: string, content: string) {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const numbered = escaped
    .split('\n')
    .map((line, i) => `<span class="ln">${i + 1}</span>${line}`)
    .join('\n')

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${filename}</title>
  <meta charset="utf-8"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;font-size:13px;line-height:1.7;
         padding:40px;color:#111;background:#fff}
    h1{font-size:15px;font-weight:700;margin-bottom:20px;padding-bottom:10px;
       border-bottom:2px solid #333;color:#222;font-family:sans-serif}
    pre{white-space:pre-wrap;word-break:break-word}
    .ln{display:inline-block;min-width:40px;margin-right:16px;color:#999;
        text-align:right;user-select:none;border-right:1px solid #ddd;padding-right:8px}
    @media print{body{padding:20px}h1{font-size:13px}}
  </style>
</head>
<body>
  <h1>${filename}</h1>
  <pre>${numbered}</pre>
  <script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`)
  win.document.close()
}

// ---------------------------------------------------------------------------
// UserAvatar — shows Google photo if available, otherwise a deterministic
// gradient avatar built from the user's initials.
// ---------------------------------------------------------------------------
const AVATAR_GRADIENTS = [
  'from-violet-500 to-cyan-400',
  'from-pink-500 to-orange-400',
  'from-emerald-500 to-teal-400',
  'from-blue-500 to-indigo-400',
  'from-rose-500 to-pink-400',
  'from-amber-500 to-yellow-400',
  'from-cyan-500 to-sky-400',
  'from-purple-500 to-violet-400',
]

function getInitials(user: AppUser | null): string {
  if (!user) return '?'
  const name = user.displayName || user.email || ''
  const parts = name.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] || '?').toUpperCase()
}

function getGradient(user: AppUser | null): string {
  if (!user) return AVATAR_GRADIENTS[0]
  let hash = 0
  const str = user.uid || user.email || ''
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function UserAvatar({ user, size = 8 }: { user: AppUser | null; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false)
  const sizeClass = `h-${size} w-${size}`
  const showImg = !!user?.photoURL && !imgFailed

  return (
    <div
      className={clsx(
        'flex items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white shrink-0',
        sizeClass,
        !showImg && `bg-gradient-to-br ${getGradient(user)}`,
      )}
      title={user?.displayName || user?.email || 'User'}
    >
      {showImg ? (
        <img
          src={user!.photoURL!}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span>{getInitials(user)}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Workspace() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  // ── File system (localStorage-backed, no backend dep) ──────────────────
  const {
    files,
    activeFile,
    activeContent,
    activeLang,
    isDirty,
    error: fsError,
    setError: setFsError,
    updateContent,
    saveActive,
    selectFile,
    createNewFile,
    renameActive,
    deleteActive,
  } = useFileSystem()

  // ── Monaco editor refs ──────────────────────────────────────────────────
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const decoIds  = useRef<string[]>([])
  const prevFile = useRef<string>('')

  const monacoLang = useMemo(
    () => LANG_OPTIONS.find((l) => l.id === activeLang)?.monaco ?? 'python',
    [activeLang],
  )

  // Sync editor value whenever the active file changes
  useEffect(() => {
    if (prevFile.current !== activeFile) {
      prevFile.current = activeFile
      const ed = editorRef.current
      if (ed) {
        // Prevent triggering onChange → updateContent (would mark dirty)
        ed.setValue(activeContent)
      }
    }
  }, [activeFile, activeContent])

  // ── AI Review ──────────────────────────────────────────────────────────
  const [review,     setReview]     = useState<ReviewResult | null>(null)
  const [revLoading, setRevLoading] = useState(false)
  const [revError,   setRevError]   = useState<string | null>(null)
  const [chatOpen,   setChatOpen]   = useState(false)
  const [explainQuery, setExplainQuery] = useState<string | null>(null)

  const runReview = useCallback(async () => {
    setRevLoading(true)
    setRevError(null)
    try {
      const r = await reviewCode(activeContent, activeLang)
      setReview(r)
      if (user?.uid) {
        void saveReviewRecord(user.uid, {
          language: activeLang,
          score: r.summary?.score ?? 0,
          issueCount: r.issues?.length ?? 0,
        })
      }
    } catch (e) {
      setRevError(e instanceof Error ? e.message : 'Review failed')
      setReview(null)
    } finally {
      setRevLoading(false)
    }
  }, [activeContent, activeLang, user?.uid])

  // Apply full code replacement — used by Chat assistant (sends back full corrected code)
  const applyEditor = useCallback(
    (next: string) => {
      updateContent(next)
      editorRef.current?.setValue(next)
    },
    [updateContent],
  )

  // Apply a targeted fix from AI Review — replaces only the lines around issue.line
  const applyFix = useCallback(
    (fix: string, line: number) => {
      const ed     = editorRef.current
      const monaco = monacoRef.current
      if (!ed || !monaco) {
        // Fallback: full replace if editor not mounted yet
        applyEditor(fix)
        return
      }

      const model = ed.getModel()
      if (!model) { applyEditor(fix); return }

      const fixLines    = fix.split('\n')
      const totalLines  = model.getLineCount()

      // Replace the same number of lines as the fix has, starting at issue.line
      const startLine = Math.max(1, line)
      const endLine   = Math.min(totalLines, startLine + fixLines.length - 1)
      const endCol    = model.getLineMaxColumn(endLine)

      ed.executeEdits('ai-apply-fix', [
        {
          range: new monaco.Range(startLine, 1, endLine, endCol),
          text: fix,
        },
      ])

      // Sync state with the new content
      const newContent = ed.getValue()
      updateContent(newContent)
    },
    [applyEditor, updateContent],
  )

  // Mount callback — load initial content into Monaco
  const mountEditor: OnMount = useCallback(
    (ed, monaco) => {
      editorRef.current = ed
      monacoRef.current = monaco
      ed.updateOptions({
        minimap: { enabled: true },
        fontSize: 14,
        scrollBeyondLastLine: false,
        padding: { top: 12 },
      })
      // Load the active file content into the freshly mounted editor
      ed.setValue(activeContent)
      prevFile.current = activeFile

      // Context menu action: Explain This Code
      ed.addAction({
        id: 'explain-this-code',
        label: '✨ Explain This Code',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run: function (editor) {
          const selection = editor.getSelection()
          if (!selection || selection.isEmpty()) return
          const model = editor.getModel()
          if (!model) return
          const text = model.getValueInRange(selection)
          if (!text.trim()) return

          setExplainQuery(`Please explain this code:\n\n\`\`\`\n${text}\n\`\`\``)
          setChatOpen(true)
        },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Draw issue decorations whenever review result or theme changes
  useEffect(() => {
    const ed     = editorRef.current
    const monaco = monacoRef.current
    if (!ed || !monaco) return
    if (!review?.issues?.length) {
      decoIds.current = ed.deltaDecorations(decoIds.current, [])
      return
    }
    const decos: Monaco.editor.IModelDeltaDecoration[] = review.issues.map((iss) => ({
      range: new monaco.Range(iss.line, 1, iss.line, 1),
      options: {
        isWholeLine: true,
        className: severityClass(iss.severity, theme),
        glyphMarginClassName: 'codexa-issue-glyph',
        marginClassName: severityClass(iss.severity, theme),
        overviewRuler: {
          color: iss.severity === 'critical' ? '#f87171'
               : iss.severity === 'warning'  ? '#fbbf24' : '#38bdf8',
          position: monaco.editor.OverviewRulerLane.Left,
        },
      },
    }))
    decoIds.current = ed.deltaDecorations(decoIds.current, decos)
  }, [review, theme])

  // ── Run Code (local backend — no external API needed) ───────────────────
  const [runOutput, setRunOutput] = useState<RunOutput | null>(null)

  const runCode = useCallback(async () => {
    setRunOutput({ stdout: '', stderr: '', exitCode: null, time: null, status: 'Running', running: true })

    try {
      const res = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeContent, language: activeLang }),
      })

      if (!res.ok) {
        // Try to parse a detail message from FastAPI
        let detail = `Server error (${res.status})`
        try {
          const json = await res.json() as { detail?: string }
          if (json.detail) detail = json.detail
        } catch { /* ignore */ }
        throw new Error(detail)
      }

      const data = (await res.json()) as ExecuteResult

      setRunOutput({
        stdout: data.stdout ?? '',
        stderr: data.stderr ?? '',
        exitCode: data.exit_code ?? 0,
        time: data.time ?? null,
        status: data.exit_code === 0 ? 'Completed' : 'Runtime Error',
        running: false,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Execution failed'
      const isOffline = msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('networkerror')
      setRunOutput({
        stdout: '',
        stderr: isOffline
          ? '\u26a0\ufe0f  Backend is offline.\n\nStart it with:\n  cd backend\n  .venv\\Scripts\\activate\n  uvicorn main:app --reload'
          : msg,
        exitCode: 1,
        time: null,
        status: isOffline ? 'Backend offline' : 'Error',
        running: false,
      })
    }
  }, [activeContent, activeLang])

  // ── Ctrl+S global shortcut ────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void saveActive()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveActive])

  // ── Download & Print ─────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    downloadFile(activeFile || 'code.txt', activeContent)
  }, [activeFile, activeContent])

  const handlePrint = useCallback(() => {
    printCode(activeFile || 'code.txt', activeContent)
  }, [activeFile, activeContent])

  // ── Theme shortcuts ───────────────────────────────────────────────────
  const monacoTheme = dark ? 'vs-dark' : 'light'
  const shellBg     = dark ? 'bg-[#050508]' : 'bg-slate-100'

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={clsx('flex h-screen min-h-0 flex-col overflow-hidden', shellBg)}>

      {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
      <header
        className={clsx(
          'flex h-12 shrink-0 items-center justify-between border-b px-3 z-20',
          dark ? 'border-white/10 bg-[#090d12]' : 'border-slate-200 bg-white',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <BrandLogo to="/dashboard" compact />
        </div>

        {/* Language indicator pills (read-only — lang is inferred from filename) */}
        <div className="flex items-center gap-1 px-2">
          {LANG_OPTIONS.map((l) => (
            <span
              key={l.id}
              className={clsx(
                'rounded-md px-2.5 py-1 text-xs font-medium select-none',
                activeLang === l.id
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-sm'
                  : dark
                    ? 'text-slate-500'
                    : 'text-slate-400',
              )}
            >
              {l.label}
            </span>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggle}
            className={clsx('rounded-lg p-2 transition-colors', dark ? 'hover:bg-white/10' : 'hover:bg-slate-100')}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            to="/dashboard"
            className={clsx('rounded-lg p-2 transition-colors', dark ? 'hover:bg-white/10' : 'hover:bg-slate-100')}
            title="Dashboard"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>

          <UserAvatar user={user} size={7} />

          <button
            type="button"
            onClick={() => logout()}
            className={clsx('rounded-lg p-2 transition-colors', dark ? 'hover:bg-white/10' : 'hover:bg-slate-100')}
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Error banner — only show non-fetch errors */}
      {fsError && !fsError.toLowerCase().includes('fetch') && (
        <div className="shrink-0 bg-red-500/20 border-b border-red-500/30 px-4 py-1.5 flex items-center justify-between gap-4">
          <span className="text-xs text-red-300">{fsError}</span>
          <button onClick={() => setFsError(null)} className="text-xs text-red-400 hover:text-red-200 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ═══ 3-PANEL BODY ═════════════════════════════════════════════════ */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* LEFT — File Explorer */}
        <div className="hidden md:flex w-[200px] shrink-0 flex-col overflow-hidden">
          <FileExplorer
            files={files}
            activeFile={activeFile}
            theme={theme}
            onSelect={selectFile}
            onCreate={createNewFile}
            onRename={renameActive}
            onDelete={deleteActive}
          />
        </div>

        {/* CENTRE — Editor pane */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">

          {/* ── Action bar ── */}
          <div
            className={clsx(
              'flex shrink-0 items-center justify-between gap-2 border-b px-2 py-1.5',
              dark ? 'border-white/10 bg-[#0c1017]' : 'border-slate-200 bg-white',
            )}
          >
            {/* Left: filename + dirty + Save / Download / Print */}
            <FileToolbar
              fileName={activeFile}
              isDirty={isDirty}
              theme={theme}
              onSave={() => void saveActive()}
              onDownload={handleDownload}
              onPrint={handlePrint}
            />

            {/* Right: Assistant · AI Review · Run Code */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setChatOpen((o) => !o)}
                aria-pressed={chatOpen}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                  chatOpen
                    ? dark
                      ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                      : 'border-cyan-500/40 bg-cyan-50 text-cyan-800'
                    : dark
                      ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Assistant</span>
              </button>

              <button
                type="button"
                onClick={runReview}
                disabled={revLoading}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50',
                  dark
                    ? 'border-violet-500/30 bg-violet-600/15 text-violet-300 hover:bg-violet-600/25'
                    : 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
                )}
              >
                <Play className="h-3.5 w-3.5" />
                {revLoading ? 'Analyzing…' : 'AI Review'}
              </button>

              <button
                type="button"
                onClick={() => void runCode()}
                disabled={runOutput?.running}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
              >
                <Play className="h-3.5 w-3.5" />
                {runOutput?.running ? 'Running…' : 'Run Code'}
              </button>
            </div>
          </div>

          {/* ── Monaco Editor ── */}
          <div className="relative min-h-0 flex-1">
            <Editor
              height="100%"
              language={monacoLang}
              theme={monacoTheme}
              value={activeContent}
              onChange={(v) => updateContent(v ?? '')}
              onMount={mountEditor}
              options={{
                automaticLayout: true,
                tabSize: 4,
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
            />

            {/* Chat panel — floating overlay */}
            {chatOpen && (
              <div className="pointer-events-none absolute inset-0 z-50 flex justify-end p-3">
                <div className="pointer-events-auto max-h-[min(520px,70vh)] w-full max-w-[400px]">
                  <ChatPanel
                    code={activeContent}
                    language={activeLang}
                    theme={theme}
                    onApplyCode={applyEditor}
                    onClose={() => setChatOpen(false)}
                    initialQuery={explainQuery}
                    onClearInitialQuery={() => setExplainQuery(null)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — AI Review Panel */}
        <div className="hidden w-[340px] shrink-0 md:block xl:w-[380px]">
          <ReviewPanel
            result={review}
            loading={revLoading}
            error={revError}
            theme={theme}
            onApplyFix={applyFix}
          />
        </div>
      </div>

      {/* ═══ OUTPUT CONSOLE (bottom) ═══════════════════════════════════════ */}
      <OutputConsole
        output={runOutput}
        theme={theme}
        onClear={() => setRunOutput(null)}
      />

      {/* Mobile hint */}
      <div className={clsx('shrink-0 border-t px-3 py-1.5 md:hidden', dark ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-white')}>
        <p className="text-center text-xs text-slate-500">Use a wider screen for the full IDE experience.</p>
      </div>
    </div>
  )
}
