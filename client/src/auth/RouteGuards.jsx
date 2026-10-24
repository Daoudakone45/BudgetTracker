import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext.js'

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Chargement…
    </div>
  )
}

// Pages réservées aux utilisateurs connectés : sinon, direction /login
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />
  // On mémorise la page demandée pour y revenir après la connexion
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Pages réservées aux visiteurs (connexion, inscription) : un utilisateur connecté va au tableau de bord
export function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageLoader />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
