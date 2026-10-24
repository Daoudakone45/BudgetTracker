import pg from "pg";

// Les colonnes DATE restent du texte "2026-10-15" au lieu d'un objet Date JavaScript,
// qui serait décalé par le fuseau horaire (ex. "2026-10-14T22:00:00Z").
const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value) => value);

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
