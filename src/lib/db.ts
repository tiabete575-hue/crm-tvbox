import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada. Execute `neon link` ou defina .env.local.');
}

export const sql = neon(process.env.DATABASE_URL);

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export async function updateExpiredStatuses() {
  await sql`
    UPDATE clients
    SET status = 'vencido', updated_at = now()
    WHERE expiration_date < CURRENT_DATE
      AND status = 'ativo'
      AND plan_type <> 'vitalicio'
  `;
}

export async function getAutomaticLabelId(expirationDate: string | null, planType: string) {
  const labelName = planType === 'vitalicio'
    ? 'Vitalício'
    : expirationDate
      ? MONTH_LABELS[Number(expirationDate.slice(5, 7)) - 1]
      : null;

  if (!labelName) return null;
  const rows = await sql`SELECT id FROM labels WHERE name = ${labelName} LIMIT 1`;
  return rows[0]?.id ? Number(rows[0].id) : null;
}
