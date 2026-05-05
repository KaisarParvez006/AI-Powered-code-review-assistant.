/**
 * File Management API — all calls to the /files endpoints.
 * Kept separate from api.ts to avoid cluttering the existing AI API module.
 */

const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Invalid JSON: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    const msg = (data as { detail?: string })?.detail || res.statusText
    throw new Error(msg)
  }
  return data as T
}

export interface FileItem {
  name: string
  size: number
}

/** List all project files. */
export async function getFiles(): Promise<FileItem[]> {
  const res = await fetch(`${base}/files`)
  const data = await parseJson<{ files: FileItem[] }>(res)
  return data.files
}

/** Create a new file. Throws if name already exists. */
export async function createFile(name: string, content = ''): Promise<void> {
  const res = await fetch(`${base}/create-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  })
  await parseJson<unknown>(res)
}

/** Read file content from the server. */
export async function fetchFileContent(name: string): Promise<string> {
  const res = await fetch(`${base}/file/${encodeURIComponent(name)}`)
  const data = await parseJson<{ name: string; content: string }>(res)
  return data.content
}

/** Save (upsert) a file's content. */
export async function saveFile(name: string, content: string): Promise<void> {
  const res = await fetch(`${base}/save-file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  })
  await parseJson<unknown>(res)
}

/** Rename a file. */
export async function renameFile(oldName: string, newName: string): Promise<void> {
  const res = await fetch(`${base}/rename-file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_name: oldName, new_name: newName }),
  })
  await parseJson<unknown>(res)
}

/** Delete a file permanently. */
export async function deleteFile(name: string): Promise<void> {
  const res = await fetch(`${base}/file/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
  await parseJson<unknown>(res)
}
