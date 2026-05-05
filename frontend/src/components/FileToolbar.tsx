/**
 * FileToolbar — inline file controls rendered inside the Workspace action bar.
 *
 * Shows: current filename (with dirty dot), Save, Download, Print.
 * No wrapper div — Workspace provides the outer border-b container.
 */

import { Download, Printer, Save } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  fileName: string
  isDirty: boolean
  theme: 'dark' | 'light'
  onSave: () => void
  onDownload: () => void
  onPrint: () => void
}

export function FileToolbar({ fileName, isDirty, theme, onSave, onDownload, onPrint }: Props) {
  const dark = theme === 'dark'

  const btnBase = clsx(
    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors border',
    dark
      ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
  )

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* File name pill */}
      <span
        className={clsx(
          'truncate max-w-[160px] rounded px-2 py-0.5 text-xs font-mono',
          dark ? 'bg-white/5 text-slate-200' : 'bg-slate-100 text-slate-700',
        )}
        title={fileName}
      >
        {fileName || '(no file)'}
      </span>

      {/* Unsaved indicator */}
      {isDirty && (
        <span
          title="Unsaved changes"
          className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse"
        />
      )}

      {/* Save */}
      <button
        id="file-toolbar-save-btn"
        type="button"
        onClick={onSave}
        className={clsx(
          btnBase,
          isDirty
            ? dark
              ? '!border-violet-500/40 !bg-violet-500/15 !text-violet-200'
              : '!border-violet-300 !bg-violet-50 !text-violet-700'
            : '',
        )}
        title="Save file (Ctrl+S)"
      >
        <Save className="h-3.5 w-3.5" />
        Save
      </button>

      {/* Download */}
      <button
        id="file-toolbar-download-btn"
        type="button"
        onClick={onDownload}
        className={btnBase}
        title="Download file"
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </button>

      {/* Print */}
      <button
        id="file-toolbar-print-btn"
        type="button"
        onClick={onPrint}
        className={btnBase}
        title="Print code"
      >
        <Printer className="h-3.5 w-3.5" />
        Print
      </button>
    </div>
  )
}
