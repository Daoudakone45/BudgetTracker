import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { api } from '../api.js'
import { formatAmount, formatDate } from '../format.js'
import TransactionForm from '../components/TransactionForm.jsx'

const SEARCH_DELAY_MS = 300

const filterClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'

export default function Transactions() {
  // Les filtres vivent dans l'URL : /transactions?date=2026-10-15&type=EXPENSE&search=courses
  // (ou ?month=2026-10 pour un mois entier)
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('date') || ''
  const month = searchParams.get('month') || ''
  // Filtrer sur un jour précis ('day', par défaut) ou sur un mois entier ('month')
  const [periodMode, setPeriodMode] = useState(month ? 'month' : 'day')
  const type = searchParams.get('type') || ''
  const search = searchParams.get('search') || ''

  const [categories, setCategories] = useState([])
  // null = formulaire fermé, 'new' = ajout, sinon la transaction en cours de modification
  const [editing, setEditing] = useState(null)
  // Incrémenté pour forcer un rechargement de la liste (après ajout, modification, suppression)
  const [reloadKey, setReloadKey] = useState(0)
  // Ce qui est tapé dans la recherche, avant d'être envoyé dans l'URL après un court délai
  const [searchInput, setSearchInput] = useState(search)
  const searchTimer = useRef(null)
  const [actionError, setActionError] = useState('')

  // Identifie la liste attendue : filtres actuels + numéro de rechargement
  const apiQuery = new URLSearchParams(Object.entries({ date, month, type, search }).filter(([, value]) => value)).toString()
  const requestKey = `${apiQuery}#${reloadKey}`
  // Dernière réponse reçue, avec la clé de la requête qui l'a produite
  const [result, setResult] = useState({ key: null, transactions: [], error: '' })
  // On charge tant que la dernière réponse ne correspond pas aux filtres actuels
  const loading = result.key !== requestKey
  const transactions = result.transactions
  const error = actionError || result.error

  // setSearchParams avec une fonction : on part toujours de l'URL la plus récente
  function updateFilter(name, value) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: true },
    )
  }

  // Recherche "debouncée" : chaque frappe relance un minuteur ; on n'appelle le serveur
  // que lorsque l'utilisateur a arrêté de taper depuis SEARCH_DELAY_MS
  function handleSearchChange(value) {
    setSearchInput(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => updateFilter('search', value.trim()), SEARCH_DELAY_MS)
  }

  // Changer de mode vide la période en cours : un jour et un mois ne se combinent pas
  function handlePeriodModeChange(mode) {
    setPeriodMode(mode)
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('date')
        next.delete('month')
        return next
      },
      { replace: true },
    )
  }

  function clearFilters() {
    clearTimeout(searchTimer.current)
    setSearchInput('')
    setSearchParams({}, { replace: true })
  }

  // Annule un minuteur en attente si on quitte la page
  useEffect(() => () => clearTimeout(searchTimer.current), [])

  // Les catégories ne changent pas : on les charge une seule fois
  useEffect(() => {
    api('/categories')
      .then((data) => setCategories(data.categories))
      .catch((err) => setActionError(err.message))
  }, [])

  // Recharge la liste à chaque changement de filtre
  useEffect(() => {
    // Si les filtres changent pendant le chargement, on ignore l'ancienne réponse
    let cancelled = false
    api(`/transactions?${apiQuery}`)
      .then((data) => !cancelled && setResult({ key: requestKey, transactions: data.transactions, error: '' }))
      .catch((err) => !cancelled && setResult((prev) => ({ ...prev, key: requestKey, error: err.message })))
    return () => {
      cancelled = true
    }
  }, [apiQuery, requestKey])

  async function handleDelete(transaction) {
    const label = `${transaction.category_name} de ${formatAmount(transaction.amount)} du ${formatDate(transaction.date)}`
    if (!window.confirm(`Supprimer « ${label} » ?`)) return
    setActionError('')
    try {
      await api(`/transactions/${transaction.id}`, { method: 'DELETE' })
      setReloadKey((key) => key + 1)
    } catch (err) {
      setActionError(err.message)
    }
  }

  function handleSaved() {
    setEditing(null)
    setReloadKey((key) => key + 1)
  }

  const hasFilters = date || month || type || search

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Transactions</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-2">
          <select
            aria-label="Filtrer par"
            value={periodMode}
            onChange={(e) => handlePeriodModeChange(e.target.value)}
            className={filterClass}
          >
            <option value="day">Jour</option>
            <option value="month">Mois</option>
          </select>
          {periodMode === 'day' ? (
            <input type="date" aria-label="Date" value={date} onChange={(e) => updateFilter('date', e.target.value)} className={filterClass} />
          ) : (
            <input type="month" aria-label="Mois" value={month} onChange={(e) => updateFilter('month', e.target.value)} className={filterClass} />
          )}
        </div>
        <select aria-label="Type" value={type} onChange={(e) => updateFilter('type', e.target.value)} className={filterClass}>
          <option value="">Revenus et dépenses</option>
          <option value="INCOME">Revenus</option>
          <option value="EXPENSE">Dépenses</option>
        </select>
        <input
          type="search"
          placeholder="Rechercher (commentaire, catégorie)…"
          aria-label="Rechercher"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={`${filterClass} min-w-0 flex-1 basis-56`}
        />
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Liste */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading && transactions.length === 0 ? (
          <p className="p-6 text-center text-slate-500">Chargement…</p>
        ) : transactions.length === 0 ? (
          <p className="p-6 text-center text-slate-500">
            {hasFilters ? 'Aucune transaction ne correspond à ces filtres.' : 'Aucune transaction pour l’instant. Ajoute la première !'}
          </p>
        ) : (
          <ul className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
            {transactions.map((transaction) => (
              <li key={transaction.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                {/* basis-48 : sur petit écran, les boutons passent à la ligne au lieu d'écraser le texte */}
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-medium text-slate-900">{transaction.category_name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {formatDate(transaction.date)}
                    {transaction.comment && ` · ${transaction.comment}`}
                  </p>
                </div>
                <p className={`font-semibold tabular-nums ${transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {transaction.type === 'INCOME' ? '+' : '−'} {formatAmount(transaction.amount)}
                </p>
                <div className="ml-auto flex gap-1">
                  <button onClick={() => setEditing(transaction)} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(transaction)} className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50">
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {transactions.length > 0 && (
        <p className="mt-2 text-right text-sm text-slate-500">
          {transactions.length} transaction{transactions.length > 1 ? 's' : ''}
        </p>
      )}

      {editing && (
        <TransactionForm
          transaction={editing === 'new' ? null : editing}
          categories={categories}
          onSaved={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
