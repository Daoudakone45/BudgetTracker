import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { formatAmount, formatRoundAmount } from '../format.js'

// Chart.js ne charge que les morceaux qu'on enregistre : barres, axes, infobulle
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)
// Même police que le reste de l'application (Chart.js utilise Helvetica par défaut)
ChartJS.defaults.font.family = getComputedStyle(document.body).fontFamily

// Une seule couleur : la catégorie est déjà écrite sur l'axe, la longueur de la barre porte le montant
const BAR_COLOR = '#2a78d6'
const BAR_HOVER_COLOR = '#1c5cab'
const GRID_COLOR = '#e2e8f0'
const AXIS_TEXT_COLOR = '#64748b'
const ROW_HEIGHT = 36

// Barres horizontales triées : plus lisible qu'un camembert pour comparer plusieurs catégories
export default function ExpenseChart({ data }) {
  const total = data.reduce((sum, row) => sum + row.total, 0)
  const share = (value) => Math.round((value / total) * 100)

  const chartData = {
    labels: data.map((row) => row.category),
    datasets: [
      {
        label: 'Dépenses',
        data: data.map((row) => row.total),
        backgroundColor: BAR_COLOR,
        hoverBackgroundColor: BAR_HOVER_COLOR,
        borderRadius: 4,
        borderSkipped: 'start', // coins arrondis seulement au bout de la barre
        maxBarThickness: 20,
      },
    ],
  }

  const options = {
    indexAxis: 'y', // barres horizontales
    responsive: true,
    maintainAspectRatio: false,
    // L'infobulle s'affiche dès qu'on survole la ligne, pas seulement la barre (cible plus grande)
    interaction: { mode: 'index', axis: 'y', intersect: false },
    plugins: {
      tooltip: {
        displayColors: false,
        callbacks: {
          label: (context) => `${formatAmount(context.parsed.x)} · ${share(context.parsed.x)} % des dépenses`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: GRID_COLOR },
        ticks: { color: AXIS_TEXT_COLOR, maxTicksLimit: 5, callback: (value) => formatRoundAmount(value) },
      },
      y: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: '#334155', font: { size: 13 } },
      },
    },
  }

  return (
    <div>
      <div style={{ height: data.length * ROW_HEIGHT + 40 }}>
        <Bar
          data={chartData}
          options={options}
          role="img"
          aria-label={`Dépenses par catégorie : ${data.map((row) => `${row.category} ${formatAmount(row.total)}`).join(', ')}`}
        />
      </div>

      {/* Les mêmes données en tableau : lisible sans survoler, et accessible aux lecteurs d'écran */}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-600 hover:text-slate-900">Voir le détail en tableau</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-1.5 font-medium">Catégorie</th>
              <th className="py-1.5 text-right font-medium">Montant</th>
              <th className="py-1.5 text-right font-medium">Part</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((row) => (
              <tr key={row.category} className="border-b border-slate-100 text-slate-700">
                <td className="py-1.5">{row.category}</td>
                <td className="py-1.5 text-right">{formatAmount(row.total)}</td>
                <td className="py-1.5 text-right">{share(row.total)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
