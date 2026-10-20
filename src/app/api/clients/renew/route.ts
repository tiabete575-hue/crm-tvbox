import { authorize } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { ensurePlanTypesSupport, getAutomaticLabelId, getPlanMonths, sql, VALID_PLAN_TYPES } from '@/lib/db';
import { addMonths, format, isValid, parseISO } from 'date-fns';

export async function POST(request: NextRequest) {
  const denied = await authorize(); if (denied) return denied;

  try {
    await ensurePlanTypesSupport();
    const body = await request.json();
    const id = body.client_id ?? body.id;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const client = (await sql`SELECT * FROM clients WHERE id=${id}`)[0];
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    const nextPlanType = body.plan_type && (VALID_PLAN_TYPES as readonly string[]).includes(body.plan_type)
      ? String(body.plan_type)
      : String(client.plan_type);

    if (nextPlanType === 'vitalicio') {
      return NextResponse.json({ error: 'Planos vitalícios não precisam de renovação' }, { status: 400 });
    }

    const renewalDate = body.renewed_at ? parseISO(String(body.renewed_at)) : new Date();
    if (!isValid(renewalDate)) return NextResponse.json({ error: 'Data de renovação inválida' }, { status: 400 });

    const activation = format(renewalDate, 'yyyy-MM-dd');
    const expiration = format(addMonths(renewalDate, getPlanMonths(nextPlanType)), 'yyyy-MM-dd');
    const nextPlanValue = body.plan_value !== undefined && Number.isFinite(Number(body.plan_value)) && Number(body.plan_value) >= 0
      ? Number(body.plan_value)
      : Number(client.plan_value || 0);
    const label = await getAutomaticLabelId(expiration, nextPlanType);

    const registerPayment = Boolean(body.register_payment);
    const paymentAmount = Number(body.payment_amount ?? nextPlanValue);
    const paymentMethod = ['pix', 'dinheiro', 'cartao', 'transferencia', 'outro'].includes(body.payment_method)
      ? String(body.payment_method)
      : 'pix';
    const paymentPaid = body.payment_paid !== undefined ? Boolean(body.payment_paid) : true;
    const paymentDesc = String(body.payment_description || `Renovação de plano (${nextPlanType})`).slice(0, 500);

    const queries = [
      sql`UPDATE clients SET activation_date=${activation}, expiration_date=${expiration}, plan_type=${nextPlanType}, plan_value=${nextPlanValue}, status='ativo', label_id=${label}, updated_at=now() WHERE id=${id} RETURNING *`,
      sql`INSERT INTO renewals(client_id, renewed_at, renewal_year, previous_activation_date, previous_expiration_date, new_activation_date, new_expiration_date, plan_type, notes)
          VALUES(${id}, ${activation}, ${renewalDate.getFullYear()}, ${client.activation_date}, ${client.expiration_date}, ${activation}, ${expiration}, ${nextPlanType}, ${body.notes || null}) RETURNING id`,
      sql`DELETE FROM client_labels WHERE client_id=${id}`,
      sql`INSERT INTO client_labels(client_id, label_id) VALUES(${id}, ${label}) ON CONFLICT DO NOTHING`,
      sql`INSERT INTO interactions(client_id, type, description) VALUES(${id}, 'anotacao', ${`Plano (${nextPlanType}) renovado em ${activation}; novo vencimento: ${expiration}${registerPayment && paymentAmount > 0 ? ` · Financeiro: R$ ${paymentAmount.toFixed(2)} (${paymentMethod.toUpperCase()})` : ''}`}) RETURNING id`,
      sql`UPDATE crm_tasks SET stage='renovado', updated_at=now() WHERE client_id=${id} AND cycle_date=${client.expiration_date}`,
      sql`UPDATE crm_reminders SET completed_at=now() WHERE client_id=${id} AND completed_at IS NULL`,
    ];

    if (registerPayment && Number.isFinite(paymentAmount) && paymentAmount > 0) {
      queries.push(
        sql`INSERT INTO crm_payments(client_id, description, amount, due_date, paid_at, method)
            VALUES(${id}, ${paymentDesc}, ${paymentAmount}, ${activation}, ${paymentPaid ? activation : null}, ${paymentMethod})`
      );
    }

    const result = await sql.transaction(queries);
    return NextResponse.json(result[0][0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao renovar cliente' }, { status: 500 });
  }
}
