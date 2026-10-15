import { authorize } from '@/lib/auth';
export async function GET(){const denied=await authorize();return denied||Response.json({authorized:true},{headers:{'Cache-Control':'no-store'}});}
