import { authorize } from "@/lib/auth";
import { NextRequest,NextResponse } from 'next/server';
import { getAutomaticLabelId,sql } from '@/lib/db';
import { addMonths,format,parseISO } from 'date-fns';
export async function POST(request:NextRequest){
  const denied = await authorize(); if (denied) return denied;

  try{
    const clients=await request.json();if(!Array.isArray(clients))return NextResponse.json({error:'Formato inválido'},{status:400});let count=0,skipped=0;
    const labels=await sql`SELECT id,name FROM labels`;
    const byName=new Map(labels.map((l:any)=>[String(l.name).toLocaleLowerCase('pt-BR'),Number(l.id)]));
    for(const c of clients){
      if(!c.name?.trim()||!c.phone?.trim()){skipped++;continue;}
      const plan=['anual','semestral','vitalicio'].includes(c.plan_type)?c.plan_type:'anual';let expiration=c.expiration_date||null;
      if(!expiration&&c.activation_date&&plan!=='vitalicio')expiration=format(addMonths(parseISO(c.activation_date),plan==='semestral'?6:12),'yyyy-MM-dd');
      const label=c.label_id||(c.label_name?byName.get(String(c.label_name).toLocaleLowerCase('pt-BR')):null)||await getAutomaticLabelId(expiration,plan);
      try{await sql`INSERT INTO clients(name,phone,email,address,plan_type,plan_value,activation_date,expiration_date,status,label_id,notes,device_info) VALUES(${c.name.trim()},${c.phone.trim()},${c.email||null},${c.address||null},${plan},${Number(String(c.plan_value||0).replace(',','.'))||0},${c.activation_date||null},${expiration},${c.status||'ativo'},${label},${c.notes||null},${c.device_info||null})`;count++;}catch(error:any){if(error?.code==='23505')skipped++;else throw error;}
    }
    return NextResponse.json({success:true,count,skipped});
  }catch(error){console.error(error);return NextResponse.json({error:'Erro ao importar clientes'},{status:500});}
}
