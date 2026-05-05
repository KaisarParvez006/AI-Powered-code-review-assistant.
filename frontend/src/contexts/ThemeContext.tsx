import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light'

type Ctx = {
  theme: Theme
  toggle: () => void
}

const ThemeCtx = createContext<Ctx | null>(null)
const KEY = 'codexa_theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const s = localStorage.getItem(KEY) as Theme | null
    if (s === 'light' || s === 'dark') return s
    return 'dark'
  })

  useLayoutEffect(() => {
    localStorage.setItem(KEY, theme)
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('light', theme === 'light')
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.body.className =
      theme === 'light'
        ? 'min-h-screen bg-slate-50 text-slate-900 font-sans antialiased'
        : 'min-h-screen bg-[#050508] text-slate-100 font-sans antialiased'
  }, [theme])

  const value = useMemo<Ctx>(
    () => ({
      theme,
      toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  )

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const v = useContext(ThemeCtx)
  if (!v) throw new Error('useTheme outside ThemeProvider')
  return v
}
