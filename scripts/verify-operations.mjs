import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const base=process.env.CRM_TEST_URL||'http://localhost:3002';
const cookie=(await new Response(process.stdin).text()).trim();
if(!cookie)throw new Error('Informe a sessão de teste pela entrada padrão.');
const sql=neon(process.env.DATABASE_URL);
const marker=`crm-integration-test:${randomUUID()}`;
let clientId;
async function api(path,body,authenticated=true){
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(authenticated?{Cookie:cookie}:{}),Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,data:await response.json()};
}
try{
 assert.equal((await api('/api/clients',null,false)).status,401);
 const [c]=await sql`INSERT INTO clients(name,phone,plan_type,expiration_date,status,source_ref) VALUES('Teste automático CRM',${`+550${Date.now()}`},'anual',(now() AT TIME ZONE 'America/Sao_Paulo')::date,'ativo',${marker}) RETURNING id,expiration_date`;
 clientId=Number(c.id);
 let response=await api('/api/operations');assert.equal(response.status,200);
 const task=response.data.tasks.find(t=>Number(t.client_id)===clientId);assert.ok(task);
 assert.equal(response.data.reminders.filter(r=>Number(r.client_id)===clientId).length,3);
 await api('/api/operations');
 const [count]=await sql`SELECT count(*)::int AS n FROM crm_reminders WHERE client_id=${clientId}`;assert.equal(count.n,5);
 response=await api('/api/operations',{action:'task',id:task.id,stage:'pagamento',notes:'Teste automático',next_contact:null});assert.equal(response.status,200);
 response=await api('/api/operations',{action:'payment',client_id:clientId,description:marker,amount:123.45,due_date:new Date(c.expiration_date).toISOString().slice(0,10),method:'pix',paid:false});assert.equal(response.status,200);
 const [payment]=await sql`SELECT id FROM crm_payments WHERE client_id=${clientId} AND description=${marker}`;assert.ok(payment);
 assert.equal((await api('/api/operations',{action:'paid',id:payment.id})).status,200);
 const [paid]=await sql`SELECT paid_at,amount FROM crm_payments WHERE id=${payment.id}`;assert.ok(paid.paid_at);assert.equal(Number(paid.amount),123.45);
 response=await api('/api/clients/renew',{client_id:clientId,renewed_at:new Date(c.expiration_date).toISOString().slice(0,10)});assert.equal(response.status,200);
 const [state]=await sql`SELECT (SELECT stage FROM crm_tasks WHERE id=${task.id}) AS stage,(SELECT count(*) FROM crm_reminders WHERE client_id=${clientId} AND completed_at IS NULL)::int AS pending,(SELECT count(*) FROM renewals WHERE client_id=${clientId})::int AS history`;
 assert.equal(state.stage,'renovado');assert.equal(state.pending,0);assert.equal(state.history,1);
 console.log('OK: acesso protegido, geração sem duplicados, Kanban, pagamento e renovação com histórico.');
}finally{
 if(clientId){await sql.transaction([
  sql`DELETE FROM crm_payments WHERE client_id=${clientId} AND description=${marker}`,
  sql`DELETE FROM clients WHERE id=${clientId} AND source_ref=${marker}`,
 ]);console.log('Dados sintéticos do teste removidos.');}
}
