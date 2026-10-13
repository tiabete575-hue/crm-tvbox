import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
export async function GET(request:NextRequest){
  const clients=await sql`SELECT c.*,l.name label_name,l.color label_color FROM clients c LEFT JOIN labels l ON l.id=c.label_id ORDER BY c.name`;
  if(request.nextUrl.searchParams.get('format')==='csv'){
    const fields=['name','phone','email','address','plan_type','plan_value','activation_date','expiration_date','status','label_name','notes','device_info'];
    const esc=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;
    const csv=[fields.join(';'),...clients.map((c:any)=>fields.map(f=>esc(c[f])).join(';'))].join('\r\n');
    return new NextResponse(`\uFEFF${csv}`,{headers:{'Content-Disposition':'attachment; filename="clientes.csv"','Content-Type':'text/csv; charset=utf-8'}});
  }
  return NextResponse.json(clients,{headers:{'Content-Disposition':'attachment; filename="clientes.json"'}});
}
