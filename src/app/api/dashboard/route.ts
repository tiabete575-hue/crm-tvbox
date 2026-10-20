import { authorize } from "@/lib/auth";
import { NextResponse } from 'next/server';
import { sql, updateExpiredStatuses } from '@/lib/db';
import { syncOperations } from '@/lib/operations';

export async function GET() {
  const denied = await authorize(); if (denied) return denied;

  try {
    await Promise.all([updateExpiredStatuses(), syncOperations().catch(() => undefined)]);
    const [counts, revenue, cashflow, plans, expirations, kanban, urgent, recent] = await Promise.all([
      sql`SELECT
        COUNT(*)::int AS total_clients,
        COUNT(*) FILTER(WHERE status='ativo')::int AS active_clients,
        COUNT(*) FILTER(WHERE status='vencido')::int AS expired_clients,
        COUNT(*) FILTER(WHERE plan_type='vitalicio')::int AS lifetime_clients,
        COUNT(*) FILTER(WHERE status='ativo' AND plan_type<>'vitalicio' AND expiration_date>=date_trunc('month',CURRENT_DATE) AND expiration_date<date_trunc('month',CURRENT_DATE)+interval '1 month')::int AS expiring_this_month,
        COUNT(*) FILTER(WHERE status<>'cancelado' AND plan_type<>'vitalicio' AND expiration_date>=CURRENT_DATE AND expiration_date<=CURRENT_DATE+7)::int AS expiring_7_days
      FROM clients`,
      sql`SELECT COALESCE(SUM(
        CASE
          WHEN plan_type='mensal' THEN plan_value
          WHEN plan_type='trimestral' THEN plan_value/3
          WHEN plan_type='semestral' THEN plan_value/6
          WHEN plan_type='anual' THEN plan_value/12
          ELSE 0
        END
      ), 0)::float AS total FROM clients WHERE status='ativo'`,
      sql`SELECT
        COALESCE(SUM(amount) FILTER(WHERE paid_at IS NOT NULL AND paid_at>=date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)), 0)::float AS received_this_month,
        COALESCE(SUM(amount) FILTER(WHERE paid_at IS NULL AND due_date>=(now() AT TIME ZONE 'America/Sao_Paulo')::date), 0)::float AS pending_this_month,
        COALESCE(SUM(amount) FILTER(WHERE paid_at IS NULL AND due_date<(now() AT TIME ZONE 'America/Sao_Paulo')::date), 0)::float AS overdue_total,
        (SELECT COUNT(*)::int FROM crm_reminders WHERE completed_at IS NULL AND due_date<=(now() AT TIME ZONE 'America/Sao_Paulo')::date) AS pending_reminders_count
      FROM crm_payments`,
      sql`SELECT plan_type, COUNT(*)::int AS count FROM clients GROUP BY plan_type ORDER BY count DESC`,
      sql`SELECT to_char(expiration_date,'YYYY-MM') AS "month", COUNT(*)::int AS "count" FROM clients WHERE expiration_date>=date_trunc('month',CURRENT_DATE) AND expiration_date<date_trunc('month',CURRENT_DATE)+interval '12 months' GROUP BY 1 ORDER BY 1`,
      sql`SELECT t.stage, COUNT(*)::int AS count, COALESCE(SUM(c.plan_value), 0)::float AS total_value
        FROM crm_tasks t JOIN clients c ON c.id=t.client_id
        WHERE (t.cycle_date=c.expiration_date AND c.status<>'cancelado' AND c.plan_type<>'vitalicio') OR t.stage='renovado'
        GROUP BY t.stage`,
      sql`SELECT c.*, l.name AS label_name, l.color AS label_color,
        (c.expiration_date-(now() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS days_left
        FROM clients c LEFT JOIN labels l ON l.id=c.label_id
        WHERE c.plan_type<>'vitalicio' AND c.status<>'cancelado' AND c.expiration_date IS NOT NULL
          AND c.expiration_date <= ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 7)
        ORDER BY c.expiration_date ASC LIMIT 8`,
      sql`SELECT c.*, l.name AS label_name, l.color AS label_color,
        (c.expiration_date-(now() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS days_left
        FROM clients c LEFT JOIN labels l ON l.id=c.label_id
        ORDER BY c.created_at DESC LIMIT 6`
    ]);

    return NextResponse.json({
      ...counts[0],
      total_monthly_revenue: revenue[0]?.total || 0,
      received_this_month: cashflow[0]?.received_this_month || 0,
      pending_this_month: cashflow[0]?.pending_this_month || 0,
      overdue_total: cashflow[0]?.overdue_total || 0,
      pending_reminders_count: cashflow[0]?.pending_reminders_count || 0,
      clients_by_plan: plans,
      expirations_by_month: expirations,
      kanban_summary: kanban,
      urgent_renewals: urgent,
      recent_clients: recent,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 });
  }
}
