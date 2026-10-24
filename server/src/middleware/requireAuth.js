import jwt from "jsonwebtoken";

// Gardien des routes protégées : laisse passer seulement les requêtes avec un token valide.
export default function requireAuth(req, res, next) {
  // Le frontend envoie l'en-tête "Authorization: Bearer <token>"
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  try {
    // Vérifie la signature et la date d'expiration ; lève une erreur sinon
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = Number(payload.sub);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}
