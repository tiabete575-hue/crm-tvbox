import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
await sql`
  CREATE TABLE IF NOT EXISTS renewals (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    renewed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    renewal_year SMALLINT NOT NULL CHECK (renewal_year BETWEEN 2000 AND 2200),
    previous_activation_date DATE,
    previous_expiration_date DATE,
    new_activation_date DATE NOT NULL,
    new_expiration_date DATE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('anual', 'semestral', 'vitalicio')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS renewals_client_id_idx ON renewals (client_id, renewed_at DESC, id DESC)`;
console.log(JSON.stringify({ migrated: true }));
