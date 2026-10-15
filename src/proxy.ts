import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/auth';

export async function proxy(request:NextRequest) {
  if(!['GET','HEAD','OPTIONS'].includes(request.method)) {
    const origin=request.headers.get('origin');
    if(origin!==request.nextUrl.origin) return NextResponse.json({error:'Origem não autorizada.'},{status:403});
  }
  if(request.nextUrl.pathname.startsWith('/api/auth/')) return NextResponse.next();
  const denied=await authorize();
  if(!denied)return NextResponse.next();
  if(request.nextUrl.pathname.startsWith('/api/'))return denied;
  return NextResponse.redirect(new URL('/login',request.url));
}

export const config={matcher:['/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|woff2)$).*)']};
