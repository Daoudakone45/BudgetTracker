import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

// Plus ce nombre est grand, plus le hachage est lent (donc plus dur à attaquer par force brute)
const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(userId) {
  // "sub" (subject) = à qui appartient le token
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/auth/register — créer un compte
router.post("/register", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const name = req.body?.name ? String(req.body.name).trim() : null;

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Email invalide" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const { rows } = await query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, passwordHash, name]
    );
    const user = rows[0];
    res.status(201).json({ token: createToken(user.id), user });
  } catch (err) {
    // 23505 = violation de contrainte UNIQUE : l'email existe déjà
    if (err.code === "23505") {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
    }
    throw err;
  }
});

// POST /api/auth/login — se connecter
router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  const { rows } = await query("SELECT id, email, name, password_hash FROM users WHERE email = $1", [email]);
  const user = rows[0];

  // Même message que l'email soit inconnu ou le mot de passe faux :
  // on ne révèle pas à un attaquant quels emails ont un compte.
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect" });
  }

  res.json({
    token: createToken(user.id),
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// GET /api/auth/me — qui suis-je ? (route protégée)
router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await query("SELECT id, email, name, created_at FROM users WHERE id = $1", [req.userId]);
  if (!rows[0]) {
    return res.status(404).json({ error: "Utilisateur introuvable" });
  }
  res.json({ user: rows[0] });
});

export default router;
