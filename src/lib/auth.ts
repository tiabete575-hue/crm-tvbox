import { createNeonAuth } from '@neondatabase/auth/next/server';
import { NextResponse } from 'next/server';

export function getAuth() {
  const baseUrl=process.env['NEON_AUTH_BASE_URL'];
  const secret=process.env['NEON_AUTH_COOKIE_SECRET'];
  if(!baseUrl||!secret||secret.length<32) throw new Error('Configure a autenticação do CRM no ambiente.');
  return createNeonAuth({baseUrl,cookies:{secret,sessionDataTtl:1}});
}

export async function authorize() {
  try {
    const {data:session}=await getAuth().getSession();
    if(!session?.user) return NextResponse.json({error:'Entre na sua conta para continuar.'},{status:401});
    const allowed=(process.env['CRM_ALLOWED_EMAILS']||'guigasprogramador@gmail.com').split(',').map(e=>e.trim().toLowerCase());
    if(!session.user.emailVerified || !allowed.includes(session.user.email.toLowerCase())) return NextResponse.json({error:'Conta sem acesso autorizado. Verifique seu e-mail.'},{status:403});
    return null;
  }catch{return NextResponse.json({error:'Autenticação indisponível. Contate o administrador.'},{status:503});}
}
