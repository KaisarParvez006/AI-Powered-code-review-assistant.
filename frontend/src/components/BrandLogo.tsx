import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTheme } from '../contexts/ThemeContext'

const LOGO_SRC = '/assets/logo/sample.jpeg'

type Props = {
  to?: string
  className?: string
  /** Smaller padding for dense navbars */
  compact?: boolean
}

/**
 * Brand lockup: image + "CodeXa" wordmark.
 * Light theme: image still works; text uses neutral-900 for contrast.
 */
export function BrandLogo({ to = '/app', className, compact }: Props) {
  const [imgOk, setImgOk] = useState(true)
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const inner = (
    <>
      <span className="relative flex h-8 w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-sm">
        {imgOk ? (
          <img
            src={LOGO_SRC}
            alt=""
            width={34}
            height={32}
            className="h-8 w-auto max-w-none object-contain"
            onError={() => setImgOk(false)}
          />
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white"
            aria-hidden
          >
            CX
          </span>
        )}
      </span>
      <span className="hidden font-semibold tracking-tight sm:inline">
        <span className={clsx(isLight ? 'text-neutral-900' : 'text-white')}>Code</span>
        <span className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">Xa</span>
      </span>
    </>
  )

  const cls = clsx(
    'group inline-flex items-center gap-2 rounded-md pr-2 transition-transform duration-200 hover:scale-[1.02]',
    compact ? 'pl-3' : 'pl-4 md:pl-6',
    className,
  )

  return (
    <Link
      to={to}
      className={cls}
      aria-label="CodeXa home"
    >
      {inner}
    </Link>
  )
}
