import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import { addMonths, currentMonth, formatAmount, formatDate, formatMonth } from '../format.js'
import ExpenseChart from '../components/ExpenseChart.jsx'

const cardClass = 'rounded-xl border border-slate-200 bg-white p-5'

function StatTile({ label, value, hint }) {
  return (
    <div className={cardClass}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{formatAmount(value)}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [month, setMonth] = useState(currentMonth)
  // Même principe que la page Transactions : on charge tant que la réponse ne correspond pas au mois affiché
  const [result, setResult] = useState({ month: null, summary: null, error: '' })
  const loading = result.month !== month
  const { summary, error } = result

  useEffect(() => {
    let cancelled = false
    api(`/summary?month=${month}`)
      .then((data) => !cancelled && setResult({ month, summary: data, error: '' }))
      .catch((err) => !cancelled && setResult((prev) => ({ ...prev, month, error: err.message })))
    return () => {
      cancelled = true
    }
  }, [month])

  const isCurrentMonth = month === currentMonth()
  const monthLabel = formatMonth(month)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Bonjour {user.name || user.email}</h1>
        {/* Sélecteur de mois */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button onClick={() => setMonth(addMonths(month, -1))} aria-label="Mois précédent" className="rounded-md px-2.5 py-1 text-slate-600 hover:bg-slate-100">
            ←
          </button>
          <span className="min-w-36 text-center text-sm font-medium capitalize text-slate-900">{monthLabel}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} aria-label="Mois suivant" className="rounded-md px-2.5 py-1 text-slate-600 hover:bg-slate-100">
            →
          </button>
          {!isCurrentMonth && (
            <button onClick={() => setMonth(currentMonth())} className="rounded-md px-2.5 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
              Aujourd’hui
            </button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!summary ? (
        <p className="py-12 text-center text-slate-500">Chargement…</p>
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* Chiffres clés */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={`${cardClass} sm:col-span-3 lg:col-span-1`}>
              <p className="text-sm text-slate-500">Solde actuel</p>
              <p className="mt-1 text-4xl font-semibold text-slate-900">{formatAmount(summary.balance)}</p>
              <p className="mt-1 text-xs text-slate-500">Tous revenus moins toutes dépenses</p>
            </div>
            <StatTile label="Revenus du mois" value={summary.income} hint={monthLabel} />
            <StatTile label="Dépenses du mois" value={summary.expense} hint={monthLabel} />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Graphique */}
            <section className={`${cardClass} lg:col-span-3`}>
              <h2 className="mb-4 font-semibold text-slate-900">Dépenses par catégorie</h2>
              {summary.byCategory.length > 0 ? (
                <ExpenseChart data={summary.byCategory} />
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">Aucune dépense en {monthLabel}.</p>
              )}
            </section>

            {/* Dernières transactions */}
            <section className={`${cardClass} lg:col-span-2`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Dernières transactions</h2>
                <Link to="/transactions" className="text-sm font-medium text-emerald-700 hover:underline">
                  Voir tout
                </Link>
              </div>
              {summary.recent.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {summary.recent.map((transaction) => (
                    <li key={transaction.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{transaction.category_name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {formatDate(transaction.date)}
                          {transaction.comment && ` · ${transaction.comment}`}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {transaction.type === 'INCOME' ? '+' : '−'} {formatAmount(transaction.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  Aucune transaction.{' '}
                  <Link to="/transactions" className="font-medium text-emerald-700 hover:underline">
                    Ajoute la première
                  </Link>
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
