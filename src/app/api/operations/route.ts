import { authorize } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { stages, syncOperations } from '@/lib/operations';

export async function GET() {
  const denied = await authorize(); if (denied) return denied;

  try {
    await syncOperations();
    const [clients, tasks, reminders, payments, templates, monthly] = await Promise.all([
      sql`SELECT c.id,c.name,c.phone,c.expiration_date,c.plan_type,c.plan_value,c.status,
       (c.expiration_date-(now() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS days_left
       FROM clients c ORDER BY c.expiration_date NULLS LAST,c.name`,
      sql`SELECT t.*,c.name,c.phone,c.expiration_date FROM crm_tasks t JOIN clients c ON c.id=t.client_id
       WHERE (t.cycle_date=c.expiration_date AND c.status<>'cancelado' AND c.plan_type<>'vitalicio') OR t.stage='renovado'
       ORDER BY t.cycle_date,t.id`,
      sql`SELECT r.*,c.name,c.phone,c.expiration_date FROM crm_reminders r JOIN clients c ON c.id=r.client_id
       WHERE r.completed_at IS NULL AND r.due_date<=(now() AT TIME ZONE 'America/Sao_Paulo')::date
       ORDER BY r.due_date,r.id`,
      sql`SELECT p.*,c.name FROM crm_payments p LEFT JOIN clients c ON c.id=p.client_id ORDER BY p.due_date DESC,p.id DESC`,
      sql`SELECT * FROM crm_templates ORDER BY id`,
      sql`SELECT to_char(paid_at,'YYYY-MM') AS month,sum(amount)::float AS total FROM crm_payments WHERE paid_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
    ]);
    return NextResponse.json({ clients,tasks,reminders,payments,templates,monthly }, {headers:{'Cache-Control':'no-store'}});
  } catch(error) { console.error(error); return NextResponse.json({error:'Não foi possível carregar as operações.'},{status:500}); }
}

export async function POST(request: NextRequest) {
  const denied = await authorize(); if (denied) return denied;

  try {
    const body=await request.json();
    if(body.action==='task' && stages.includes(body.stage) && Number.isSafeInteger(Number(body.id))) {
      if(body.stage==='renovado') return NextResponse.json({error:'Use Confirmar renovação para atualizar o plano e o histórico.'},{status:400});
      const rows=await sql`UPDATE crm_tasks SET stage=${body.stage},next_contact=${body.next_contact||null},notes=${String(body.notes||'').slice(0,5000)},updated_at=now() WHERE id=${body.id} AND stage<>'renovado' RETURNING id`;
      if(!rows.length) return NextResponse.json({error:'Atendimento não encontrado ou já renovado.'},{status:404});
    } else if(body.action==='reminder') {
      await sql`UPDATE crm_reminders SET completed_at=now() WHERE id=${body.id}`;
    } else if(body.action==='payment') {
      const amount=Number(body.amount);
      if(!Number.isFinite(amount)||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(body.due_date||'')||!['pix','dinheiro','cartao','transferencia','outro'].includes(body.method)||!String(body.description||'').trim()) return NextResponse.json({error:'Preencha descrição, valor positivo, data e forma de pagamento.'},{status:400});
      await sql`INSERT INTO crm_payments(client_id,description,amount,due_date,paid_at,method) VALUES(${body.client_id||null},${String(body.description).slice(0,500)},${amount},${body.due_date},${body.paid?body.due_date:null},${body.method})`;
    } else if(body.action==='paid') {
      await sql`UPDATE crm_payments SET paid_at=(now() AT TIME ZONE 'America/Sao_Paulo')::date WHERE id=${body.id} AND paid_at IS NULL`;
    } else if(body.action==='template' && String(body.body||'').trim()) {
      await sql`UPDATE crm_templates SET body=${String(body.body).slice(0,5000)} WHERE id=${body.id}`;
    } else return NextResponse.json({error:'Operação inválida.'},{status:400});
    return NextResponse.json({success:true});
  }catch(error){console.error(error);return NextResponse.json({error:'Não foi possível salvar. Confira os dados.'},{status:400});}
}
