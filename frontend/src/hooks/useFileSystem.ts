/**
 * useFileSystem — multi-file state with localStorage as primary storage.
 *
 * Files live in localStorage so they persist across refreshes without any backend.
 * The backend API is used for optional cloud sync (fails gracefully).
 *
 * localStorage keys:
 *   codexa:files  → JSON: { [name]: content }
 *   codexa:active → string: active filename
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createFile as apiCreate,
  deleteFile as apiDelete,
  fetchFileContent,
  getFiles,
  saveFile as apiSave,
  renameFile as apiRename,
} from '../lib/filesApi'
import type { LangId } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface FileMeta {
  name: string
  content: string
  isDirty: boolean
}

export type FileMap = Map<string, FileMeta>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const LS_FILES = 'codexa:files'
const LS_ACTIVE = 'codexa:active'

const DEFAULT_FILES: Record<string, string> = {
  'main.py': `def greet(name: str) -> str:
    return f"Hello, {name}!"

def main():
    print(greet("World"))
    print(greet("CodeXa"))

if __name__ == "__main__":
    main()
`,
  'utils.py': `# Utility helpers

def add(a: int, b: int) -> int:
    """Return sum of a and b."""
    return a + b

def is_palindrome(s: str) -> bool:
    """Check if a string is a palindrome."""
    return s == s[::-1]
`,
}

function loadFromStorage(): { files: Record<string, string>; active: string } {
  try {
    const raw = localStorage.getItem(LS_FILES)
    const files: Record<string, string> = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    const active = localStorage.getItem(LS_ACTIVE) ?? ''
    // If storage is empty, seed with defaults
    if (Object.keys(files).length === 0) {
      return { files: DEFAULT_FILES, active: Object.keys(DEFAULT_FILES)[0] }
    }
    return { files, active: active && files[active] !== undefined ? active : Object.keys(files)[0] }
  } catch {
    return { files: DEFAULT_FILES, active: Object.keys(DEFAULT_FILES)[0] }
  }
}

function saveToStorage(files: FileMap) {
  try {
    const obj: Record<string, string> = {}
    for (const [name, meta] of files) {
      obj[name] = meta.content
    }
    localStorage.setItem(LS_FILES, JSON.stringify(obj))
  } catch {
    // Storage full or unavailable — ignore
  }
}

function saveActiveToStorage(name: string) {
  try {
    localStorage.setItem(LS_ACTIVE, name)
  } catch { /* ignore */ }
}

export function langFromName(name: string): LangId {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'py') return 'python'
  if (ext === 'java') return 'java'
  if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') return 'cpp'
  if (ext === 'c') return 'c'
  return 'python'
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useFileSystem() {
  // Initialise synchronously from localStorage so there's no loading flash
  const [files, setFiles] = useState<FileMap>(() => {
    const { files: stored, active: _ } = loadFromStorage()
    const map = new Map<string, FileMeta>()
    for (const [name, content] of Object.entries(stored)) {
      map.set(name, { name, content, isDirty: false })
    }
    return map
  })

  const [activeFile, setActiveFile] = useState<string>(() => {
    const { active } = loadFromStorage()
    return active
  })

  const [error, setError] = useState<string | null>(null)

  // Persist to localStorage whenever files change
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      // Seed localStorage with defaults if first ever visit
      isFirstRender.current = false
      const raw = localStorage.getItem(LS_FILES)
      if (!raw || raw === '{}') {
        saveToStorage(files)
      }
      return
    }
    saveToStorage(files)
  }, [files])

  useEffect(() => {
    if (activeFile) saveActiveToStorage(activeFile)
  }, [activeFile])

  // Optional: try to sync from backend once on mount (non-blocking)
  useEffect(() => {
    async function tryBackendSync() {
      try {
        const items = await getFiles()
        if (items.length === 0) return
        // Only hydrate if localStorage still has only the default files
        const storedRaw = localStorage.getItem(LS_FILES)
        const stored: Record<string, string> = storedRaw ? (JSON.parse(storedRaw) as Record<string, string>) : {}
        const isDefault =
          Object.keys(stored).length === Object.keys(DEFAULT_FILES).length &&
          Object.keys(stored).every((k) => k in DEFAULT_FILES)
        if (!isDefault) return // User has custom files — don't overwrite
        const map = new Map<string, FileMeta>()
        for (const item of items) {
          const content = await fetchFileContent(item.name)
          map.set(item.name, { name: item.name, content, isDirty: false })
        }
        if (map.size > 0) {
          setFiles(map)
          setActiveFile(items[0].name)
        }
      } catch {
        // Backend offline — localStorage continues silently
      }
    }
    void tryBackendSync()
  }, [])


  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const activeFileMeta: FileMeta | undefined = files.get(activeFile)
  const activeContent = activeFileMeta?.content ?? ''
  const isDirty = activeFileMeta?.isDirty ?? false
  const activeLang: LangId = langFromName(activeFile)

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  /** Update editor content for the active file (marks dirty). */
  const updateContent = useCallback((content: string) => {
    setFiles((prev) => {
      const next = new Map(prev)
      const meta = next.get(activeFile)
      if (meta) next.set(activeFile, { ...meta, content, isDirty: true })
      return next
    })
  }, [activeFile])

  /** Save active file — localStorage first, then try backend. */
  const saveActive = useCallback(async () => {
    const meta = files.get(activeFile)
    if (!meta) return
    // Mark clean immediately
    setFiles((prev) => {
      const next = new Map(prev)
      const m = next.get(activeFile)
      if (m) next.set(activeFile, { ...m, isDirty: false })
      return next
    })
    // Try backend (fire-and-forget)
    try {
      await apiSave(activeFile, meta.content)
    } catch {
      // Backend offline — localStorage already saved via useEffect
    }
  }, [activeFile, files])

  /** Select a file and make it active. */
  const selectFile = useCallback((name: string) => {
    if (files.has(name)) setActiveFile(name)
  }, [files])

  /** Create a new file. */
  const createNewFile = useCallback(async (name: string, content = '') => {
    name = name.trim()
    if (!name || files.has(name)) return
    setFiles((prev) => {
      const next = new Map(prev)
      next.set(name, { name, content, isDirty: false })
      return next
    })
    setActiveFile(name)
    // Try backend (fire-and-forget)
    try { await apiCreate(name, content) } catch { /* offline */ }
  }, [files])

  /** Rename the active file. */
  const renameActive = useCallback(async (newName: string) => {
    newName = newName.trim()
    if (!newName || newName === activeFile || files.has(newName)) return
    const meta = files.get(activeFile)
    if (!meta) return
    setFiles((prev) => {
      const next = new Map(prev)
      next.delete(activeFile)
      next.set(newName, { ...meta, name: newName })
      return next
    })
    const old = activeFile
    setActiveFile(newName)
    try { await apiRename(old, newName) } catch { /* offline */ }
  }, [activeFile, files])

  /** Delete a file. Switches to the nearest sibling. */
  const deleteActive = useCallback(async (name: string) => {
    const meta = files.get(name)
    if (!meta) return
    const names = [...files.keys()]
    const idx = names.indexOf(name)
    setFiles((prev) => {
      const next = new Map(prev)
      next.delete(name)
      return next
    })
    if (name === activeFile) {
      const sibling = names[idx - 1] ?? names[idx + 1] ?? ''
      setActiveFile(sibling)
    }
    try { await apiDelete(name) } catch { /* offline */ }
  }, [activeFile, files])

  return {
    files,
    activeFile,
    activeContent,
    activeLang,
    isDirty,
    loading: false,   // No async loading — data comes from localStorage instantly
    error,
    setError,
    updateContent,
    saveActive,
    selectFile,
    createNewFile,
    renameActive,
    deleteActive,
  }
}
