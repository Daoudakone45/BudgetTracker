import { Router } from "express";
import { query } from "../db.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

// Toutes les routes de ce fichier exigent d'être connecté
router.use(requireAuth);

const TYPES = ["INCOME", "EXPENSE"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
// Nombre positif avec au plus 2 décimales : "12", "12.5", "12.50"
const AMOUNT_REGEX = /^\d{1,10}(\.\d{1,2})?$/;

// Colonnes renvoyées au client, avec le nom de la catégorie (via JOIN)
export const SELECT_TRANSACTION = `
  SELECT t.id, t.type, t.amount, t.date, t.comment, t.category_id, c.name AS category_name,
         t.created_at, t.updated_at
  FROM transactions t
  JOIN categories c ON c.id = t.category_id`;

// pg renvoie les NUMERIC en texte (pour ne pas perdre de précision) : on convertit pour le client
export function toTransaction(row) {
  return { ...row, amount: Number(row.amount) };
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  // Rejette les dates impossibles comme 2026-02-31
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Vérifie le corps d'une requête POST/PUT. Renvoie { error } ou { data }.
async function validateTransaction(body) {
  const type = body?.type;
  const amount = String(body?.amount ?? "").trim();
  const date = String(body?.date ?? "");
  const categoryId = parseId(body?.categoryId);
  const comment = body?.comment ? String(body.comment).trim().slice(0, 500) : null;

  if (!TYPES.includes(type)) return { error: "Le type doit être INCOME ou EXPENSE" };
  if (!AMOUNT_REGEX.test(amount) || Number(amount) <= 0) {
    return { error: "Le montant doit être un nombre positif avec au plus 2 décimales" };
  }
  if (!isValidDate(date)) return { error: "La date doit être au format AAAA-MM-JJ" };
  if (!categoryId) return { error: "Catégorie manquante" };

  const { rows } = await query("SELECT type FROM categories WHERE id = $1", [categoryId]);
  if (!rows[0]) return { error: "Catégorie inconnue" };
  if (rows[0].type !== type) return { error: "Cette catégorie ne correspond pas au type de transaction" };

  return { data: { type, amount, date, categoryId, comment } };
}

// GET /api/transactions?month=2026-10&type=EXPENSE&search=courses  (ou ?date=2026-10-15 pour un seul jour)
router.get("/", async (req, res) => {
  const { month, date, type, search } = req.query;

  // On construit le WHERE petit à petit, chaque valeur passant par un paramètre $n
  const conditions = ["t.user_id = $1"];
  const params = [req.userId];

  if (month) {
    if (!MONTH_REGEX.test(month)) return res.status(400).json({ error: "Le mois doit être au format AAAA-MM" });
    params.push(`${month}-01`);
    conditions.push(`t.date >= $${params.length}::date AND t.date < $${params.length}::date + INTERVAL '1 month'`);
  }
  if (date) {
    if (!isValidDate(date)) return res.status(400).json({ error: "La date doit être au format AAAA-MM-JJ" });
    params.push(date);
    conditions.push(`t.date = $${params.length}`);
  }
  if (type) {
    if (!TYPES.includes(type)) return res.status(400).json({ error: "Le type doit être INCOME ou EXPENSE" });
    params.push(type);
    conditions.push(`t.type = $${params.length}`);
  }
  if (search) {
    // ILIKE = LIKE sans tenir compte des majuscules ; on cherche dans le commentaire et la catégorie
    params.push(`%${search}%`);
    conditions.push(`(t.comment ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }

  const { rows } = await query(
    `${SELECT_TRANSACTION} WHERE ${conditions.join(" AND ")} ORDER BY t.date DESC, t.id DESC`,
    params
  );
  res.json({ transactions: rows.map(toTransaction) });
});

// GET /api/transactions/:id
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Identifiant invalide" });

  const { rows } = await query(`${SELECT_TRANSACTION} WHERE t.id = $1 AND t.user_id = $2`, [id, req.userId]);
  if (!rows[0]) return res.status(404).json({ error: "Transaction introuvable" });
  res.json({ transaction: toTransaction(rows[0]) });
});

// POST /api/transactions
router.post("/", async (req, res) => {
  const { error, data } = await validateTransaction(req.body);
  if (error) return res.status(400).json({ error });

  const { rows } = await query(
    `INSERT INTO transactions (user_id, type, amount, date, category_id, comment)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [req.userId, data.type, data.amount, data.date, data.categoryId, data.comment]
  );
  const created = await query(`${SELECT_TRANSACTION} WHERE t.id = $1`, [rows[0].id]);
  res.status(201).json({ transaction: toTransaction(created.rows[0]) });
});

// PUT /api/transactions/:id
router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Identifiant invalide" });

  const { error, data } = await validateTransaction(req.body);
  if (error) return res.status(400).json({ error });

  // "AND user_id = ..." : impossible de modifier la transaction d'un autre utilisateur
  const { rowCount } = await query(
    `UPDATE transactions
     SET type = $1, amount = $2, date = $3, category_id = $4, comment = $5, updated_at = now()
     WHERE id = $6 AND user_id = $7`,
    [data.type, data.amount, data.date, data.categoryId, data.comment, id, req.userId]
  );
  if (rowCount === 0) return res.status(404).json({ error: "Transaction introuvable" });

  const updated = await query(`${SELECT_TRANSACTION} WHERE t.id = $1`, [id]);
  res.json({ transaction: toTransaction(updated.rows[0]) });
});

// DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Identifiant invalide" });

  const { rowCount } = await query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [id, req.userId]);
  if (rowCount === 0) return res.status(404).json({ error: "Transaction introuvable" });
  res.status(204).end();
});

export default router;
