-- Schéma de la base BudgetTracker.
-- À exécuter une fois dans Supabase > SQL Editor (on peut le relancer sans risque).

DO $$
BEGIN
  CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type transaction_type NOT NULL,
  UNIQUE (name, type)
);

CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  type        transaction_type NOT NULL,
  -- NUMERIC et non FLOAT : pas d'erreurs d'arrondi sur les montants
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions (user_id, date);

-- Bloque l'API publique automatique de Supabase sur ces tables.
-- Notre backend se connecte avec l'utilisateur "postgres", qui n'est pas concerné.
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Catégories de départ
INSERT INTO categories (name, type) VALUES
  ('Salaire', 'INCOME'),
  ('Freelance', 'INCOME'),
  ('Cadeaux', 'INCOME'),
  ('Autres revenus', 'INCOME'),
  ('Logement', 'EXPENSE'),
  ('Alimentation', 'EXPENSE'),
  ('Transport', 'EXPENSE'),
  ('Santé', 'EXPENSE'),
  ('Loisirs', 'EXPENSE'),
  ('Factures', 'EXPENSE'),
  ('Shopping', 'EXPENSE'),
  ('Autres dépenses', 'EXPENSE')
ON CONFLICT (name, type) DO NOTHING;
