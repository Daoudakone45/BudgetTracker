import { useAuth } from '../auth/AuthContext.js'

// Page provisoire : le vrai tableau de bord (solde, dernières transactions, graphique) arrive à l'étape 7
export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">Bonjour {user.name || user.email} 👋</h1>
      <p className="mt-2 text-slate-600">Tu es connecté. Le tableau de bord arrive bientôt ici.</p>
    </div>
  )
}
