import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';

export async function proxy(request:NextRequest) {
  if(!['GET','HEAD','OPTIONS'].includes(request.method)) {
    const origin=request.headers.get('origin');
    if(origin!==request.nextUrl.origin) return NextResponse.json({error:'Origem não autorizada.'},{status:403});
  }
  if(request.nextUrl.pathname.startsWith('/api/auth/')) return NextResponse.next();
  try {
    const response=await getAuth().middleware({loginUrl:'/login'})(request);
    if(request.nextUrl.pathname.startsWith('/api/') && response.status>=300 && response.status<400) {
      return NextResponse.json({error:'Entre na sua conta para continuar.'},{status:401});
    }
    return response;
  }catch {
    if(request.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:'Autenticação indisponível.'},{status:503});
    return NextResponse.redirect(new URL('/login',request.url));
  }
}

export const config={matcher:['/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|woff2)$).*)']};
