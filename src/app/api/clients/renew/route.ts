import { NextRequest, NextResponse } from 'next/server';
import { getAutomaticLabelId, sql } from '@/lib/db';
import { addMonths, format, isValid, parseISO } from 'date-fns';
export async function POST(request:NextRequest){
  try{
    const body=await request.json();const id=body.client_id??body.id;if(!id)return NextResponse.json({error:'ID do cliente é obrigatório'},{status:400});
    const client=(await sql`SELECT * FROM clients WHERE id=${id}`)[0];if(!client)return NextResponse.json({error:'Cliente não encontrado'},{status:404});
    if(client.plan_type==='vitalicio')return NextResponse.json({error:'Planos vitalícios não precisam de renovação'},{status:400});
    const renewalDate=body.renewed_at?parseISO(String(body.renewed_at)):new Date();
    if(!isValid(renewalDate))return NextResponse.json({error:'Data de renovação inválida'},{status:400});
    const activation=format(renewalDate,'yyyy-MM-dd');const expiration=format(addMonths(renewalDate,client.plan_type==='semestral'?6:12),'yyyy-MM-dd');
    const label=await getAutomaticLabelId(expiration,String(client.plan_type));
    const result=await sql.transaction([
      sql`UPDATE clients SET activation_date=${activation},expiration_date=${expiration},status='ativo',label_id=${label},updated_at=now() WHERE id=${id} RETURNING *`,
      sql`INSERT INTO renewals(client_id,renewed_at,renewal_year,previous_activation_date,previous_expiration_date,new_activation_date,new_expiration_date,plan_type,notes)
          VALUES(${id},${activation},${renewalDate.getFullYear()},${client.activation_date},${client.expiration_date},${activation},${expiration},${client.plan_type},${body.notes||null}) RETURNING id`,
      sql`DELETE FROM client_labels WHERE client_id=${id}`,
      sql`INSERT INTO client_labels(client_id,label_id) VALUES(${id},${label}) ON CONFLICT DO NOTHING`,
      sql`INSERT INTO interactions(client_id,type,description) VALUES(${id},'anotacao',${`Plano renovado em ${activation}; novo vencimento: ${expiration||'vitalício'}`}) RETURNING id`
    ]);
    return NextResponse.json(result[0][0]);
  }catch(error){console.error(error);return NextResponse.json({error:'Erro ao renovar cliente'},{status:500});}
}
