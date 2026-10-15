import { authorize } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorize(); if (denied) return denied;

  const { id } = await params; const body = await request.json();
  const rows = await sql`UPDATE labels SET name=${body.name}, color=${body.color} WHERE id=${id} RETURNING *`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorize(); if (denied) return denied;

  const { id } = await params;
  const count = Number((await sql`SELECT COUNT(*) AS count FROM clients WHERE label_id=${id}`)[0].count);
  if (count) return NextResponse.json({ error: `Não é possível excluir. Existem ${count} cliente(s) usando esta etiqueta.` }, { status: 400 });
  await sql`DELETE FROM labels WHERE id=${id}`;
  return NextResponse.json({ success: true });
}
