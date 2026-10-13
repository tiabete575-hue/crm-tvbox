import { NextRequest, NextResponse } from 'next/server';
import { getAutomaticLabelId, sql } from '@/lib/db';
import { addMonths, format, parseISO } from 'date-fns';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`SELECT c.*, l.name AS label_name, l.color AS label_color FROM clients c LEFT JOIN labels l ON l.id=c.label_id WHERE c.id=${id}`;
  return rows[0] ? NextResponse.json(rows[0]) : NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const current = (await sql`SELECT * FROM clients WHERE id=${id}`)[0];
    if (!current) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    const plan = body.plan_type ?? current.plan_type;
    const activation = body.activation_date ?? current.activation_date;
    let expiration = body.expiration_date ?? current.expiration_date;
    if ((body.plan_type || body.activation_date) && activation) expiration = plan === 'vitalicio' ? null : format(addMonths(parseISO(String(activation).slice(0, 10)), plan === 'semestral' ? 6 : 12), 'yyyy-MM-dd');
    const label = body.label_id !== undefined ? body.label_id : await getAutomaticLabelId(expiration ? String(expiration).slice(0, 10) : null, plan);
    const rows = await sql`
      UPDATE clients SET name=${body.name ?? current.name}, phone=${body.phone ?? current.phone}, email=${body.email ?? current.email}, address=${body.address ?? current.address},
        plan_type=${plan}, plan_value=${body.plan_value ?? current.plan_value}, activation_date=${activation}, expiration_date=${expiration}, status=${body.status ?? current.status},
        label_id=${label}, notes=${body.notes ?? current.notes}, device_info=${body.device_info ?? current.device_info}, updated_at=now()
      WHERE id=${id} RETURNING *`;
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Já existe um cliente com este telefone' }, { status: 409 });
    console.error(error); return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM clients WHERE id=${id}`;
  return NextResponse.json({ success: true });
}
