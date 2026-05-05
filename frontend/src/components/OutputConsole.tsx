/**
 * OutputConsole — collapsible bottom panel showing code execution output.
 *
 * Shows stdout, stderr, exit code, execution time.
 * Color-coded: green for success, red for error.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Terminal, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { RunOutput } from '../types'

interface Props {
  output: RunOutput | null
  theme: 'dark' | 'light'
  onClear: () => void
}

const DEFAULT_HEIGHT = 200

export function OutputConsole({ output, theme, onClear }: Props) {
  const dark = theme === 'dark'
  const [collapsed, setCollapsed] = useState(false)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)

  // Drag-to-resize logic
  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    const startY = e.clientY
    const startH = height

    function onMove(me: MouseEvent) {
      const delta = startY - me.clientY
      setHeight(Math.max(80, Math.min(500, startH + delta)))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const hasOutput = output != null && (output.stdout || output.stderr || output.running)
  const success = output != null && output.exitCode === 0
  const failed = output != null && output.exitCode !== null && output.exitCode !== 0

  return (
    <div
      className={clsx(
        'flex shrink-0 flex-col border-t',
        dark ? 'border-white/10 bg-[#0d1117]' : 'border-slate-200 bg-slate-50',
      )}
      style={{ height: collapsed ? 32 : height }}
    >
      {/* Resize handle */}
      {!collapsed && (
        <div
          className={clsx(
            'h-1 w-full cursor-ns-resize shrink-0 transition-colors',
            dark ? 'hover:bg-violet-500/40' : 'hover:bg-violet-300/50',
          )}
          onMouseDown={startResize}
        />
      )}

      {/* Header bar */}
      <div
        className={clsx(
          'flex shrink-0 items-center justify-between gap-2 px-3 py-1 border-b',
          dark ? 'border-white/10' : 'border-slate-200',
        )}
      >
        <div className="flex items-center gap-2">
          <Terminal className={clsx('h-3.5 w-3.5', dark ? 'text-slate-400' : 'text-slate-500')} />
          <span className={clsx('text-xs font-semibold uppercase tracking-wider', dark ? 'text-slate-400' : 'text-slate-500')}>
            Output
          </span>
          {output?.running && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Running…
            </span>
          )}
          {!output?.running && success && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Exit 0
              {output.time && <span className="text-slate-500 ml-1">· {output.time}s</span>}
            </span>
          )}
          {!output?.running && failed && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Exit {output?.exitCode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasOutput && (
            <button
              id="output-console-clear-btn"
              type="button"
              onClick={onClear}
              title="Clear output"
              className={clsx(
                'rounded p-1 transition-colors',
                dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700',
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            id="output-console-collapse-btn"
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand console' : 'Collapse console'}
            className={clsx(
              'rounded p-1 transition-colors',
              dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700',
            )}
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Console body */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
          {!hasOutput && !output && (
            <p className={clsx('select-none', dark ? 'text-slate-600' : 'text-slate-400')}>
              Run your code to see output here.
            </p>
          )}

          {output?.running && (
            <div className="flex items-center gap-2 text-amber-400">
              <span className="animate-spin">⟳</span>
              <span>Executing…</span>
            </div>
          )}

          {!output?.running && output?.stdout && (
            <pre className={clsx('whitespace-pre-wrap break-words', success ? (dark ? 'text-emerald-300' : 'text-emerald-700') : (dark ? 'text-slate-200' : 'text-slate-700'))}>
              {output.stdout}
            </pre>
          )}

          {!output?.running && output?.stderr && (
            <pre className={clsx('whitespace-pre-wrap break-words mt-2', dark ? 'text-red-400' : 'text-red-600')}>
              {output.stderr}
            </pre>
          )}

          {!output?.running && !output?.stdout && !output?.stderr && output !== null && (
            <p className={clsx('italic', dark ? 'text-slate-600' : 'text-slate-400')}>
              (no output)
            </p>
          )}
        </div>
      )}
    </div>
  )
}
