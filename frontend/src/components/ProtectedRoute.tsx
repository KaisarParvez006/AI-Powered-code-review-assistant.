import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508] text-slate-400">
        Loading…
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  }
  return children
}
