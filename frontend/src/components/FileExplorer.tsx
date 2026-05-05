/**
 * FileExplorer — left sidebar panel showing the project file tree.
 *
 * Supports: select, create, rename (inline), delete.
 * Rendered as a compact VS Code-style tree.
 */

import { useRef, useState } from 'react'
import { ChevronDown, FilePlus, FileText, Pencil, Trash2, X, Check } from 'lucide-react'
import clsx from 'clsx'
import type { FileMap } from '../hooks/useFileSystem'

interface Props {
  files: FileMap
  activeFile: string
  theme: 'dark' | 'light'
  onSelect: (name: string) => void
  onCreate: (name: string) => void
  onRename: (newName: string) => void
  onDelete: (name: string) => void
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  const colors: Record<string, string> = {
    py: '#4da6ff',
    js: '#f0db4f',
    ts: '#3178c6',
    tsx: '#61dafb',
    java: '#f89820',
    cpp: '#9b59b6',
    cc: '#9b59b6',
    c: '#e74c3c',
    txt: '#95a5a6',
    md: '#1abc9c',
    json: '#f39c12',
    html: '#e67e22',
    css: '#2980b9',
  }
  return colors[ext ?? ''] ?? '#8e9aaf'
}

export function FileExplorer({ files, activeFile, theme, onSelect, onCreate, onRename, onDelete }: Props) {
  const dark = theme === 'dark'

  // New-file inline creation
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)

  // Inline rename
  const [renamingFile, setRenamingFile] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function startCreate() {
    setCreating(true)
    setNewName('')
    setTimeout(() => newInputRef.current?.focus(), 50)
  }

  function commitCreate() {
    const name = newName.trim()
    if (name) onCreate(name)
    setCreating(false)
    setNewName('')
  }

  function startRename(name: string) {
    setRenamingFile(name)
    setRenameVal(name)
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  function commitRename() {
    if (renameVal.trim() && renameVal.trim() !== renamingFile) {
      onRename(renameVal.trim())
    }
    setRenamingFile(null)
  }

  return (
    <aside
      className={clsx(
        'flex h-full flex-col border-r text-sm',
        dark ? 'border-white/10 bg-[#0d1117]' : 'border-slate-200 bg-slate-50',
      )}
      style={{ minWidth: 0 }}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-center justify-between px-3 py-2 border-b',
          dark ? 'border-white/10' : 'border-slate-200',
        )}
      >
        <div className="flex items-center gap-1.5">
          <ChevronDown className={clsx('h-3.5 w-3.5', dark ? 'text-slate-400' : 'text-slate-500')} />
          <span className={clsx('text-xs font-semibold uppercase tracking-wider', dark ? 'text-slate-400' : 'text-slate-500')}>
            Explorer
          </span>
        </div>
        <button
          id="file-explorer-new-file-btn"
          type="button"
          onClick={startCreate}
          title="New File"
          className={clsx(
            'rounded p-1 transition-colors',
            dark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900',
          )}
        >
          <FilePlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Project root label */}
      <div className={clsx('px-3 py-1.5 flex items-center gap-1', dark ? 'text-slate-500' : 'text-slate-400')}>
        <span className="text-xs font-mono">project/</span>
      </div>

      {/* File list */}
      <ul className="flex-1 overflow-y-auto py-1">
        {[...files.entries()].map(([name, meta]) => {
          const isActive = name === activeFile
          const isRenaming = renamingFile === name
          const isConfirmDel = confirmDelete === name

          return (
            <li key={name}>
              <div
                className={clsx(
                  'group flex items-center gap-2 px-4 py-1 cursor-pointer select-none transition-colors',
                  isActive
                    ? dark
                      ? 'bg-white/10 text-white'
                      : 'bg-violet-100 text-violet-900'
                    : dark
                      ? 'text-slate-300 hover:bg-white/5'
                      : 'text-slate-700 hover:bg-slate-100',
                )}
                onClick={() => !isRenaming && onSelect(name)}
              >
                {/* File icon */}
                <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: fileIcon(name) }} />

                {/* Name / rename input */}
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenamingFile(null)
                    }}
                    onBlur={commitRename}
                    className={clsx(
                      'flex-1 min-w-0 rounded px-1 text-xs font-mono outline-none',
                      dark ? 'bg-white/10 text-white' : 'bg-white border border-violet-400 text-slate-900',
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 min-w-0 truncate text-xs font-mono">
                    {name}
                    {meta.isDirty && <span className="ml-1 text-amber-400">●</span>}
                  </span>
                )}

                {/* Actions (visible on hover / delete confirm) */}
                {!isRenaming && !isConfirmDel && (
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      title="Rename"
                      onClick={(e) => { e.stopPropagation(); startRename(name) }}
                      className={clsx(
                        'rounded p-0.5 transition-colors',
                        dark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700',
                      )}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(name) }}
                      className="rounded p-0.5 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Delete confirm inline */}
                {isConfirmDel && (
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title="Confirm delete"
                      onClick={() => { onDelete(name); setConfirmDelete(null) }}
                      className="rounded p-0.5 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Cancel"
                      onClick={() => setConfirmDelete(null)}
                      className={clsx('rounded p-0.5 transition-colors', dark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          )
        })}

        {/* Inline new-file input */}
        {creating && (
          <li className="px-4 py-1">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={newInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCreate()
                  if (e.key === 'Escape') setCreating(false)
                }}
                onBlur={commitCreate}
                placeholder="filename.py"
                className={clsx(
                  'flex-1 min-w-0 rounded px-1 text-xs font-mono outline-none',
                  dark ? 'bg-white/10 text-white placeholder:text-slate-500' : 'bg-white border border-violet-400 text-slate-900 placeholder:text-slate-400',
                )}
              />
            </div>
          </li>
        )}
      </ul>

      {/* File count footer */}
      <div className={clsx('border-t px-3 py-1.5', dark ? 'border-white/10 text-slate-600' : 'border-slate-200 text-slate-400')}>
        <span className="text-xs">{files.size} file{files.size !== 1 ? 's' : ''}</span>
      </div>
    </aside>
  )
}
