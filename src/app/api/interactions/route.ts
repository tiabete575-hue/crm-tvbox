import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
export async function POST(request: NextRequest) {
  const body=await request.json();
  if(!body.client_id||!body.type||!body.description) return NextResponse.json({error:'Dados incompletos para a interação'},{status:400});
  const rows=await sql`INSERT INTO interactions (client_id,type,description) VALUES (${body.client_id},${body.type},${body.description}) RETURNING *`;
  return NextResponse.json(rows[0],{status:201});
}
