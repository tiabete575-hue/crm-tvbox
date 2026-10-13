import { NextRequest, NextResponse } from 'next/server';
import { getAutomaticLabelId, sql, updateExpiredStatuses } from '@/lib/db';
import { addMonths, format, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await updateExpiredStatuses();
    const p = request.nextUrl.searchParams;
    const search = `%${p.get('search') || ''}%`;
    const label = p.get('label_id');
    const plan = p.get('plan_type');
    const status = p.get('status');
    const rows = await sql`
      SELECT c.*, l.name AS label_name, l.color AS label_color
      FROM clients c LEFT JOIN labels l ON l.id = c.label_id
      WHERE (c.name ILIKE ${search} OR COALESCE(c.email, '') ILIKE ${search} OR c.phone ILIKE ${search})
        AND (${label}::bigint IS NULL OR EXISTS (SELECT 1 FROM client_labels cl WHERE cl.client_id=c.id AND cl.label_id=${label}::bigint))
        AND (${plan}::text IS NULL OR c.plan_type = ${plan})
        AND (${status}::text IS NULL OR c.status = ${status})
      ORDER BY c.created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !body.phone?.trim()) return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    const planType = ['anual', 'semestral', 'vitalicio'].includes(body.plan_type) ? body.plan_type : 'anual';
    let expiration = body.expiration_date || null;
    if (!expiration && body.activation_date && planType !== 'vitalicio') expiration = format(addMonths(parseISO(body.activation_date), planType === 'semestral' ? 6 : 12), 'yyyy-MM-dd');
    const labelId = body.label_id || await getAutomaticLabelId(expiration, planType);
    const rows = await sql`
      INSERT INTO clients (name, phone, email, address, plan_type, plan_value, activation_date, expiration_date, status, label_id, notes, device_info)
      VALUES (${body.name.trim()}, ${body.phone.trim()}, ${body.email || null}, ${body.address || null}, ${planType}, ${Number(body.plan_value) || 0}, ${body.activation_date || null}, ${expiration}, ${body.status || 'ativo'}, ${labelId}, ${body.notes || null}, ${body.device_info || null})
      RETURNING *`;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Já existe um cliente com este telefone' }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
  }
}
