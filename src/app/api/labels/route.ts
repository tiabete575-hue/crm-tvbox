import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const rows = await sql`SELECT l.*, COUNT(cl.client_id)::int AS client_count FROM labels l LEFT JOIN client_labels cl ON cl.label_id=l.id GROUP BY l.id ORDER BY l.id`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.color) return NextResponse.json({ error: 'Nome e cor são obrigatórios' }, { status: 400 });
    const rows = await sql`INSERT INTO labels (name,color) VALUES (${body.name},${body.color}) RETURNING *`;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Já existe uma etiqueta com este nome' }, { status: 409 });
    return NextResponse.json({ error: 'Erro ao criar etiqueta' }, { status: 500 });
  }
}
