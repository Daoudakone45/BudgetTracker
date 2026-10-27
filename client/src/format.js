// Devise affichée partout dans l'application (code ISO : 'EUR', 'XOF', 'CAD'...)
const CURRENCY = 'EUR'
const LOCALE = 'fr-FR'

const amountFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })
const roundAmountFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })

// 1234.5 → "1 234,50 €"
export function formatAmount(value) {
  return amountFormatter.format(value)
}

// 1500 → "1 500 €" (sans centimes, pour les axes de graphique)
export function formatRoundAmount(value) {
  return roundAmountFormatter.format(value)
}

// "2026-10-15" → "15 oct. 2026"
// On construit la date à midi pour éviter tout décalage de fuseau horaire
export function formatDate(isoDate) {
  return dateFormatter.format(new Date(`${isoDate}T12:00:00`))
}

// Transforme un objet Date en "AAAA-MM-JJ", dans le fuseau de l'utilisateur
// (toISOString() donnerait la date UTC, qui peut être celle d'hier ou de demain)
function toIsoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Date du jour au format "AAAA-MM-JJ"
export function today() {
  return toIsoDate(new Date())
}

// addDays("2026-03-01", -1) → "2026-02-28" (gère les fins de mois et les années bissextiles)
export function addDays(isoDate, delta) {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + delta)
  return toIsoDate(date)
}
