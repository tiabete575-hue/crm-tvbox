CREATE TABLE IF NOT EXISTS crm_tasks (
 id BIGSERIAL PRIMARY KEY,
 client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
 cycle_date DATE NOT NULL,
 stage TEXT NOT NULL DEFAULT 'proxima' CHECK(stage IN ('proxima','contatado','aguardando','interessado','pagamento','renovado','perdido')),
 next_contact DATE,
 notes TEXT NOT NULL DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(client_id,cycle_date)
);
CREATE TABLE IF NOT EXISTS crm_reminders (
 id BIGSERIAL PRIMARY KEY,
 client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
 cycle_date DATE NOT NULL,
 offset_days INT NOT NULL,
 due_date DATE NOT NULL,
 completed_at TIMESTAMPTZ,
 UNIQUE(client_id,cycle_date,offset_days)
);
CREATE INDEX IF NOT EXISTS crm_reminders_due ON crm_reminders(due_date) WHERE completed_at IS NULL;
CREATE TABLE IF NOT EXISTS crm_payments (
 id BIGSERIAL PRIMARY KEY,
 client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
 description TEXT NOT NULL,
 amount NUMERIC(12,2) NOT NULL CHECK(amount>0),
 due_date DATE NOT NULL,
 paid_at DATE,
 method TEXT NOT NULL CHECK(method IN ('pix','dinheiro','cartao','transferencia','outro')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_payments_due ON crm_payments(due_date);
CREATE TABLE IF NOT EXISTS crm_templates (
 id BIGSERIAL PRIMARY KEY,
 name TEXT NOT NULL UNIQUE,
 body TEXT NOT NULL
);
INSERT INTO crm_templates(name,body) VALUES
 ('Renovação próxima','Olá, {nome}! Seu plano vence em {vencimento}. Gostaria de renovar?'),
 ('Vencimento hoje','Olá, {nome}! Seu plano vence hoje. Posso ajudar com a renovação?'),
 ('Plano vencido','Olá, {nome}! Seu plano venceu em {vencimento}. Quer conversar sobre a renovação?'),
 ('Renovação concluída','Olá, {nome}! Sua renovação foi concluída. Seu novo vencimento é {vencimento}. Obrigado!')
ON CONFLICT(name) DO NOTHING;
