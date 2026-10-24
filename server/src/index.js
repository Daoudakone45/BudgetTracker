import "dotenv/config";
import express from "express";
import cors from "cors";
import { query } from "./db.js";
import authRoutes from "./routes/auth.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET manquant dans le fichier .env");
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Vérifie que le serveur tourne et que la base répond
app.get("/api/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: "error", database: "unreachable" });
  }
});

app.use("/api/auth", authRoutes);

// Dernier filet de sécurité : toute erreur non gérée arrive ici
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
