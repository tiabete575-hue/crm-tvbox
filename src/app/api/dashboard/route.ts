import { NextResponse } from 'next/server';
import { sql, updateExpiredStatuses } from '@/lib/db';

export async function GET() {
  try {
    await updateExpiredStatuses();
    const [counts, revenue, plans, expirations, recent] = await Promise.all([
      sql`SELECT COUNT(*)::int total_clients, COUNT(*) FILTER(WHERE status='ativo')::int active_clients, COUNT(*) FILTER(WHERE status='vencido')::int expired_clients, COUNT(*) FILTER(WHERE plan_type='vitalicio')::int lifetime_clients, COUNT(*) FILTER(WHERE status='ativo' AND expiration_date>=date_trunc('month',CURRENT_DATE) AND expiration_date<date_trunc('month',CURRENT_DATE)+interval '1 month')::int expiring_this_month FROM clients`,
      sql`SELECT COALESCE(SUM(CASE WHEN plan_type='anual' THEN plan_value/12 WHEN plan_type='semestral' THEN plan_value/6 ELSE 0 END),0)::float total FROM clients WHERE status='ativo'`,
      sql`SELECT plan_type,COUNT(*)::int count FROM clients GROUP BY plan_type`,
      sql`SELECT to_char(expiration_date,'YYYY-MM') AS "month",COUNT(*)::int AS "count" FROM clients WHERE expiration_date>=date_trunc('month',CURRENT_DATE) AND expiration_date<date_trunc('month',CURRENT_DATE)+interval '12 months' GROUP BY 1 ORDER BY 1`,
      sql`SELECT c.*,l.name label_name,l.color label_color FROM clients c LEFT JOIN labels l ON l.id=c.label_id ORDER BY c.created_at DESC LIMIT 5`
    ]);
    return NextResponse.json({...counts[0],total_monthly_revenue:revenue[0].total,clients_by_plan:plans,expirations_by_month:expirations,recent_clients:recent});
  } catch(error){console.error(error);return NextResponse.json({error:'Erro ao buscar dados do dashboard'},{status:500});}
}
