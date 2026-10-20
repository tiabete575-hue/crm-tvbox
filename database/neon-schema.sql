-- Execute no SQL Editor do Neon antes de conectar o CRM em produção.
CREATE TABLE IF NOT EXISTS labels (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  source_ref TEXT,
  email TEXT,
  address TEXT,
  plan_type TEXT NOT NULL DEFAULT 'anual' CHECK (plan_type IN ('mensal', 'trimestral', 'semestral', 'anual', 'vitalicio')),
  plan_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (plan_value >= 0),
  activation_date DATE,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'cancelado')),
  label_id BIGINT REFERENCES labels(id) ON DELETE SET NULL,
  notes TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_phone_unique ON clients (regexp_replace(phone, '\\D', '', 'g')) WHERE phone IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') <> '';
CREATE UNIQUE INDEX IF NOT EXISTS clients_source_ref_unique ON clients (source_ref) WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS clients_expiration_date_idx ON clients (expiration_date);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients (status);
CREATE INDEX IF NOT EXISTS clients_label_id_idx ON clients (label_id);

CREATE TABLE IF NOT EXISTS interactions (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'anotacao' CHECK (type IN ('whatsapp', 'ligacao', 'visita', 'anotacao')),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interactions_client_id_idx ON interactions (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS renewals (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  renewed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  renewal_year SMALLINT NOT NULL CHECK (renewal_year BETWEEN 2000 AND 2200),
  previous_activation_date DATE,
  previous_expiration_date DATE,
  new_activation_date DATE NOT NULL,
  new_expiration_date DATE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('mensal', 'trimestral', 'semestral', 'anual', 'vitalicio')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS renewals_client_id_idx ON renewals (client_id, renewed_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS client_labels (
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label_id BIGINT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, label_id)
);
CREATE INDEX IF NOT EXISTS client_labels_label_id_idx ON client_labels (label_id, client_id);

INSERT INTO labels (name, color) VALUES
  ('Janeiro', '#ef4444'), ('Fevereiro', '#f97316'), ('Março', '#f59e0b'),
  ('Abril', '#eab308'), ('Maio', '#84cc16'), ('Junho', '#22c55e'),
  ('Julho', '#14b8a6'), ('Agosto', '#06b6d4'), ('Setembro', '#3b82f6'),
  ('Outubro', '#6366f1'), ('Novembro', '#8b5cf6'), ('Dezembro', '#a855f7'),
  ('Vitalício', '#10b981'), ('Novo Cliente', '#64748b')
ON CONFLICT (name) DO NOTHING;
