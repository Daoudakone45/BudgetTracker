import { Router } from "express";
import { query } from "../db.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

// GET /api/categories — toutes les catégories (pour remplir le formulaire)
router.get("/", requireAuth, async (req, res) => {
  const { rows } = await query("SELECT id, name, type FROM categories ORDER BY type, name");
  res.json({ categories: rows });
});

export default router;
