import "dotenv/config";
import express from "express";
import cors from "cors";
import { query } from "./db.js";

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

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
