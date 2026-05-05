import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../contexts/AuthContext'

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#050508] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,50,255,0.35),transparent)]" />
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <BrandLogo to={user ? '/dashboard' : '/'} />
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <Link
                to="/app"
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 font-medium text-white transition hover:bg-white/10"
              >
                Open editor
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-300 hover:text-white">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 font-medium text-white shadow-lg shadow-fuchsia-500/20"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-16 md:px-6">
        <section className="text-center">
          <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-300/90">
            AI code review + Copilot-style chat
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white md:text-5xl">
            Ship better code with{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              CodeXa
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Write in Monaco, get structured reviews from Gemini, fix inline issues, and pair with an assistant that
            knows your current file.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to={user ? '/app' : '/signup'}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-3 font-semibold text-white shadow-xl shadow-fuchsia-500/25 transition hover:brightness-110"
            >
              {user ? 'Go to workspace' : 'Get started free'}
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-white/15 bg-white/5 px-8 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Structured reviews',
              body: 'Bugs, performance, security, and style — returned as strict JSON with line anchors.',
            },
            {
              title: 'Inline fixes',
              body: 'See severity-colored annotations and apply suggested fixes with one click.',
            },
            {
              title: 'Contextual chat',
              body: 'Ask why, optimize, or refactor — the assistant always sees your current code.',
            },
          ].map((f) => (
            <div key={f.title} className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20">
          <div className="glass-panel overflow-hidden rounded-2xl border border-white/10">
            <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-left text-xs text-slate-400">
              Editor preview
            </div>
            <div className="grid gap-px bg-white/10 md:grid-cols-[1fr_320px]">
              <div className="min-h-[220px] bg-[#0b0f17] p-4 font-mono text-xs leading-relaxed text-slate-300">
                <div className="text-slate-500"># python</div>
                <div>
                  <span className="text-purple-400">def </span>
                  <span className="text-cyan-300">two_sum</span>
                  (nums, t):
                </div>
                <div className="pl-4 text-amber-200/90">seen = {'{}'}</div>
                <div className="pl-4">
                  <span className="text-purple-400">for </span>i, n <span className="text-purple-400">in</span>{' '}
                  <span className="text-cyan-300">enumerate</span>(nums):
                </div>
                <div className="pl-8">...</div>
              </div>
              <div className="bg-[#080a10] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI review</p>
                <p className="mt-3 text-sm text-emerald-400">Score: 88</p>
                <p className="mt-2 text-xs text-slate-400">Consider using a dict for O(n) lookups…</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
