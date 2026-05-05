import type { ChatApiResponse, ReviewResult } from '../types'

const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Invalid JSON from API: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    const msg = (data as { detail?: string })?.detail || res.statusText
    throw new Error(msg)
  }
  return data as T
}

export async function reviewCode(code: string, language: string): Promise<ReviewResult> {
  const res = await fetch(`${base}/review-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language }),
  })
  return parseJson<ReviewResult>(res)
}

export async function chatAssistant(
  code: string,
  language: string,
  messages: { role: string; content: string }[],
): Promise<ChatApiResponse> {
  const res = await fetch(`${base}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, messages }),
  })
  return parseJson<ChatApiResponse>(res)
}

export async function fetchMetrics(userId?: string | null) {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
  const res = await fetch(`${base}/metrics${q}`)
  return parseJson<{
    score_history: { date: string; score: number }[]
    issue_trends: { name: string; count: number }[]
  }>(res)
}
