import { authorize } from "@/lib/auth";
import { NextResponse } from 'next/server';
import { sql, updateExpiredStatuses } from '@/lib/db';
export async function GET() {
  const denied = await authorize(); if (denied) return denied;

  await updateExpiredStatuses();
  const rows = await sql`SELECT c.*,l.name AS label_name,l.color AS label_color FROM clients c LEFT JOIN labels l ON l.id=c.label_id WHERE c.status='ativo' AND c.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30 ORDER BY c.expiration_date`;
  return NextResponse.json(rows);
}
