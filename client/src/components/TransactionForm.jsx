import { useState } from 'react'
import { api } from '../api.js'
import { today } from '../format.js'
import Modal from './Modal.jsx'

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'

// Formulaire d'ajout (transaction absente) ou de modification (transaction fournie)
export default function TransactionForm({ transaction, categories, onSaved, onClose }) {
  const isEdit = Boolean(transaction)
  const [form, setForm] = useState(() => ({
    type: transaction?.type ?? 'EXPENSE',
    amount: transaction ? String(transaction.amount) : '',
    date: transaction?.date ?? today(),
    categoryId: transaction ? String(transaction.category_id) : '',
    comment: transaction?.comment ?? '',
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Seules les catégories du type choisi sont proposées
  const availableCategories = categories.filter((category) => category.type === form.type)

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  function handleTypeChange(type) {
    // La catégorie choisie n'existe plus pour l'autre type : on la vide
    setForm({ ...form, type, categoryId: '' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const body = { ...form, categoryId: Number(form.categoryId) }
    try {
      if (isEdit) {
        await api(`/transactions/${transaction.id}`, { method: 'PUT', body })
      } else {
        await api('/transactions', { method: 'POST', body })
      }
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Modifier la transaction' : 'Nouvelle transaction'} onClose={onClose}>
      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Choix du type : deux boutons côte à côte */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          {[
            { value: 'EXPENSE', label: 'Dépense', active: 'bg-white text-red-600 shadow-sm' },
            { value: 'INCOME', label: 'Revenu', active: 'bg-white text-emerald-700 shadow-sm' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleTypeChange(option.value)}
              aria-pressed={form.type === option.value}
              className={`rounded-md py-2 text-sm font-medium ${form.type === option.value ? option.active : 'text-slate-600'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Montant</span>
          <input name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required autoFocus
            value={form.amount} onChange={handleChange} className={inputClass} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Date</span>
          <input name="date" type="date" required value={form.date} onChange={handleChange} className={inputClass} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Catégorie</span>
          <select name="categoryId" required value={form.categoryId} onChange={handleChange} className={inputClass}>
            <option value="" disabled>Choisir une catégorie</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Commentaire (facultatif)</span>
          <input name="comment" maxLength={500} value={form.comment} onChange={handleChange} className={inputClass} />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
