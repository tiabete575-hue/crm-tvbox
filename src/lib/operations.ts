import { sql } from './db';

export const stages = ['proxima', 'contatado', 'aguardando', 'interessado', 'pagamento', 'renovado', 'perdido'] as const;

// Reconciles once per request in one transaction; unique keys prevent duplicate tasks.
export async function syncOperations(database = sql) {
  await database.transaction([
    database`INSERT INTO crm_tasks(client_id,cycle_date)
      SELECT id,expiration_date FROM clients WHERE plan_type<>'vitalicio' AND status<>'cancelado'
      AND expiration_date<=((now() AT TIME ZONE 'America/Sao_Paulo')::date+30)
      AND expiration_date IS NOT NULL ON CONFLICT DO NOTHING`,
    database`INSERT INTO crm_reminders(client_id,cycle_date,offset_days,due_date)
      SELECT c.id,c.expiration_date,d.days,c.expiration_date-d.days
      FROM clients c CROSS JOIN (VALUES(30),(7),(0),(-3),(-15)) AS d(days)
      WHERE c.plan_type<>'vitalicio' AND c.status<>'cancelado' AND c.expiration_date IS NOT NULL
      AND c.expiration_date>=((now() AT TIME ZONE 'America/Sao_Paulo')::date-30)
      AND c.expiration_date<=((now() AT TIME ZONE 'America/Sao_Paulo')::date+30)
      ON CONFLICT DO NOTHING`,
    database`UPDATE crm_reminders r SET completed_at=now() FROM clients c
      WHERE c.id=r.client_id AND r.completed_at IS NULL AND (c.expiration_date IS DISTINCT FROM r.cycle_date OR c.plan_type='vitalicio' OR c.status='cancelado')`,
  ]);
}
