import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';

async function handle(request:NextRequest,context:{params:Promise<{path:string[]}>}) {
  try {
    const {path}=await context.params;
    // Registration is restricted at the proxy, independently of the login screen.
    if(path.join('/')==='sign-up/email') {
      const body=await request.clone().json();
      const allowed=(process.env['CRM_ALLOWED_EMAILS']||'guigasprogramador@gmail.com').split(',').map(e=>e.trim().toLowerCase());
      if(!allowed.includes(String(body.email||'').trim().toLowerCase()))return Response.json({error:'Cadastro não autorizado.'},{status:403});
    }
    const handlers=getAuth().handler();
    const method=request.method as keyof typeof handlers;
    return handlers[method](request,context);
  }catch{return Response.json({error:'Autenticação ainda não configurada. Aguarde a ativação do administrador.'},{status:503});}
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
