import { authorize } from "@/lib/auth";
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
export async function GET(_:Request,{params}:{params:Promise<{clientId:string}>}){
  const denied = await authorize(); if (denied) return denied;
const {clientId}=await params;return NextResponse.json(await sql`SELECT * FROM interactions WHERE client_id=${clientId} ORDER BY created_at DESC`);}
