import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let databaseClient: NeonQueryFunction<false, false> | undefined;
let schemaChecked = false;

function getDatabaseClient() {
  if (databaseClient) return databaseClient;

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada no ambiente de execução.');
  }

  databaseClient = neon(databaseUrl);
  return databaseClient;
}

export const sql = new Proxy((() => undefined) as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, argumentsList) {
    return Reflect.apply(getDatabaseClient(), undefined, argumentsList);
  },
  get(_target, property) {
    return Reflect.get(getDatabaseClient(), property);
  },
});

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const VALID_PLAN_TYPES = ['mensal', 'trimestral', 'semestral', 'anual', 'vitalicio'] as const;

export function getPlanMonths(planType: string): number {
  switch (planType) {
    case 'mensal':
      return 1;
    case 'trimestral':
      return 3;
    case 'semestral':
      return 6;
    case 'anual':
    default:
      return 12;
  }
}

export async function ensurePlanTypesSupport() {
  if (schemaChecked) return;
  schemaChecked = true;
  try {
    await sql`ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_type_check`;
    await sql`ALTER TABLE clients ADD CONSTRAINT clients_plan_type_check CHECK (plan_type IN ('mensal', 'trimestral', 'semestral', 'anual', 'vitalicio'))`;
    await sql`ALTER TABLE renewals DROP CONSTRAINT IF EXISTS renewals_plan_type_check`;
    await sql`ALTER TABLE renewals ADD CONSTRAINT renewals_plan_type_check CHECK (plan_type IN ('mensal', 'trimestral', 'semestral', 'anual', 'vitalicio'))`;
  } catch {
    // Ignore if constraints are already updated or user has restricted DDL permissions
  }
}

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
