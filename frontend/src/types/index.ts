export type ReviewSeverity = 'critical' | 'warning' | 'info'
export type IssueType = 'bug' | 'performance' | 'security' | 'style'

export interface ReviewIssue {
  line: number
  severity: ReviewSeverity
  type: IssueType
  message: string
  suggested_fix: string
}

export interface ReviewSummary {
  score: number
  strengths: string[]
  improvements: string[]
}

export interface ReviewResult {
  issues: ReviewIssue[]
  summary: ReviewSummary
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatApiResponse {
  message: string
  proposed_code: string
  apply_ready: boolean
}

export type LangId = 'c' | 'cpp' | 'python' | 'java'

export const LANG_OPTIONS: { id: LangId; label: string; monaco: string }[] = [
  { id: 'c', label: 'C', monaco: 'c' },
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
  { id: 'python', label: 'Python', monaco: 'python' },
  { id: 'java', label: 'Java', monaco: 'java' },
]

export interface RunOutput {
  stdout: string
  stderr: string
  exitCode: number | null
  time: string | null
  status: string
  running: boolean
}
