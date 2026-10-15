import { authorize } from "@/lib/auth";
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const denied = await authorize(); if (denied) return denied;

  const { clientId } = await params;
  const id = Number(clientId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 });
  }

  const rows = await sql`
    SELECT * FROM renewals
    WHERE client_id = ${id}
    ORDER BY renewed_at DESC, id DESC
  `;
  return NextResponse.json(rows);
}
