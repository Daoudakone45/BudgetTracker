import pg from "pg";

// Un "pool" garde quelques connexions ouvertes et les réutilise entre les requêtes
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase exige une connexion chiffrée (SSL)
  ssl: { rejectUnauthorized: false },
});

// Usage : const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
// Toujours passer les valeurs via $1, $2... (jamais en les collant dans le texte) : ça empêche les injections SQL.
export const query = (text, params) => pool.query(text, params);

export default pool;
