// Devise affichée partout dans l'application (code ISO : 'EUR', 'XOF', 'CAD'...)
const CURRENCY = 'EUR'
const LOCALE = 'fr-FR'

const amountFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })

// 1234.5 → "1 234,50 €"
export function formatAmount(value) {
  return amountFormatter.format(value)
}

// "2026-10-15" → "15 oct. 2026"
// On construit la date à midi pour éviter tout décalage de fuseau horaire
export function formatDate(isoDate) {
  return dateFormatter.format(new Date(`${isoDate}T12:00:00`))
}

// "2026-10" → "octobre 2026"
export function formatMonth(month) {
  return monthFormatter.format(new Date(`${month}-01T12:00:00`))
}

// Date du jour au format "AAAA-MM-JJ", dans le fuseau de l'utilisateur
// (toISOString() donnerait la date UTC, qui peut être celle d'hier ou de demain)
export function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// Mois en cours au format "AAAA-MM"
export function currentMonth() {
  return today().slice(0, 7)
}
