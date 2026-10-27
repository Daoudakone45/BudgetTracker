import { Router } from "express";
import { query } from "../db.js";
import requireAuth from "../middleware/requireAuth.js";
import { MONTH_REGEX, SELECT_TRANSACTION, isValidDate, toTransaction } from "./transactions.js";

const router = Router();

const RECENT_LIMIT = 5;

// Condition "la transaction est dans la période".
// $2 = début de la période ("2026-10-15"), $3 = sa durée ("1 day" ou "1 month").
// Si $2 vaut NULL (aucune période demandée), tout passe.
const IN_PERIOD = "($2::date IS NULL OR (t.date >= $2::date AND t.date < $2::date + $3::interval))";

// GET /api/summary?date=2026-10-15 (un jour) ou ?month=2026-10 (un mois)
// Tout ce qu'il faut au tableau de bord, en un seul appel
router.get("/", requireAuth, async (req, res) => {
  const { month, date } = req.query;
  if (month && !MONTH_REGEX.test(month)) {
    return res.status(400).json({ error: "Le mois doit être au format AAAA-MM" });
  }
  if (date && !isValidDate(date)) {
    return res.status(400).json({ error: "La date doit être au format AAAA-MM-JJ" });
  }

  let period = [null, null];
  if (date) period = [date, "1 day"];
  else if (month) period = [`${month}-01`, "1 month"];
  const params = [req.userId, ...period];

  // Une seule lecture de la table pour les trois totaux :
  // CASE WHEN choisit, ligne par ligne, ce qui entre dans chaque SUM.
  // COALESCE(..., 0) remplace NULL par 0 quand il n'y a aucune transaction.
  const totalsQuery = query(
    `SELECT
       COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END), 0) AS balance,
       COALESCE(SUM(CASE WHEN t.type = 'INCOME'  AND ${IN_PERIOD} THEN t.amount END), 0) AS income,
       COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' AND ${IN_PERIOD} THEN t.amount END), 0) AS expense
     FROM transactions t
     WHERE t.user_id = $1`,
    params
  );

  // GROUP BY regroupe les dépenses par catégorie, puis SUM additionne chaque groupe
  const byCategoryQuery = query(
    `SELECT c.name AS category, SUM(t.amount) AS total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.type = 'EXPENSE' AND ${IN_PERIOD}
     GROUP BY c.name
     ORDER BY total DESC`,
    params
  );

  const recentQuery = query(
    `${SELECT_TRANSACTION} WHERE t.user_id = $1 ORDER BY t.date DESC, t.id DESC LIMIT ${RECENT_LIMIT}`,
    [req.userId]
  );

  // Les trois requêtes partent en même temps au lieu de s'attendre l'une l'autre
  const [totals, byCategory, recent] = await Promise.all([totalsQuery, byCategoryQuery, recentQuery]);
  const { balance, income, expense } = totals.rows[0];

  res.json({
    date: date || null,
    month: date ? null : month || null,
    balance: Number(balance),
    income: Number(income),
    expense: Number(expense),
    byCategory: byCategory.rows.map((row) => ({ category: row.category, total: Number(row.total) })),
    recent: recent.rows.map(toTransaction),
  });
});

export default router;
